import type { CapacitorConfig } from "@capacitor/cli";

/**
 * NIMIPIKO store apps (Google Play + App Store) — Capacitor wraps the web app.
 *
 * CAP_SERVER_URL decides which NIMIPIKO the native app opens:
 *   • development: the local dev server
 *       Android emulator → http://10.0.2.2:3000   (10.0.2.2 = this computer)
 *       phone on the same Wi-Fi → http://<this-computer's-LAN-IP>:3000
 *   • release: the production app URL, set when the store builds are made
 *     (see docs/mobile/README.md — not decided while the redesign is in progress).
 * Without it, the app shows the bundled launch screen in mobile/www.
 *
 * `npx cap sync` reads this file, so set the variable when syncing:
 *   CAP_SERVER_URL=http://10.0.2.2:3000 npx cap sync android
 */
const serverUrl = process.env.CAP_SERVER_URL?.trim() || undefined;

const config: CapacitorConfig = {
  appId: "com.nimipiko.app",
  appName: "NIMIPIKO",
  webDir: "mobile/www",
  backgroundColor: "#06101F",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
          // Bundled page shown when the app can't reach NIMIPIKO (no network).
          errorPath: "offline.html",
        },
      }
    : {}),
  plugins: {
    // Full-bleed world: draw edge to edge under the status/navigation bars and
    // expose the safe-area insets to CSS (env() + --safe-area-inset-*).
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "DARK", // light icons on the navy world
    },
  },
  android: {
    backgroundColor: "#06101F",
  },
  ios: {
    backgroundColor: "#06101F",
    contentInset: "never",
  },
};

export default config;
