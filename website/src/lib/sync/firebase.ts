import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export type SyncFirebaseClient = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let client: SyncFirebaseClient | null = null;

function requiredEnv(name: string) {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export async function getSyncFirebaseClient() {
  if (!client) {
    const app = initializeApp({
      apiKey: requiredEnv("VITE_FIREBASE_API_KEY"),
      authDomain: requiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
      projectId: requiredEnv("VITE_FIREBASE_PROJECT_ID"),
      appId: requiredEnv("VITE_FIREBASE_APP_ID"),
    });

    client = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }

  if (!client.auth.currentUser) {
    await signInAnonymously(client.auth);
  }

  return client;
}
