#!/usr/bin/env node
/**
 * Pack the HYG star database (CC BY-SA 4.0, github.com/astronexus/HYG-Database)
 * into a tiny binary for the celestial-sphere renderer.
 *
 * Usage: node scripts/pack-stars.mjs /path/to/hygdata.csv public/stars.bin
 *
 * Format, little-endian, 6 bytes per star (mag ≤ 6.0, i.e. naked-eye):
 *   uint16  ra    (0..65535 → 0..360°)
 *   int16   dec   (degrees × 100)
 *   uint8   mag   ((mag + 1.5) × 25, clamped)   — Sirius is -1.46
 *   uint8   ci    ((B−V + 0.4) × 64, clamped)   — color index
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input = '/tmp/hyg.csv', output = 'public/stars.bin'] = process.argv;
const text = readFileSync(input, 'utf8');
const lines = text.split('\n');
const header = lines[0].replace(/"/g, '').split(',');
const col = (name) => header.indexOf(name);
const iRa = col('ra'); // hours
const iDec = col('dec'); // degrees
const iMag = col('mag');
const iCi = col('ci');

const stars = [];
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  if (parts.length < header.length) continue;
  const mag = parseFloat(parts[iMag]);
  if (!(mag <= 6.0)) continue;
  const ra = parseFloat(parts[iRa]);
  const dec = parseFloat(parts[iDec]);
  if (Number.isNaN(ra) || Number.isNaN(dec)) continue;
  if (mag < -2) continue; // drop the Sun (mag -26.7)
  const ci = parseFloat(parts[iCi]) || 0.5;
  stars.push({ ra: ra * 15, dec, mag, ci }); // ra hours → degrees
}

stars.sort((a, b) => a.mag - b.mag);

const buf = Buffer.alloc(stars.length * 6);
stars.forEach((s, i) => {
  const o = i * 6;
  buf.writeUInt16LE(Math.round((s.ra / 360) * 65535) & 0xffff, o);
  buf.writeInt16LE(Math.round(s.dec * 100), o + 2);
  buf.writeUInt8(Math.max(0, Math.min(255, Math.round((s.mag + 1.5) * 25))), o + 4);
  buf.writeUInt8(Math.max(0, Math.min(255, Math.round((s.ci + 0.4) * 64))), o + 5);
});

writeFileSync(output, buf);
console.log(`${stars.length} stars (mag ≤ 6) → ${output} (${(buf.length / 1024).toFixed(1)} KB)`);
console.log(
  `brightest: mag ${stars[0].mag.toFixed(2)}, faintest kept: mag ${stars[stars.length - 1].mag.toFixed(2)}`,
);
