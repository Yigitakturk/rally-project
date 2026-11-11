// The read-only API the website uses. Every answer is JSON.
//
//   GET /api/home                       next rally, latest winner, top 3 drivers
//   GET /api/seasons                    list of seasons
//   GET /api/seasons/{year}             calendar of one season
//   GET /api/seasons/{year}/standings   drivers', co-drivers' and manufacturers' standings
//   GET /api/rallies/{id}               one rally: info, entries, itinerary, results, stages
//   GET /api/drivers | codrivers | cars           lists (?season=2026 to filter)
//   GET /api/teams                      main manufacturer teams (?all=true for every entrant)
//   GET /api/{drivers|codrivers|teams|cars}/{id}  one profile with results
//   GET /api/history                    past champions and most titles
import { getSummary } from './wiki.js';

const PROFILE_MAX_AGE_DAYS = 30;
const PEOPLE = ['drivers', 'codrivers', 'teams', 'cars'];

class NotFound extends Error {}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function getDoc(db, collection, id) {
  const snap = await db.collection(collection).doc(String(id)).get();
  if (!snap.exists) throw new NotFound(`${collection}/${id} not found`);
  return snap.data();
}

const compactRally = (r) => ({
  id: r.id, round: r.round, name: r.name, country: r.country, startDate: r.startDate,
  endDate: r.endDate, surface: r.surface, stages: r.stages, distanceKm: r.distanceKm, winner: r.winner ?? null,
});

async function home(db) {
  const seasons = await listSeasons(db);
  const now = today();
  const years = seasons.map((s) => s.year).sort((a, b) => b - a);
  let next = null;
  let latest = null;
  let standings = null;
  let standingsYear = null;

  // Look at the newest seasons until we find both a past and an upcoming rally.
  for (const year of years) {
    const season = await getDoc(db, 'seasons', year);
    const calendar = season.calendar ?? [];
    if (!next) {
      const upcoming = calendar.filter((r) => r.endDate && r.endDate >= now).sort((a, b) => a.startDate.localeCompare(b.startDate));
      if (upcoming.length) next = { season: year, ...compactRally(upcoming[0]) };
    }
    if (!latest) {
      const done = calendar.filter((r) => r.endDate && r.endDate < now && r.winner).sort((a, b) => b.endDate.localeCompare(a.endDate));
      if (done.length) {
        latest = { season: year, ...compactRally(done[0]) };
        standings = (season.standings?.drivers ?? []).slice(0, 3).map(({ rounds, ...rest }) => rest);
        standingsYear = year;
      }
    }
    if (next && latest) break;
  }
  return { nextRally: next, latestRally: latest, standings: { season: standingsYear, drivers: standings ?? [] } };
}

async function listSeasons(db) {
  const doc = await db.collection('lists').doc('seasons').get();
  if (doc.exists) return doc.data().items;
  const snap = await db.collection('seasons').get();
  return snap.docs.map((d) => ({ year: d.data().year, rounds: d.data().calendar?.length ?? 0 }));
}

async function season(db, year) {
  const s = await getDoc(db, 'seasons', year);
  return { year: s.year, calendar: s.calendar.map(compactRally), source: s.source, updatedAt: s.updatedAt };
}

async function standings(db, year) {
  const s = await getDoc(db, 'seasons', year);
  return { year: s.year, ...s.standings, source: s.source, updatedAt: s.updatedAt };
}

async function list(db, kind, query) {
  const doc = await getDoc(db, 'lists', kind);
  let items = doc.items;
  if (query.season) items = items.filter((x) => x.seasons.includes(Number(query.season)));
  if (kind === 'teams' && query.all !== 'true') items = items.filter((x) => x.manufacturerTeam);
  return { items, updatedAt: doc.updatedAt };
}

/** Wikipedia intro and photo for a profile, kept in Firestore for 30 days. */
async function profileSummary(db, article) {
  if (!article) return null;
  const ref = db.collection('profiles').doc(encodeURIComponent(article));
  const cached = await ref.get();
  const fresh = cached.exists &&
    Date.now() - Date.parse(cached.data().fetchedAt) < PROFILE_MAX_AGE_DAYS * 86400000;
  if (fresh) return cached.data().summary;
  try {
    const summary = await getSummary(article);
    await ref.set({ summary, fetchedAt: new Date().toISOString() });
    return summary;
  } catch {
    return cached.exists ? cached.data().summary : null;
  }
}

async function profile(db, kind, id) {
  const item = await getDoc(db, kind, id);
  return { ...item, summary: await profileSummary(db, item.article) };
}

async function history(db) {
  const doc = await getDoc(db, 'history', 'champions');
  const mostTitles = (rows) => {
    const counts = new Map();
    for (const r of rows ?? []) {
      const k = r.article ?? r.name;
      const c = counts.get(k) ?? { name: r.name, article: r.article, country: r.country, titles: 0, seasons: [] };
      c.titles++;
      c.seasons.push(r.season);
      counts.set(k, c);
    }
    return [...counts.values()].sort((a, b) => b.titles - a.titles).slice(0, 10);
  };
  return {
    champions: { drivers: doc.drivers, codrivers: doc.codrivers, manufacturers: doc.manufacturers },
    mostTitles: { drivers: mostTitles(doc.drivers), codrivers: mostTitles(doc.codrivers), manufacturers: mostTitles(doc.manufacturers) },
    sources: doc.sources,
    updatedAt: doc.updatedAt,
  };
}

/** Finds the answer for a path like "/api/seasons/2026". */
export async function route(db, path, query = {}) {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts[0] === 'api') parts.shift();
  const [a, b, c] = parts;
  const year = (x) => (/^\d{4}$/.test(x ?? '') ? Number(x) : null);

  if (a === 'home' && !b) return home(db);
  if (a === 'seasons' && !b) return { items: await listSeasons(db) };
  if (a === 'seasons' && year(b) && !c) return season(db, year(b));
  if (a === 'seasons' && year(b) && c === 'standings') return standings(db, year(b));
  if (a === 'rallies' && b && !c) return getDoc(db, 'rallies', b);
  if (a === 'history' && !b) return history(db);
  if (PEOPLE.includes(a) && !b) return list(db, a, query);
  if (PEOPLE.includes(a) && b && !c) return profile(db, a, b);
  throw new NotFound(`Unknown address: ${path}`);
}

/** Express-style handler used by the Cloud Function. */
export function createHandler(getDb) {
  return async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Only GET is allowed' });
    }
    try {
      const body = await route(getDb(), req.path, req.query ?? {});
      // Browsers keep answers 5 minutes, Firebase's servers 1 hour:
      // fewer calls to the function means faster pages and no extra cost.
      res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
      return res.status(200).json(body);
    } catch (err) {
      if (err instanceof NotFound) return res.status(404).json({ error: err.message });
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong' });
    }
  };
}
