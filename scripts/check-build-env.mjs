import { loadEnv } from "vite";
import { readFileSync } from "node:fs";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const required = [
  "VITE_COMMAND_API_BASE_URL",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIRESTORE_DATABASE_ID",
];
const missing = required.filter((key) => !env[key]);
if (missing.length)
  throw new Error(
    "Missing production web configuration: " + missing.join(", "),
  );
const contract = JSON.parse(
  readFileSync("firebase-applet-config.json", "utf8"),
);
if (
  env.VITE_FIREBASE_PROJECT_ID !== contract.projectId ||
  env.VITE_FIRESTORE_DATABASE_ID !== contract.firestoreDatabaseId
)
  throw new Error(
    "Production Firebase values must match firebase-applet-config.json.",
  );
const api = new URL(env.VITE_COMMAND_API_BASE_URL);
if (
  api.protocol !== "https:" ||
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(api.hostname)
)
  throw new Error("Production builds require a deployed HTTPS command API.");
for (const key of Object.keys(env))
  if (
    key.startsWith("VITE_") &&
    /SECRET|PRIVATE_KEY|SERVICE_ACCOUNT|CREDENTIALS|LIVEKIT_API_KEY/.test(key)
  )
    throw new Error("Private configuration must stay on the backend: " + key);
console.log(
  "Production web configuration checked: HTTPS API, explicit Firebase project/database, public client values only.",
);
if (!env.VITE_GOOGLE_MAPS_API_KEY)
  console.warn(
    "Google Maps browser key is missing: map rendering is unavailable; Places search uses the configured backend proxy.",
  );
