import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';

function formatPrivateKey(rawKey) {
  return rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
}

const existingApps = getApps();

export const firebaseApp =
  existingApps.length > 0
    ? existingApps[0]
    : initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: formatPrivateKey(env.FIREBASE_PRIVATE_KEY),
        }),
      });

export const db = getFirestore(firebaseApp);
db.settings({ ignoreUndefinedProperties: true });
