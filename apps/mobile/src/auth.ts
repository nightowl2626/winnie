import { signInAnonymously } from "firebase/auth";

import { createFirebaseClients, isFirebaseConfigured } from "./firebase";

const { auth } = createFirebaseClients();

export type AuthSession = {
  userId: string;
  idToken?: string;
  mode: "firebase" | "demo";
};

export async function ensureAuthSession(): Promise<AuthSession> {
  if (!isFirebaseConfigured() || !auth) {
    return { userId: "demo-user", mode: "demo" };
  }

  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  const user = auth.currentUser;
  if (!user) {
    return { userId: "demo-user", mode: "demo" };
  }
  const idToken = await user.getIdToken();
  return { userId: user.uid, idToken, mode: "firebase" };
}

