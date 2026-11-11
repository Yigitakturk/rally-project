// Runs the collector from this computer and saves into Firestore.
// With FIRESTORE_EMULATOR_HOST set (see `npm run collect:emulator`), it writes
// to the local test database instead of the real one.
//
//   npm run collect:emulator -- 2020 2021 2022 2023 2024 2025 2026 2027
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { runCollector, defaultYears } from '../src/run.js';

const years = process.argv.slice(2).map(Number).filter(Boolean);
initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-rally' });
const result = await runCollector(getFirestore(), years.length ? years : defaultYears());
console.log(JSON.stringify(result, null, 2));
