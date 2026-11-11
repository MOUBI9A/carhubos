const path = require('path');
const fs = require('fs');

// Use sharp from frontend node_modules
const sharp = require(path.resolve(__dirname, '../../frontend/node_modules/sharp'));

const assetsDir = path.resolve(__dirname, '../assets');

// High-fidelity SVG of Fider Monogram on #121110 obsidian background
function createIconSvg(size, withBackground = true) {
  const bg = withBackground ? `<rect width="${size}" height="${size}" fill="#121110" rx="${size * 0.22}" />` : '';
  const scale = (size * 0.6) / 40;
  const offset = (size - 40 * scale) / 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="brassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#D4AF37;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#F5D76E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#B8860B;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#7C5CFC;stop-opacity:0.25" />
      <stop offset="100%" style="stop-color:#121110;stop-opacity:0" />
    </radialGradient>
  </defs>
  ${bg}
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.4}" fill="url(#glow)" />
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <path d="M0 5 L25 0 L35 5 L35 30 L25 40 L0 35 Z" fill="#1C1A18" stroke="#33302A" stroke-width="1.5" />
    <path d="M5 10 L22 7 L28 10 L28 28 L22 35 L5 32 Z" fill="url(#brassGradient)" />
    <path d="M10 15 H22 V18 H15 V22 H20 V25 H15 V30 H10 Z" fill="#121110" />
  </g>
</svg>
`;
}

// Splash Screen SVG (1242x2436)
function createSplashSvg() {
  const width = 1242;
  const height = 2436;
  const iconSize = 240;
  const scale = iconSize / 40;
  const iconX = (width - iconSize) / 2;
  const iconY = (height / 2) - 220;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="brassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#D4AF37;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#F5D76E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#B8860B;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="splashGlow" cx="50%" cy="45%" r="40%">
      <stop offset="0%" style="stop-color:#7C5CFC;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#121110;stop-opacity:0" />
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#121110" />
  <circle cx="${width/2}" cy="${height/2 - 100}" r="450" fill="url(#splashGlow)" />
  
  <g transform="translate(${iconX}, ${iconY}) scale(${scale})">
    <path d="M0 5 L25 0 L35 5 L35 30 L25 40 L0 35 Z" fill="#1C1A18" stroke="#33302A" stroke-width="1.5" />
    <path d="M5 10 L22 7 L28 10 L28 28 L22 35 L5 32 Z" fill="url(#brassGradient)" />
    <path d="M10 15 H22 V18 H15 V22 H20 V25 H15 V30 H10 Z" fill="#121110" />
  </g>
  
  <text x="${width/2}" y="${height/2 + 100}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="54" font-weight="700" fill="#F7F6F2" letter-spacing="4">
    FIDER
  </text>
  <text x="${width/2}" y="${height/2 + 155}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#9E9B92" letter-spacing="2">
    THE TRUST LAYER FOR MOBILITY
  </text>
</svg>
`;
}

async function generate() {
  console.log('Generating Fider visual assets...');

  // 1. icon.png (1024x1024)
  const iconSvg = Buffer.from(createIconSvg(1024, true));
  await sharp(iconSvg).png().toFile(path.join(assetsDir, 'icon.png'));
  console.log('✓ icon.png (1024x1024)');

  // 2. adaptive-icon.png (1024x1024 without baked corner radius)
  const adaptiveSvg = Buffer.from(createIconSvg(1024, false));
  await sharp(adaptiveSvg).png().toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png (1024x1024)');

  // 3. splash.png (1242x2436)
  const splashSvg = Buffer.from(createSplashSvg());
  await sharp(splashSvg).png().toFile(path.join(assetsDir, 'splash.png'));
  console.log('✓ splash.png (1242x2436)');

  // 4. favicon.png (48x48)
  const faviconSvg = Buffer.from(createIconSvg(48, true));
  await sharp(faviconSvg).png().toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✓ favicon.png (48x48)');

  console.log('All mobile assets successfully created.');
}

generate().catch((err) => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
