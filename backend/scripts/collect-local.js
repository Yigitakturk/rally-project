// Runs the collector on this computer and saves the results as JSON files in
// backend/data-out/, so we can check the data before using the database.
//
//   npm run collect:local            → 2026 only
//   npm run collect:local 2024 2025  → those seasons
import { mkdirSync, writeFileSync } from 'node:fs';
import { collectSeason, buildIndexes } from '../src/collect.js';

const years = process.argv.slice(2).map(Number).filter(Boolean);
if (!years.length) years.push(new Date().getFullYear());

const out = new URL('../data-out/', import.meta.url);
mkdirSync(new URL('rallies/', out), { recursive: true });

const allRallies = [];
for (const year of years) {
  console.log(`Season ${year}`);
  const result = await collectSeason(year);
  if (!result) continue;
  writeFileSync(new URL(`season-${year}.json`, out), JSON.stringify(result.season, null, 2));
  for (const r of result.rallies) {
    writeFileSync(new URL(`rallies/${r.id}.json`, out), JSON.stringify(r, null, 2));
    allRallies.push(r);
  }
}

const indexes = buildIndexes(allRallies);
for (const [name, items] of Object.entries(indexes)) {
  writeFileSync(new URL(`${name}.json`, out), JSON.stringify(items, null, 2));
  console.log(`${name}: ${items.length}`);
}
console.log(`Saved to ${out.pathname}`);
