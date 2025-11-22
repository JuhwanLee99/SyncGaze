import admin from 'firebase-admin';
import dotenv from 'dotenv'; // 필요한 경우 추가
dotenv.config();

const buildCredential = () => {
  const projectId = process.env.SYNCGAZE_PROJECT_ID;
  const clientEmail = process.env.SYNCGAZE_CLIENT_EMAIL;
  const privateKey = process.env.SYNCGAZE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({ projectId, clientEmail, privateKey });
  }

  if (process.env.SYNCGAZE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.SYNCGAZE_SERVICE_ACCOUNT_JSON);
      return admin.credential.cert(parsed);
    } catch (error) {
      console.error('Failed to parse SYNCGAZE_SERVICE_ACCOUNT_JSON:', error);
    }
  }

  try {
    return admin.credential.applicationDefault();
  } catch (error) {
    console.error('Firebase application default credentials unavailable:', error.message);
    return null;
  }
};

export const ensureFirebaseInitialized = () => {
  if (admin.apps.length) {
    return admin.app();
  }

  const credential = buildCredential();
  const storageBucket = process.env.SYNCGAZE_STORAGE_BUCKET;

  if (!credential || !storageBucket) {
    return null;
  }

  return admin.initializeApp({
    credential,
    storageBucket,
  });
};

export const verifyIdTokenIfPresent = async authorizationHeader => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.replace('Bearer ', '');
  const app = ensureFirebaseInitialized();
  return admin.auth(app).verifyIdToken(token);
};

export const getFirebaseAdmin = () => {
  const app = ensureFirebaseInitialized();
  if (!app) {
    throw new Error(
      'Firebase admin is not configured. Ensure SYNCGAZE_STORAGE_BUCKET is set and credentials are provided via FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_JSON.',
    );
  }

  return {
    app,
    admin,
    bucket: admin.storage(app).bucket(),
    db: admin.firestore(app),
  };
};