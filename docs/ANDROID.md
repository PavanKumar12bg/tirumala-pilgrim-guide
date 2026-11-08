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
7. Generate launcher icons/splash from `public/icons/tirumala-512.png` (Android Studio → Image Asset).
8. `npx cap open android`, run on a real phone, test: microphone prompt, Telugu speech, GPS,
   back button, map routing, admin login.
9. Native TTS: install `@capacitor-community/text-to-speech` in the Android shell and run `npx cap sync android`.
   The hosted site's bridge expects `Capacitor.Plugins.TextToSpeech` with `isLanguageSupported({lang})`,
   `speak({text,lang,rate})` (promise must resolve after speech finishes), and `stop()`.
   Plugin registration/global exposure varies by Capacitor version: verify this bridge in the real WebView;
   if unavailable the website explicitly falls back to browser speech. Merely installing a package is not verification.
   Download each required device voice and test all seven languages; missing voices show the text fallback.
10. Native recognition is NOT added here. Browser WebView recognition may be absent. A native speech plugin
    needs a separately implemented adapter to this site's finalized-result command lifecycle; do not claim it
    activates automatically or listens in the background.

## Foreground microphone service limits
A native developer must implement any later screen-off listening separately, with explicit user start/stop,
runtime `RECORD_AUDIO`, `FOREGROUND_SERVICE`, and (Android 14+) `FOREGROUND_SERVICE_MICROPHONE` plus
`android:foregroundServiceType="microphone"`. Start while the activity is visible and permission granted.
Android 12+ restricts starting foreground services from the background; Android 14+ enforces while-in-use
microphone restrictions. Keep an ongoing notification and an obvious Stop action; comply with Play policy,
battery/service limits and interruption handling. This repository does not implement that service.
AccessibilityService does not grant microphone access and is not requested.

## Optional query training
Admin → Voice Q&A → Google Sheets query training → Sync Now imports the configured `Queries!A1:T1001`
snapshot. The sheet is optional: existing published Q&A and built-in commands keep working without it.
Use the downloadable CSV's exact 20 headers. Separate alternate phrases with `|`; use `Active` or `Inactive`.
Listing destinations require a visible canonical place UUID; Page routes/actions are allow-listed. Category
rows use a real place category (e.g. Food). General Answer requires `Action_Type=Answer` and `Response_Text`
as JSON with nonempty `te,en,hi,ta,kn,ml,or` strings. No scripts or arbitrary routes execute. Bad imports
leave the prior snapshot intact and report an admin error; missing rows become inactive on successful sync.
Credentials stay server-only; no polling sync or AI calls. Only admin-approved source-verified answers belong here.
