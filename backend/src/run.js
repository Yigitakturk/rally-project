// One full collector run: fetch seasons from Wikipedia, save them, rebuild the
// drivers/teams/cars lists, and record how it went.
import { collectSeason } from './collect.js';
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
  try {
    await saveChampions(db, await collectChampions());
  } catch (err) {
    errors.push(`champions: ${err.message}`);
  }
  const counts = await rebuildIndexes(db);
  await saveStatus(db, { startedAt, years, seasons, counts, errors });
  return { seasons, counts, errors };
}
