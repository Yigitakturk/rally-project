// One full collector run: fetch seasons from Wikipedia, save them, rebuild the
// drivers/teams/cars lists, and record how it went.
import { collectSeason, FIRST_DETAILED_SEASON } from './collect.js';
import { saveSeason, rebuildIndexes, saveChampions, saveStatus } from './store.js';
import { getArticleHtml } from './wiki.js';
import { parseChampions, CHAMPION_LISTS } from './parse/history.js';

/** Past champions since 1973, for the History page. */
async function collectChampions() {
  const result = { sources: {} };
  for (const [kind, title] of Object.entries(CHAMPION_LISTS)) {
    const page = await getArticleHtml(title);
    result[kind] = page ? parseChampions(page.html) : [];
    if (page) result.sources[kind] = `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
  }
  return result;
}

/** Last season, this season and next season (next season's calendar appears early). */
export function defaultYears(now = new Date()) {
  const y = now.getFullYear();
  return [y - 1, y, y + 1];
}

/** On the very first run (empty database) fetch every detailed season. */
async function yearsToCollect(db) {
  const known = await db.collection('lists').doc('seasons').get();
  if (known.exists) return defaultYears();
  const last = new Date().getFullYear() + 1;
  return Array.from({ length: last - FIRST_DETAILED_SEASON + 1 }, (_, i) => FIRST_DETAILED_SEASON + i);
}

export async function runCollector(db, years, log = console.log) {
  years ??= await yearsToCollect(db);
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
  try {
    await saveChampions(db, await collectChampions());
  } catch (err) {
    errors.push(`champions: ${err.message}`);
  }
  const counts = await rebuildIndexes(db);
  await saveStatus(db, { startedAt, years, seasons, counts, errors });
  return { seasons, counts, errors };
}
