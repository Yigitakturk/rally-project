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
 * counts (starts, wins, podiums) and their results, built from the rallies.
 * `seasons` (optional) marks teams that scored in the manufacturers' standings.
 */
export function buildIndexes(rallies, seasons = []) {
  const maps = { drivers: new Map(), codrivers: new Map(), teams: new Map(), cars: new Map() };
  const key = (x) => (x?.article ? slug(x.article) : x?.name ? slug(x.name) : null);

  const manufacturerTeams = new Set();
  for (const season of seasons) {
    for (const m of season.standings?.manufacturers ?? []) {
      if (m.article) manufacturerTeams.add(m.article);
      if (m.manufacturer) manufacturerTeams.add(m.manufacturer);
    }
  }

  // Teams are matched by name: Wikipedia links the same team to different
  // articles over the years (e.g. "Hyundai Motorsport" / "Hyundai World Rally Team").
  const add = (map, x, result) => {
    const k = map === maps.teams ? slug(x?.name) : key(x);
    if (!k) return;
    const item = map.get(k) ?? {
      id: k, name: x.name, article: x.article ?? null, country: x.country ?? null,
      seasons: [], starts: 0, wins: 0, podiums: 0, results: [],
    };
    if (!item.country && x.country) item.country = x.country;
    if (x.article && (result.date ?? '') >= (item.latestDate ?? '')) {
      item.article = x.article; // keep the newest link
      item.latestDate = result.date ?? null;
    }
    if (!item.results.some((r) => r.rallyId === result.rallyId)) {
      item.results.push(result);
      item.starts++;
      if (result.position === 1) item.wins++;
      if (result.position && result.position <= 3) item.podiums++;
    }
    if (!item.seasons.includes(result.season)) item.seasons.push(result.season);
    map.set(k, item);
  };

  for (const rally of rallies) {
    const countries = new Map();
    for (const e of rally.entries ?? []) {
      for (const p of [e.driver, e.codriver]) if (p?.article && p.country) countries.set(p.article, p.country);
    }
    const withCountry = (p) => p && { ...p, country: p.country ?? countries.get(p.article) ?? null };

    // Every class counts as a start; wins and podiums use the overall position.
    for (const cls of rally.classes ?? []) {
      for (const row of cls.classification) {
        const base = {
          rallyId: rally.id, rally: rally.name, season: rally.season, date: rally.startDate,
          class: cls.name, position: row.position, classPosition: row.classPosition,
          status: row.status, retiredOn: row.retiredOn, points: row.points,
        };
        add(maps.drivers, withCountry(row.driver), { ...base, codriver: row.codriver?.name ?? null, car: row.car?.name ?? null, team: row.entrant?.name ?? null });
        add(maps.codrivers, withCountry(row.codriver), { ...base, driver: row.driver?.name ?? null, car: row.car?.name ?? null, team: row.entrant?.name ?? null });
        add(maps.teams, row.entrant, { ...base, driver: row.driver?.name ?? null, car: row.car?.name ?? null });
        add(maps.cars, row.car, { ...base, driver: row.driver?.name ?? null, team: row.entrant?.name ?? null });
      }
    }
  }

  for (const team of maps.teams.values()) {
    team.manufacturerTeam = manufacturerTeams.has(team.article) || manufacturerTeams.has(team.name);
  }
  const finish = (m) => [...m.values()]
    .map(({ latestDate, ...x }) => ({ ...x, seasons: x.seasons.sort(), results: x.results.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')) }))
    .sort((a, b) => b.wins - a.wins || b.starts - a.starts);
  return Object.fromEntries(Object.entries(maps).map(([k, m]) => [k, finish(m)]));
}
