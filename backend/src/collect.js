// The collector: reads seasons and rallies from Wikipedia and turns them into
// the documents we store in the database.
import { getArticleHtml } from './wiki.js';
import { parseSeason } from './parse/season.js';
import { parseRally } from './parse/rally.js';
import { slug } from './html.js';

export const FIRST_DETAILED_SEASON = 2020;

const seasonTitle = (year) => `${year} World Rally Championship`;

/**
 * Collects one season: the season document plus one document per rally.
 * Rallies that have not happened yet (no article, or no results) are still
 * included with their calendar details.
 */
export async function collectSeason(year, log = console.log) {
  const page = await getArticleHtml(seasonTitle(year));
  if (!page) {
    log(`No Wikipedia article for ${year} yet`);
    return null;
  }
  const season = parseSeason(page.html, year);
  const rallies = [];

  for (const round of season.calendar) {
    const id = `${year}-${String(round.round).padStart(2, '0')}-${slug(round.name)}`;
    round.id = id;
    const title = round.article ?? `${year} ${round.eventArticle ?? round.name}`;
    let details = null;
    let source = null;
    try {
      const article = await getArticleHtml(title);
      if (article) {
        details = parseRally(article.html);
        source = { title: article.title, revid: article.revid };
      }
    } catch (err) {
      log(`Could not read ${title}: ${err.message}`);
    }

    const overall = details?.classes?.[0]?.classification ?? [];
    const winner = overall.find((r) => r.position === 1) ?? null;
    round.winner = winner ? { driver: winner.driver, codriver: winner.codriver, entrant: winner.entrant, car: winner.car } : null;

    rallies.push({
      id,
      season: year,
      ...round,
      ...(details ?? {}),
      // Keep the calendar's values when the article has none.
      country: details?.country ?? round.country,
      surface: details?.surface ?? round.surface,
      stages: details?.stages ?? round.stages,
      winner: round.winner,
      source: source && { ...source, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(source.title.replace(/ /g, '_'))}` },
    });
    log(`  ${id}: ${details ? `${details.entries.length} entries, ${details.classes.length} classes` : 'calendar only'}`);
  }

  return {
    season: {
      ...season,
      source: { title: page.title, revid: page.revid, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}` },
    },
    rallies,
  };
}

/**
 * People, teams and cars that appear in the collected rallies, with simple
 * counts (starts, wins, podiums) built from the results.
 */
export function buildIndexes(rallies) {
  const drivers = new Map();
  const codrivers = new Map();
  const teams = new Map();
  const cars = new Map();

  const key = (x) => (x?.article ? slug(x.article) : x?.name ? slug(x.name) : null);
  const bump = (map, x, extra, result) => {
    const k = key(x);
    if (!k) return;
    const item = map.get(k) ?? { id: k, name: x.name, article: x.article ?? null, country: x.country ?? null, seasons: [], starts: 0, wins: 0, podiums: 0, rallies: [] };
    if (!item.country && x.country) item.country = x.country;
    Object.assign(item, extra?.(item) ?? {});
    if (result) {
      if (!item.rallies.includes(result.rallyId)) {
        item.rallies.push(result.rallyId);
        item.starts++;
        if (result.position === 1) item.wins++;
        if (result.position && result.position <= 3) item.podiums++;
      }
      if (!item.seasons.includes(result.season)) item.seasons.push(result.season);
    }
    map.set(k, item);
  };

  for (const rally of rallies) {
    const countries = new Map();
    for (const e of rally.entries ?? []) {
      for (const p of [e.driver, e.codriver]) if (p?.article && p.country) countries.set(p.article, p.country);
    }
    // Every class counts for "starts"; wins and podiums use the overall position.
    const rows = (rally.classes ?? []).flatMap((c) => c.classification);
    for (const row of rows) {
      const result = { rallyId: rally.id, season: rally.season, position: row.position };
      const withCountry = (p) => p && { ...p, country: p.country ?? countries.get(p.article) ?? null };
      bump(drivers, withCountry(row.driver), null, result);
      bump(codrivers, withCountry(row.codriver), null, result);
      bump(teams, row.entrant, null, result);
      bump(cars, row.car, null, result);
    }
  }
  const list = (m) => [...m.values()].sort((a, b) => b.wins - a.wins || b.starts - a.starts);
  return { drivers: list(drivers), codrivers: list(codrivers), teams: list(teams), cars: list(cars) };
}
