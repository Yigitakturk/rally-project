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
      seasons: [], starts: 0, wins: 0, podiums: 0, classWins: 0, classPodiums: 0, results: [],
    };
    if (!item.country && x.country) item.country = x.country;
    if (x.article && (result.date ?? '') >= (item.latestDate ?? '')) {
      item.article = x.article; // keep the newest link
      item.latestDate = result.date ?? null;
    }
    // One result per crew per rally (a team or car has several crews in a rally;
    // a crew can also be listed in two classes, e.g. WRC3 and Junior WRC).
    if (!item.results.some((r) => r.rallyId === result.rallyId && r.crew === result.crew)) {
      item.results.push(result);
      item.starts++;
      if (result.position === 1) item.wins++;
      if (result.position && result.position <= 3) item.podiums++;
      if (result.classPosition === 1) item.classWins++;
      if (result.classPosition && result.classPosition <= 3) item.classPodiums++;
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
    const teamCountries = new Map((rally.entries ?? []).filter((e) => e.entrant?.country).map((e) => [e.entrant.name, e.entrant.country]));
    const withTeamCountry = (t) => t && { ...t, country: t.country ?? teamCountries.get(t.name) ?? null };

    // Every class counts as a start; wins and podiums use the overall position.
    for (const cls of rally.classes ?? []) {
      for (const row of cls.classification) {
        const base = {
          rallyId: rally.id, rally: rally.name, season: rally.season, date: rally.startDate,
          crew: row.number ?? row.driver?.name ?? null,
          class: cls.name, position: row.position, classPosition: row.classPosition,
          status: row.status, retiredOn: row.retiredOn, points: row.points,
        };
        add(maps.drivers, withCountry(row.driver), { ...base, codriver: row.codriver?.name ?? null, car: row.car?.name ?? null, team: row.entrant?.name ?? null });
        add(maps.codrivers, withCountry(row.codriver), { ...base, driver: row.driver?.name ?? null, car: row.car?.name ?? null, team: row.entrant?.name ?? null });
        add(maps.teams, withTeamCountry(row.entrant), { ...base, driver: row.driver?.name ?? null, car: row.car?.name ?? null });
        add(maps.cars, row.car, { ...base, driver: row.driver?.name ?? null, team: row.entrant?.name ?? null });
      }
    }
  }

  for (const team of maps.teams.values()) {
    team.manufacturerTeam = manufacturerTeams.has(team.article) || manufacturerTeams.has(team.name);
  }
  // The same counts for each season, so a list filtered by season shows that season's numbers.
  const perSeason = (results) => {
    const out = {};
    for (const r of results) {
      const s = (out[r.season] ??= { starts: 0, wins: 0, podiums: 0, classWins: 0 });
      s.starts++;
      if (r.position === 1) s.wins++;
      if (r.position && r.position <= 3) s.podiums++;
      if (r.classPosition === 1) s.classWins++;
    }
    return out;
  };
  const finish = (m) => [...m.values()]
    .map(({ latestDate, ...x }) => ({
      ...x,
      seasons: x.seasons.sort(),
      bySeason: perSeason(x.results),
      results: x.results.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
    }))
    .sort((a, b) => b.wins - a.wins || b.classWins - a.classWins || b.starts - a.starts);
  return Object.fromEntries(Object.entries(maps).map(([k, m]) => [k, finish(m)]));
}
