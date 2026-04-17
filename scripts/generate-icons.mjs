#!/usr/bin/env node
// Generate PWA icons from the SVG favicon
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public/favicon.svg');
const outDir = resolve(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size, maskable } of sizes) {
  if (maskable) {
    // Maskable icons need 10% padding on each side (safe zone)
    const innerSize = Math.round(size * 0.8);
    const padding = Math.round(size * 0.1);
    const inner = await sharp(svg).resize(innerSize, innerSize).png().toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 5, g: 5, b: 9, alpha: 1 } },
    })
      .composite([{ input: inner, left: padding, top: padding }])
      .png()
      .toFile(resolve(outDir, name));
  } else {
    await sharp(svg).resize(size, size).png().toFile(resolve(outDir, name));
  }
  console.log(`✓ ${name} (${size}x${size})`);
}

console.log('Done! Icons written to public/icons/');
