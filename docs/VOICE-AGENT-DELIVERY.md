# Voice agent delivery

## Latest focused correction
- Root causes: a rejected duplicate/echo final stopped recognition without restarting; saved denial blocked explicit retries; typed commands could compete with active recognition; substring echo filtering swallowed short choices. Recognition also lacked explicit permission probing and useful lifecycle error handling.
- Modified `VoiceAgent.tsx`, `agent-session.ts`, `voice-agent.ts`, `voice-training.ts` and their tests; added `agent-microphone.ts`/test and seven-language `agent-feedback.ts`. Permission probing releases temporary tracks, denial can be retried by tap, all seven locales are explicit, finals share the typed dispatcher, and stale replies remain cancelled. Announcements pause during microphone capture/processing/speech to prevent speaker echo; pause/disable releases priority.
- Natural hotel/category discovery is distinct from GPS-nearest search. Information questions no longer become category shortcuts; Srivari/Swamivari variants resolve actual listings. Darshan replies use existing official/manual precedence, report date and not-live wording. Read announcement uses selected-language published announcement text, not legacy notices. Existing active training is fetched without overriding its zero stale time; protected controls/status cannot be overwritten by static training.
- Ran 194 tests across nine voice/audio test files successfully. Automatic preview typecheck/build reports `build OK`. Controlled mobile Chromium requested microphone once and released its temporary track; a Telugu final opened the real temple map with Start Navigation still required; controlled TTS emitted `te-IN`. Typed Darshan request opened `/darshan` and read actual admin-entered 4–5 hours/10 compartments with date and not-live warning. No page errors.
- These browser speech APIs were controlled, not physical microphone/audio tests. Actual device speech, native Android recognition and installed voices remain unverified. Fresh Google Sheets sync/read is not verified after the workspace move; its connection setup was interrupted. No Sheet data, database/RLS, Clean & Eco or production deployment changed. HTTPS endpoint responded over TLS but returned 404 in this environment, so production availability is unverified.

The older sections below record previous work, not new verification during this correction.

## Existing behavior preserved
Seven app languages, public-only places/transport/blogs/Q&A, canonical map, route confirmation,
final-result deduplication, cancellation, echo suppression, compact helper, private announcement audio,
atomic announcement publication, repeat intervals and sound preferences remain in place.
No AI calls, raw-audio storage, new announcement generation, production deployment or AccessibilityService.

## Root causes and changes
- `src/lib/agent-speech.ts`, `src/components/VoiceAgent.tsx`: device voices could be empty initially and
  utterances were not retained reliably. Wait for voices, retain utterance, catch errors, cancel stale callbacks,
  timeout safely, select matching Indian-language voices and report missing voice. Native TTS uses an installed
  bridge only; the Android device/plugin itself is unverified.
- `src/lib/announcement-audio.ts`: central agent priority covers processing and speech, saves current position,
  resumes same element after completion, defers due repeats, and respects opt-out/deletion/replacement/settings.
  Settings polls during speech cannot erase the saved position.
- `src/components/BackgroundDarshanAudio.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`:
  one root public audio owner survives Home→Map/Transport navigation; full-file blob cache is bounded.
- `src/lib/voice-agent.ts`: natural temple/food variants and specific Vengamamba names; synonym expansion now
  requires actual name containment rather than matching generic “Swamy/temple” fragments to Varaha Temple.
  Ambiguity still prompts a choice. `VoiceAgent.tsx` hands the verified destination to the existing map;
  it never says walking navigation started before Start Navigation confirmation.
- `src/lib/voice-training.ts`, `voice-training-query.ts`, `voice-training.functions.ts`:
  optional active query snapshot, seven-language columns, validated published destination IDs, fixed actions/routes,
  admin-only server-side Sheets credentials, atomic import and retained prior snapshot on errors.
- `src/components/admin/VoiceTrainingAdmin.tsx`, `KnowledgeAdmin.tsx`: configured sheet, Sync Now,
  last-sync/error/count and downloadable `public/voice-query-template.csv`.
- `drizzle/migrations/0012_voice_query_training.sql`, `0013_fix_voice_training_snapshot.sql`:
  additive tables/grants/RLS and admin-only invoker RPC. The live test exposed safe-update enforcement;
  the follow-up migration scopes deactivation to currently active rows.
- `src/lib/platform.ts`, `docs/ANDROID.md`: truthful capabilities, native TTS bridge contract and Android
  user-started microphone foreground-service/ongoing-notification limits. No native background service built.

## Google Sheet
[Open the training sheet](https://docs.google.com/spreadsheets/d/1HTCCxPtC0pZPEt33qSu03lBNzWuiay0z2aYPL0lo68k/edit)

Created through Pavan's Google Sheets connection with the exact 20 requested headers, three active examples
(real Srivari destination, published food search and Transport page). Owner-authenticated Admin Sync Now
successfully read this sheet and saved three rows. No invented provider/availability/fare data was added.
Use `|` between variants; General Answer responses require nonempty JSON values for all seven language keys.
Sheets is optional; no continuous sync or automatic retries. Admin labels follow the existing English admin convention.

## Verification
- 260 tests passed across 26 files, including selected-language speech, lazy voice loading, missing voice,
  interruption, saved-position resume, settings polling, deletion/opt-out/replacement, unchanged repeat interval,
  natural phrases, wrong-temple regression, invalid IDs/actions/routes, inactive rows and ambiguity.
- Automatic preview typecheck and build: latest entries report `build OK`; no manual build was run.
- Owner-authenticated Admin: Sync Now read back three rows and a saved timestamp, no errors.
- Mobile Chromium: typed Telugu temple request opened `/map?place=sri-venkateswara-temple`, selected actual
  temple, left Start Navigation confirmation visible; Telugu Transport command opened `/transport`, no page errors.
  Browser TTS was controlled in this check, not actual audible device Telugu speech.
- Real stored announcement playback + controlled agent speech: paused at 0.967590 seconds, resumed the same
  element at 1.302332 seconds after speech completion; did not restart from zero. No live announcement changed.

## Remaining limits
Real Android/JioSphere microphone recognition, audible seven-language voices and native TTS installation need a
physical-device check. Browser recognition may use the browser vendor's recognition service; the app does not
upload/store microphone recordings. Recognition pauses during TTS to avoid echo: typed commands/Stop can interrupt,
but spoken barge-in during TTS is not supported. Native always-on recognition is not implemented.
General answers remain deterministic: no LLM-style understanding or automatic translation of missing content.
Android Studio build/signing and native foreground service are separate work; no APK or production deployment was made.