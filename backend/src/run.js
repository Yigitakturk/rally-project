// One full collector run: fetch seasons from Wikipedia, save them, rebuild the
// drivers/teams/cars lists, and record how it went.
import { collectSeason } from './collect.js';
import { saveSeason, rebuildIndexes, saveStatus } from './store.js';

/** Last season, this season and next season (next season's calendar appears early). */
export function defaultYears(now = new Date()) {
  const y = now.getFullYear();
  return [y - 1, y, y + 1];
}

export async function runCollector(db, years = defaultYears(), log = console.log) {
  const startedAt = new Date().toISOString();
  const seasons = {};
  const errors = [];
  for (const year of years) {
    try {
      const result = await collectSeason(year, log);
      if (!result) {
        seasons[year] = 'no article';
        continue;
      }
      await saveSeason(db, result);
      seasons[year] = `${result.rallies.length} rallies`;
    } catch (err) {
      errors.push(`${year}: ${err.message}`);
      log(`Season ${year} failed: ${err.stack}`);
    }
  }
  const counts = await rebuildIndexes(db);
  await saveStatus(db, { startedAt, years, seasons, counts, errors });
  return { seasons, counts, errors };
}
