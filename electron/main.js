const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const os = require('os');

// App identity (affects %APPDATA% path and single-instance)
try {
  app.setName('Plan Produkcji');
  app.setAppUserModelId('com.planprodukcji.app');
} catch {}

let mainWindow;
let serverProcess;
let serverPort;
let logFilePath;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    if (!logFilePath) {
      const userData = app.getPath('userData');
      logFilePath = path.join(userData, 'plan-produkcji.log');
    }
    fs.appendFileSync(logFilePath, line);
  } catch {}
  console.log(msg);
}

// --- UNC / network-run support -------------------------------------------------
// Cache for mapped network drives detection (Windows only)
let _networkDrivesCache = { at: 0, set: new Set() };

function getMappedNetworkDrives() {
  // Only relevant on Windows
  if (process.platform !== 'win32') return new Set();
  const now = Date.now();
  // Refresh cache every 60s
  if (now - _networkDrivesCache.at < 60_000 && _networkDrivesCache.set && _networkDrivesCache.set.size) {
    return _networkDrivesCache.set;
  }
  const { spawnSync } = require('child_process');
  const drives = new Set();
  try {
    // Try 'wmic' first (may be deprecated but often available)
    const wmic = spawnSync('wmic', ['logicaldisk', 'get', 'caption,providername'], { encoding: 'utf8' });
    const out = (wmic.stdout || '') + '\n' + (wmic.stderr || '');
    // Example lines: "C:", "Z:  \\fileserver\\share"
    out.split(/\r?\n/).forEach((line) => {
      const letter = (line.match(/\b([A-Z]):\s+\\\\/i) || [])[1]; // provider starts with \\
      if (letter) drives.add(letter.toUpperCase());
    });
  } catch {}
  try {
    // Fallback to 'net use' output parsing
    const netuse = spawnSync('cmd', ['/c', 'net use'], { encoding: 'utf8' });
    const txt = (netuse.stdout || '') + '\n' + (netuse.stderr || '');
    // Lines often contain "Z:        \\server\share"
    txt.split(/\r?\n/).forEach((line) => {
      const m = line.match(/\b([A-Z]):\s+\\\\/i);
      if (m) drives.add(m[1].toUpperCase());
    });
  } catch {}
  _networkDrivesCache = { at: now, set: drives };
  return drives;
}

function isNetworkPath(p) {
  if (!p || typeof p !== 'string') return false;
  // UNC path: \\SERVER\share\...
  if (p.startsWith('\\\\')) return true;
  // Windows: detect if drive letter is a mapped network drive (e.g., Z:\)
  if (process.platform === 'win32') {
    const m = p.match(/^([A-Za-z]):\\/);
    if (m) {
      const letter = m[1].toUpperCase();
      const mapped = getMappedNetworkDrives();
      if (mapped.has(letter)) return true;
    }
  }
  return false;
}

function ensureLocalCopy() {
  try {
    const exePath = process.execPath;
    if (!isNetworkPath(exePath)) return;

    // version: try to read nearest package.json, fall back to unknown
    let appVersion = '0.0.0';
    try {
      // try resources/app/package.json (packaged) then __dirname/package.json
      const candidates = [
        path.join(process.resourcesPath || '', 'app', 'package.json'),
        path.join(__dirname, '..', 'package.json'),
        path.join(__dirname, 'package.json')
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          try {
            const pj = JSON.parse(fs.readFileSync(c, 'utf8'));
            if (pj && pj.version) { appVersion = pj.version; break; }
          } catch {}
        }
      }
    } catch {}

    // determine user cache dir (app.getPath may not be ready in rare edge-cases)
    let userData;
    try { userData = app.getPath && app.getPath('userData'); } catch (e) { /* ignore */ }
    if (!userData) userData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    const cacheDir = path.join(userData, 'PlanProdukcji', 'cache');
    const targetDir = path.join(cacheDir, `v${appVersion}`);
    const targetExe = path.join(targetDir, path.basename(exePath));

    if (!fs.existsSync(targetExe)) {
      const sourceDir = path.dirname(exePath);
      log(`UNC: przygotowanie lokalnej kopii — kopiuję katalog: ${sourceDir} -> ${targetDir}`);
      // create parent and copy whole folder if possible
      fs.mkdirSync(targetDir, { recursive: true });
      try {
        // prefer recursive copy if available (Node 16+)
        if (typeof fs.cpSync === 'function') {
          fs.cpSync(sourceDir, targetDir, { recursive: true, errorOnExist: false });
        } else {
          // fallback: copy executable only
          fs.copyFileSync(exePath, targetExe);
        }
        log(`UNC: skopiowano lokalną kopię do ${targetDir}`);
      } catch (err) {
        const code = err && err.code ? String(err.code) : '';
        log(`UNC: kopiowanie nie powiodło się (${code}): ${err}`);
        // Pokaż czytelny komunikat użytkownikowi
        let human = 'Kopiowanie aplikacji na dysk lokalny nie powiodło się.';
        if (code === 'ENOSPC') human += ' Brak miejsca na dysku.';
        human += `\n\nŹródło: ${sourceDir}\nCel: ${targetDir}`;
        try {
          dialog.showErrorBox('Plan Produkcji — błąd kopiowania', human);
        } catch {}
      }
    }

    // if we are not running the local copy - restart from the local copy
    if (exePath !== targetExe && fs.existsSync(targetExe)) {
      log(`Uruchomienie z UNC wykryte — restartuję z lokalnej kopii: ${targetExe}`);
      try {
        spawn(targetExe, process.argv.slice(1), { detached: true, stdio: 'ignore' }).unref();
        app.exit(0);
      } catch (e) {
        log(`UNC: restart nie powiódł się: ${e}`);
        try { dialog.showErrorBox('Plan Produkcji — błąd uruchomienia', 'Nie udało się uruchomić lokalnej kopii aplikacji.'); } catch {}
      }
    }
  } catch (e) {
    // swallow - ensure this never blocks startup
    try { log(`ensureLocalCopy error: ${e}`); } catch {}
  }
}

