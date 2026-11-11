// Saves collected data into Firestore.
//
// Collections:
//   seasons/{year}          calendar + standings
//   rallies/{id}            one rally: info, entries, itinerary, results, stages
//   drivers|codrivers|teams|cars/{id}   index with simple stats
//   meta/status             when the collector last ran and what it did
import { buildIndexes } from './collect.js';

async function writeAll(db, collection, docs) {
  // Firestore allows at most 500 writes per batch.
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + 400)) batch.set(db.collection(collection).doc(String(doc.id)), doc);
    await batch.commit();
  }
}

/** Removes documents that are no longer in the newest list (e.g. merged teams). */
async function deleteMissing(db, collection, keepIds) {
  const refs = await db.collection(collection).listDocuments();
  const stale = refs.filter((ref) => !keepIds.has(ref.id));
  for (let i = 0; i < stale.length; i += 400) {
    const batch = db.batch();
    for (const ref of stale.slice(i, i + 400)) batch.delete(ref);
    await batch.commit();
  }
}

export async function saveSeason(db, { season, rallies }) {
  const updatedAt = new Date().toISOString();
  await writeAll(db, 'seasons', [{ id: String(season.year), ...season, updatedAt }]);
  await writeAll(db, 'rallies', rallies.map((r) => ({ ...r, updatedAt })));
  // A round that was cancelled, renamed or moved gets a new id: remove the old
  // copy of this season's rallies so it doesn't count twice in the stats.
  const keep = new Set(rallies.map((r) => r.id));
  const old = await db.collection('rallies').where('season', '==', season.year).get();
  const stale = old.docs.filter((d) => !keep.has(d.id));
  for (let i = 0; i < stale.length; i += 400) {
    const batch = db.batch();
    for (const d of stale.slice(i, i + 400)) batch.delete(d.ref);
    await batch.commit();
  }
}

/** Rebuilds the drivers/co-drivers/teams/cars lists from every stored rally. */
export async function rebuildIndexes(db) {
  const [rallySnap, seasonSnap] = await Promise.all([db.collection('rallies').get(), db.collection('seasons').get()]);
  const indexes = buildIndexes(rallySnap.docs.map((d) => d.data()), seasonSnap.docs.map((d) => d.data()));
  const updatedAt = new Date().toISOString();
  for (const [name, items] of Object.entries(indexes)) {
    await writeAll(db, name, items.map((x) => ({ ...x, updatedAt })));
    await deleteMissing(db, name, new Set(items.map((x) => String(x.id))));
    // A short version of the whole list in one document, so a list page
    // costs one database read instead of hundreds.
    const compact = items.map(({ results, ...rest }) => rest);
    await db.collection('lists').doc(name).set({ items: compact, updatedAt });
  }
  const seasons = seasonSnap.docs.map((d) => d.data())
    .map((s) => ({ year: s.year, rounds: s.calendar?.length ?? 0 }))
    .sort((a, b) => b.year - a.year);
  await db.collection('lists').doc('seasons').set({ items: seasons, updatedAt });
  return Object.fromEntries(Object.entries(indexes).map(([k, v]) => [k, v.length]));
}

export async function saveChampions(db, champions) {
  await db.collection('history').doc('champions').set({ ...champions, updatedAt: new Date().toISOString() });
}

export async function saveStatus(db, status) {
  await db.collection('meta').doc('status').set({ ...status, finishedAt: new Date().toISOString() });
}
