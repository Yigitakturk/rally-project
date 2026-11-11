// Calls every API address on the local test server and prints a short summary.
// Run with: npm run api:check
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:5001/demo-rally/europe-west1/api/api';

async function get(path) {
  const res = await fetch(BASE + path);
  const body = await res.json();
  return { status: res.status, cache: res.headers.get('cache-control'), body };
}

const show = (label, r, pick) => console.log(`${String(r.status).padEnd(4)} ${label.padEnd(36)} ${pick(r.body)}`);

const home = await get('/home');
show('/home', home, (b) => `next: ${b.nextRally?.name} ${b.nextRally?.startDate} | latest: ${b.latestRally?.name} won by ${b.latestRally?.winner?.driver?.name} | top3: ${b.standings.drivers.map((d) => d.driver).join(', ')}`);
show('/seasons', await get('/seasons'), (b) => b.items.map((s) => `${s.year}(${s.rounds})`).join(' '));
const s = await get('/seasons/2026');
show('/seasons/2026', s, (b) => `${b.calendar.length} rounds, first: ${b.calendar[0].name}`);
show('/seasons/2026/standings', await get('/seasons/2026/standings'), (b) => `leader: ${b.drivers[0].driver} ${b.drivers[0].points} pts`);
const rallyId = s.body.calendar[6].id;
show(`/rallies/${rallyId}`, await get(`/rallies/${rallyId}`), (b) => `${b.entries.length} entries, ${b.itinerary.length} stages, winner ${b.winner?.driver?.name}`);
const drivers = await get('/drivers?season=2026');
show('/drivers?season=2026', drivers, (b) => `${b.items.length} drivers, most wins: ${b.items[0].name} (${b.items[0].wins})`);
show(`/drivers/${drivers.body.items[0].id}`, await get(`/drivers/${drivers.body.items[0].id}`), (b) => `${b.results.length} results, photo: ${b.summary?.image ? 'yes' : 'no'}, intro: ${b.summary?.extract?.slice(0, 50)}…`);
show('/codrivers', await get('/codrivers'), (b) => `${b.items.length} co-drivers`);
show('/teams', await get('/teams'), (b) => b.items.map((t) => t.name).join(', '));
show('/teams?all=true', await get('/teams?all=true'), (b) => `${b.items.length} entrants`);
show('/cars', await get('/cars'), (b) => `${b.items.length} cars`);
show('/history', await get('/history'), (b) => `${b.champions.drivers.length} driver champions, most titles: ${b.mostTitles.drivers[0].name} (${b.mostTitles.drivers[0].titles})`);
show('/rallies/does-not-exist', await get('/rallies/does-not-exist'), (b) => b.error);
show('/nothing-here', await get('/nothing-here'), (b) => b.error);
console.log('cache header:', home.cache);