// Try to ensure local copy early so multiple instances on a network share don't lock the
// remote file. This is a best-effort heuristic and safe to call synchronously.
ensureLocalCopy();

// --- end UNC support ----------------------------------------------------------

// Single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function findAvailablePort(startPort = 5123, endPort = 5199) {
  return new Promise((resolve, reject) => {
    const tryPort = (p) => {
      if (p > endPort) return reject(new Error('No available ports in range'));
      const s = net.createServer();
      s.listen(p, '127.0.0.1', () => {
        s.once('close', () => resolve(p));
        s.close();
      });
      s.on('error', () => tryPort(p + 1));
    };
    tryPort(startPort);
  });
}

async function startServer() {
  try {
    serverPort = await findAvailablePort();

    const baseRoots = [
      path.join(process.resourcesPath || '', '.next'),
      path.join(__dirname, '../.next'),
      path.join(app.getAppPath ? app.getAppPath() : __dirname, '../.next')
    ];

    let serverPath = null;
    let serverCwd = null;
    for (const base of baseRoots) {
      const options = [
        { entry: path.join(base, 'standalone/server.js'), cwd: path.join(base, 'standalone') },
        { entry: path.join(base, 'standalone/server.mjs'), cwd: path.join(base, 'standalone') },
        { entry: path.join(base, 'server/server.js'), cwd: path.join(base, 'server') },
        { entry: path.join(base, 'server/server.mjs'), cwd: path.join(base, 'server') }
      ];
      for (const o of options) {
        if (fs.existsSync(o.entry)) {
          serverPath = o.entry;
          serverCwd = o.cwd;
          break;
        }
      }
      if (serverPath) break;
    }

    if (!serverPath) {
      const msg = 'Nie znaleziono pliku serwera Next (.next/standalone/server.js ani .mjs).';
      log(msg);
      throw new Error(msg);
    }

    const electronAsNode = process.execPath;
    serverProcess = spawn(electronAsNode, [serverPath], {
      env: {
  ...process.env,
  PORT: String(serverPort),
  HOSTNAME: '127.0.0.1',
  NODE_ENV: 'production',
  ELECTRON_RUN_AS_NODE: '1',
  ELECTRON: '1',
  RUNTIME_USER_DATA: app.getPath('userData')
      },
      cwd: serverCwd,
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (d) => log(`Server: ${d}`));
    serverProcess.stderr.on('data', (d) => log(`Server Error: ${d}`));
    serverProcess.on('close', (code) => log(`Server process exited with code ${code}`));

    await new Promise((resolve, reject) => {
      const start = Date.now();
      const wait = () => {
        const c = net.createConnection(serverPort, '127.0.0.1');
        c.on('connect', () => { c.end(); resolve(); });
        c.on('error', () => {
          if (Date.now() - start > 15000) return reject(new Error('Server start timeout'));
          setTimeout(wait, 200);
        });
      };
      setTimeout(wait, 300);
    });

    log(`Server started on port ${serverPort}`);
    return `http://127.0.0.1:${serverPort}`;
  } catch (e) {
    log(`Failed to start server: ${e?.stack || e}`);
    throw e;
  }
}

async function createWindow() {
  try {
    log('Starting internal Next server...');
    const serverUrl = await startServer();

    mainWindow = new BrowserWindow({
      width: 1600,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      backgroundColor: '#0b1220',
      show: true,
      icon: path.join(__dirname, 'icon.png'),
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        sandbox: true
      }
    });

    log(`Loading URL: ${serverUrl}`);
    let attempts = 0;
    const maxAttempts = 30;
    const tryLoad = () => {
      mainWindow.loadURL(serverUrl).catch(() => {
        if (attempts < maxAttempts) {
          attempts += 1;
          setTimeout(tryLoad, 500);
        } else {
          log('Failed to load URL after retries');
        }
      });
    };
    tryLoad();

    mainWindow.once('ready-to-show', () => log('Window ready-to-show'));

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith(`http://127.0.0.1:${serverPort}`)) return { action: 'allow' };
      shell.openExternal(url);
      return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      try {
        const u = new URL(navigationUrl);
        if (u.hostname !== '127.0.0.1' || u.port !== String(serverPort)) {
          event.preventDefault();
          shell.openExternal(navigationUrl);
        }
      } catch {}
    });

    mainWindow.on('closed', () => { mainWindow = null; });
  } catch (e) {
    log(`Failed to create window: ${e?.stack || e}`);
    app.quit();
  }
}

app.whenReady().then(() => {
  log('App ready. Starting createWindow...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (ev, navigationUrl) => {
    ev.preventDefault();
    shell.openExternal(navigationUrl);
  });
});