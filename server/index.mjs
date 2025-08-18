import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import next from 'next'
import { WebSocketServer } from 'ws'
import cron from 'node-cron'
import { scheduleBackups } from './backup-scheduler.mjs';
import { lanFirewall, generateCsrfToken, validateCsrfToken, CsrfError, apiLimiter } from './security.mjs';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT ? Number(process.env.PORT) : 3000

process.env.APP_MODE = process.env.APP_MODE || 'server'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Simple JSONL logger
function logJSON(obj) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n'
    const logDir = path.join(process.cwd(), 'logs')
    fs.mkdirSync(logDir, { recursive: true })
    fs.appendFileSync(path.join(logDir, 'app.log'), line)
    // eslint-disable-next-line no-console
    if (dev) console.log(line.trim())
  } catch { /* noop */ }
}

// Realtime wiring via ws at /api/realtime
const wss = new WebSocketServer({ noServer: true })
const clients = new Set()

function broadcast(event) {
  const data = JSON.stringify(event)
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(data)
  }
}

// Expose broadcaster globally for API handlers (same process)
globalThis.__PM_PLAN_BROADCAST__ = broadcast

await app.prepare()

const server = http.createServer(async (req, res) => {
  try {
    // Apply rate limiting to all /api/ requests
    if (req.url?.startsWith('/api/')) {
        await new Promise((resolve, reject) => {
            apiLimiter(req, res, (result) => {
                if (result instanceof Error) {
                    // Log the error but don't necessarily block the request
                    logJSON({ level: 'error', msg: 'rate_limit_error', error: String(result) });
                }
                resolve();
            });
        });

        // If the rate limiter sent a response, the request is ended.
        if (res.headersSent) {
            return;
        }
    }

    // Security middleware
    const firewallResponse = lanFirewall(req);
    if (firewallResponse) {
        res.writeHead(firewallResponse.status, firewallResponse.headers);
        return res.end(firewallResponse.body);
    }

    // CSRF Token Endpoint
    if (req.url === '/api/auth/csrf-token' && req.method === 'GET') {
        const { token } = generateCsrfToken(req, res);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ csrfToken: token }));
    }

    // CSRF protection for API routes
    try {
        if (req.url?.startsWith('/api/') && req.method !== 'GET') {
            validateCsrfToken(req, res);
        }
    } catch (error) {
        if (error instanceof CsrfError) {
            console.warn(`[CSRF] Invalid token for request: ${req.method} ${req.url}`);
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            return res.end('Invalid CSRF token');
        }
        throw error; // re-throw other errors
    }

    await handle(req, res);
  } catch (err) {
    logJSON({ level: 'error', msg: 'request_error', error: String(err) })
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith('/api/realtime')) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      clients.add(ws)
      ws.on('close', () => clients.delete(ws))
      ws.send(JSON.stringify({ type: 'hello', payload: { connected: true } }))
    })
  } else {
    socket.destroy()
  }
})

server.listen(port, hostname, () => {
  logJSON({ level: 'info', msg: 'server_started', port, mode: process.env.APP_MODE })
  if (process.env.APP_MODE === 'server') {
    scheduleBackups();
  }
})

// Backup scheduler
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
const BACKUP_CRON = process.env.BACKUP_CRON || '0 2 * * *'
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30)

function runPgDump(note = 'scheduled') {
  return new Promise((resolve) => {
    try {
      const dbUrl = process.env.DATABASE_URL
      if (!dbUrl) throw new Error('DATABASE_URL not set')
      const now = new Date()
      const dir = path.join(BACKUP_DIR, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'))
      fs.mkdirSync(dir, { recursive: true })
      const file = path.join(dir, `pm_plan_${now.toISOString().replace(/[-:]/g, '').slice(0, 13)}${String(now.getMinutes()).padStart(2, '0')}.dump`)
      const pgdump = spawn('pg_dump', ['-Fc', dbUrl, '-f', file])
      const startedAt = Date.now()
      pgdump.on('close', (code) => {
        const finishedAt = Date.now()
        if (code === 0) {
          const size = fs.existsSync(file) ? fs.statSync(file).size : 0
          logJSON({ level: 'info', msg: 'backup_ok', file, size })
          globalThis.__PM_PLAN_BROADCAST__?.({ type: 'backup.status', payload: { status: 'ok', file } })
          resolve({ ok: true, file, size, ms: finishedAt - startedAt })
        } else {
          logJSON({ level: 'error', msg: 'backup_failed', code })
          globalThis.__PM_PLAN_BROADCAST__?.({ type: 'backup.status', payload: { status: 'error' } })
          resolve({ ok: false })
        }
      })
    } catch (e) {
      logJSON({ level: 'error', msg: 'backup_exception', error: String(e) })
      resolve({ ok: false })
    }
  })
}

function cleanupOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  if (!fs.existsSync(BACKUP_DIR)) return
  for (const sub of fs.readdirSync(BACKUP_DIR)) {
    const yearDir = path.join(BACKUP_DIR, sub)
    if (!fs.statSync(yearDir).isDirectory()) continue
    for (const monthSub of fs.readdirSync(yearDir)) {
      const dir = path.join(yearDir, monthSub)
      if (!fs.statSync(dir).isDirectory()) continue
      for (const f of fs.readdirSync(dir)) {
        const fp = path.join(dir, f)
        const st = fs.statSync(fp)
        if (st.mtimeMs < cutoff) fs.unlinkSync(fp)
      }
    }
  }
}

try {
  cron.schedule(BACKUP_CRON, async () => {
    logJSON({ level: 'info', msg: 'backup_start', cron: BACKUP_CRON })
    await runPgDump('scheduled')
    cleanupOldBackups()
  })
} catch (e) {
  logJSON({ level: 'error', msg: 'backup_cron_error', error: String(e) })
}

export { }
