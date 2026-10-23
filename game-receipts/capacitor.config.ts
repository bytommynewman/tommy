import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iOS/Android shell. Game Receipts is server-rendered (auth, grading and
 * receipts all live on the server), so the native app loads the deployed web app.
 * CAP_SERVER_URL: your deployment (https://…) or, for on-device testing, your Mac's LAN
 * address running `npm run dev -- -H 0.0.0.0` (e.g. http://192.168.1.20:3000).
 */
const url = process.env.CAP_SERVER_URL ?? "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "app.gamereceipts",
  appName: "Game Receipts",
  webDir: "native/www",
  backgroundColor: "#050607",
  server: { url, cleartext: url.startsWith("http://") },
  // The web app already pads for the notch and home indicator via env(safe-area-inset-*).
  ios: { contentInset: "never", backgroundColor: "#050607", scrollEnabled: true },
  android: { backgroundColor: "#050607" },
};

export default config;
