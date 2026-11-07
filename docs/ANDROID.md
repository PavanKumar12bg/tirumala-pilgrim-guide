# Tirumala Guide — Android app (Capacitor)

The website stays the single source of truth. The Android app is a thin Capacitor shell that
opens the published website, so listings, blogs, announcements and admin edits appear in the
app without a new app release.

## What is ready in this repository
- `capacitor.config.json` — app id, name, splash/status-bar colours (traditional maroon).
- `src/lib/platform.ts` — capability layer. Uses browser APIs on the web and native plugins only
  when they are installed inside the app (`window.Capacitor`). No Capacitor package is bundled
  into the website.
- `initNativeShell` (wired in `src/routes/__root.tsx`) — Android back button (back in history,
  exit at Home), resume refresh, status bar colour, splash hide.
- Voice helper location uses `getPosition()` → native Geolocation plugin when present.
- Safe areas: bottom navigation already pads with `env(safe-area-inset-bottom)`.
- Icons: `public/icons/` (192/512 + maskable) — use them as the source for Android launcher icons.

## What is NOT built (needs native Android work and a real device test)
- Background / screen-off listening. Android requires a **foreground service** with a permanent
  notification and the `RECORD_AUDIO` + `FOREGROUND_SERVICE_MICROPHONE` permissions. Google Play
  reviews this. It is not implemented and must not be advertised until tested.
- AccessibilityService is **not** a listening API and Play only allows it for genuine accessibility
  tools. It is not used.
- Native speech recognition / TTS plugins are optional; until installed the in-app WebView uses
  the same browser speech as the website (support varies by WebView version).

## Build steps (on a computer with Android Studio)
1. Publish the website and note its HTTPS address.
2. Export the project to GitHub and clone it; run `npm install`.
3. `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/status-bar @capacitor/splash-screen @capacitor/geolocation`
4. This site uses server rendering and server functions, so the app must load the hosted site.
   In `capacitor.config.json` add `"server": { "url": "https://YOUR-PUBLISHED-DOMAIN", "androidScheme": "https" }`.
   Keep `webDir` pointing to a folder containing at least an `index.html` (e.g. run `npm run build`).
5. `npx cap add android` then `npx cap sync android`.
6. Add to `android/app/src/main/AndroidManifest.xml`: `RECORD_AUDIO`, `ACCESS_FINE_LOCATION`,
   `ACCESS_COARSE_LOCATION`, `INTERNET`. Grant the WebView microphone request in `MainActivity`
   (Capacitor's BridgeWebChromeClient handles `onPermissionRequest` when RECORD_AUDIO is granted).
7. Generate launcher icons/splash from `public/icons/icon-512.png` (Android Studio → Image Asset).
8. `npx cap open android`, run on a real phone, test: microphone prompt, Telugu speech, GPS,
   back button, map routing, admin login.
9. Optional later: `@capacitor-community/speech-recognition`, `@capacitor-community/text-to-speech`,
   `@capacitor/local-notifications`; `platform.ts` will pick them up automatically.
