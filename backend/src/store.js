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

export async function saveSeason(db, { season, rallies }) {
  const updatedAt = new Date().toISOString();
  await writeAll(db, 'seasons', [{ id: String(season.year), ...season, updatedAt }]);
  await writeAll(db, 'rallies', rallies.map((r) => ({ ...r, updatedAt })));
}

/** Rebuilds the drivers/co-drivers/teams/cars lists from every stored rally. */
export async function rebuildIndexes(db) {
  const snap = await db.collection('rallies').get();
  const rallies = snap.docs.map((d) => d.data());
  const indexes = buildIndexes(rallies);
  const updatedAt = new Date().toISOString();
  for (const [name, items] of Object.entries(indexes)) {
    await writeAll(db, name, items.map((x) => ({ ...x, updatedAt })));
  }
  return Object.fromEntries(Object.entries(indexes).map(([k, v]) => [k, v.length]));
}

export async function saveStatus(db, status) {
  await db.collection('meta').doc('status').set({ ...status, finishedAt: new Date().toISOString() });
}
