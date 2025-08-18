import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const srcPng = path.resolve(projectRoot, 'assets', 'icon.png');
const outIco = path.resolve(projectRoot, 'icon.ico');
const outPng = path.resolve(projectRoot, 'icon.png');

async function main() {
  if (!fs.existsSync(srcPng)) {
    console.error(`[icon:gen] Brak pliku PNG: ${srcPng}`);
  console.error(`[icon:gen] Dodaj plik z logo do: electron/assets/icon.png (pomijam i użyję domyślnej ikony Electron)`);
  return;
  }
  try {
    // Upewnij się, że mamy PNG 256x256 do okna aplikacji (Linux)
    await sharp(srcPng).resize(256, 256, { fit: 'cover' }).png().toFile(outPng);

    // Przygotuj zestaw rozmiarów do ICO
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const tmpDir = path.resolve(projectRoot, '.icon-build');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const tmpPngs = [];
    for (const s of sizes) {
      const p = path.join(tmpDir, `icon-${s}.png`);
      await sharp(srcPng).resize(s, s, { fit: 'cover' }).png().toFile(p);
      tmpPngs.push(p);
    }

    const icoBuf = await pngToIco(tmpPngs);
    fs.writeFileSync(outIco, icoBuf);
    console.log(`[icon:gen] Wygenerowano ${outIco} oraz ${outPng}`);
  } catch (e) {
    console.warn('[icon:gen] Błąd generowania ikony, użyję ikony domyślnej:', e?.message || e);
    // Nie przerywaj builda – electron-builder użyje ikony domyślnej
    return;
  }
}

main();
