import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

export function createFirebaseClients(): {
  app: FirebaseApp | null;
  auth: Auth | null;
} {
  if (!isFirebaseConfigured()) {
    return { app: null, auth: null };
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth: Auth = getAuth(app);
  return { app, auth };
}
