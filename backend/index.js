// Firebase Cloud Functions for the rally website.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { runCollector } from './src/run.js';

initializeApp();

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
