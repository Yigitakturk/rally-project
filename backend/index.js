// Firebase Cloud Functions for the rally website.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { runCollector } from './src/run.js';
import { createHandler } from './src/api.js';

initializeApp();
setGlobalOptions({ region: 'europe-west1' });

// The daily collector: runs every night at 04:00 Turkey time.
export const collectDaily = onSchedule(
  {
    schedule: 'every day 04:00',
    timeZone: 'Europe/Istanbul',
    timeoutSeconds: 540,
    memory: '512MiB',
    maxInstances: 1,
    retryCount: 0,
  },
  async () => {
    const result = await runCollector(getFirestore(), undefined, (msg) => logger.info(msg));
    logger.info('Collector finished', result);
  },
);

// The API the website reads from. At most 3 copies run at once, so a flood
// of requests cannot run up a big bill; Firebase's servers also cache answers.
export const api = onRequest(
  { memory: '256MiB', maxInstances: 3, concurrency: 80, timeoutSeconds: 30 },
  createHandler(() => getFirestore()),
);
