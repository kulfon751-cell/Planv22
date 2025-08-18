import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const assetsDir = path.join(process.cwd(), 'assets');
const iconPath = path.join(assetsDir, 'icon.png');

console.log('[create-icon] Tworzę ikonę PNG dla aplikacji Plan Produkcji...');

// Tworzymy prostą ikonę z gradientem i literą P
const svg = `
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="32" fill="url(#grad)"/>
  <text x="128" y="180" font-family="Arial, sans-serif" font-size="120" font-weight="bold" 
        text-anchor="middle" fill="white">P</text>
</svg>
`;

try {
  // Upewnij się, że katalog assets istnieje
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Wygeneruj PNG z SVG
  await sharp(Buffer.from(svg))
    .resize(256, 256)
    .png()
    .toFile(iconPath);

  console.log('[create-icon] ✓ Ikona PNG została utworzona:', iconPath);
  
  // Sprawdź rozmiar pliku
  const stats = fs.statSync(iconPath);
  console.log(`[create-icon] Rozmiar pliku: ${(stats.size / 1024).toFixed(2)} KB`);
  
} catch (error) {
  console.error('[create-icon] Błąd podczas tworzenia ikony:', error.message);
  process.exit(1);
}
