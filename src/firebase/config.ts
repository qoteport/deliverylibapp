import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
// Only public Firebase Web SDK values may have the VITE_ prefix.
const env = (import.meta as any).env;
const firebaseConfig = {
  apiKey: String(env.VITE_FIREBASE_API_KEY || ''),
  authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
  projectId: String(env.VITE_FIREBASE_PROJECT_ID || ''),
  storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
  messagingSenderId: String(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
  appId: String(env.VITE_FIREBASE_APP_ID || ''),
};
const databaseId = String(env.VITE_FIRESTORE_DATABASE_ID || '');
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId || !databaseId) {
  throw new Error('Firebase client configuration is missing. Configure the public VITE_FIREBASE_* values and VITE_FIRESTORE_DATABASE_ID.');
}
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
if (app.options.projectId !== firebaseConfig.projectId) {
  throw new Error('Firebase project changed. Restart the app to close the previous session.');
}
// Explicit database only; never fall back to a different project/database.
export const db: Firestore = getFirestore(app, databaseId);

export const auth = getAuth(app);

// Operation types for error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on initial boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline cache mode.');
    } else {
      console.log('Firestore connection initialized.');
    }
    return false;
  }
}
