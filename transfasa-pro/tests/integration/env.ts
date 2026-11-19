import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

export const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'demo-transfasa';
export const REGION = 'europe-west1';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Integration tests must run under `firebase emulators:exec` (npm run test:integration).');
}

const [authHost, authPort] = process.env.FIREBASE_AUTH_EMULATOR_HOST.split(':');
const fnHost = process.env.FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5001';
const [fHost, fPort] = fnHost.replace(/^https?:\/\//, '').split(':');

export const runId = Math.random().toString(36).slice(2, 8);
export const PASSWORD = 'Integration#2026';

let appCount = 0;

/** A separate client app (own auth state) signed in as `email`, or anonymous-free when null. */
export async function clientAs(email: string | null) {
  const app: FirebaseApp = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-key' }, `c${appCount++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
  const functions = getFunctions(app, REGION);
  connectFunctionsEmulator(functions, fHost!, Number(fPort));
  if (email) await signInWithEmailAndPassword(auth, email, PASSWORD);
  const call = <Req, Res = unknown>(name: string) => httpsCallable<Req, Res>(functions, name);
  return { app, auth, call };
}

/** Extract the Firebase Functions error code from a rejected callable. */
export async function errorCode(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return String((e as { code?: string }).code ?? 'unknown').replace(/^functions\//, '');
  }
}
