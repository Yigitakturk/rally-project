// Rebuilds the drivers/co-drivers/teams/cars lists from the stored rallies
// without asking Wikipedia again. Used with the local test database.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { rebuildIndexes } from '../src/store.js';

initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-rally' });
console.log(await rebuildIndexes(getFirestore()));
