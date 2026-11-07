<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Tirumala Guide architecture
- Transport server reads import browser-safe data definitions, never query modules, to avoid circular server-function imports; public connection settings resolve inside handlers with the existing publishable configuration fallback, never admin credentials.
- BottomNav measures its rendered height into a shared CSS variable so page and map clearance follow wrapped labels and device safe areas.
- Device speech selects only matching-language voices with exact Indian locale preference and current voice lookup per tap; background audio respects user opt-out and admin settings, with a single Home Allow dialog only after NotAllowedError and synchronous resume of the existing element so user activation is retained.
- Bundle the original hero and logo images as local imports for third-party hosting; Lovable-only asset paths are not portable to Vercel. Shared image handling resets failures when a new source arrives.
- The Emergency page is a read-only view of canonical medical places, not a new contacts CMS; do not imply emergency-service capability or add phone numbers without verified content approval.
- Official dashboard/ticker figures come from a cached, read-only TTD News fetch; preserve explicit wait ranges and queue counts with report dates, never infer crowd ratings or overwrite admin status/history with automated reports.
- Android home-screen support is manifest-only with standalone display and local photo-derived icons; do not register app-shell service workers because offline support was not requested.
- One canonical `places` table feeds both homepage cards and map markers; markers render only when `coords_verified` is true, so unverified places never get fabricated pins.
- UI strings live in `src/lib/i18n.tsx` dictionaries (one per language); per-script fonts are switched via `html:lang()` CSS vars in `src/styles.css`.
- Cookie choices use guarded device storage and an in-flow notice so consent cannot cover navigation or primary content.
- Place photos live in the private `place-images` bucket (workspace blocks public buckets) and are shown via signed URLs; DB stores only path/metadata.
- Admin rights come from `user_roles` + `has_role()`; RLS enforces writes. `claim_first_admin()` only works while no admin exists.
- In-app walking routes come from the keyless FOSSGIS OSRM foot profile (`src/lib/routing.ts`); never draw straight-line routes or open external navigation, and keep re-route requests rate-limited via `NAV_CONFIG`.
- Map layers and place imports are generated from the uploaded OSM GeoJSON by `scripts/build_geo.py` (converts [lon,lat] to [lat,lng]); places are keyed by unique `osm_id` so re-imports update rather than duplicate.
- AI photo identification runs only in the admin-checked server function `src/lib/photo-identify.functions.ts` (model call in `photo-identify.server.ts`); the AI only suggests a place id from existing records and the admin confirms before any save.
- Map markers declutter with a built-in screen-grid clustering in `MapExplorer` (no plugin); floating map controls live in the same bottom stack as the place card so they cannot overlap it.
- The public journey planner stores validated personal itineraries on the current device and references canonical place IDs; arrival plans are manually entered rather than invented travel estimates.
- Home status cards and ticker resolve darshan figures via `resolveDarshan` (`src/lib/darshan-display.ts`): admin manual figures (site_status manual_* columns) show only when admin enables manual mode or no TTD report is readable, always labeled as admin-entered with save time; TTD parsing stays untouched.
- TopBar owns the announcement ticker on all public and admin pages; Home retains one selected-language audio owner, normally render-null except for blocked-autoplay consent, so presentation never duplicates playback. Text-only sound preferences live in the existing language menu. Map height is flex-allocated and observed for Leaflet resizing to avoid content overlap.
- Every site-status save appends a database-triggered, admin-readable history snapshot; trends use latest actual saves per India-calendar day without filling missing days.
- Browser voice is a one-utterance progressive enhancement with editable transcript and controlled commands; device recognition/voices are not guaranteed and text remains usable. Proposed navigation selects a place but still requires Start Navigation.
- Trip & Transport content lives in `transport_*` tables rendered by a fixed, code-defined template set (`TEMPLATE_DEFS` in `src/lib/transport.ts`); admin picks a template per category so new cards need no code. Provider commission/private data sits in admin-only `transport_provider_private`, and public reads go through explicit column allow-lists, so private fields can never reach visitors.
- Darshan voice announcements live in `voice_announcements`/`voice_announcement_langs` with audio in the private `announcement-audio` bucket; admin server functions in `src/lib/voice-announcement.functions.ts` translate and voice one language per call, and `publish_voice_announcement()` swaps drafts atomically only when all 7 languages are ready — so visitors never get mixed or partial announcements.
- Announcement writes require returned-row confirmation and stored audio verification; hash-conditional voice saves reject concurrent text changes, and deletion reports database/cascade success separately from announcement-folder cleanup so partial failures remain recoverable.
- Announcement drafts and retired items persist independently; publishing keeps the existing atomic single-live RPC and polling, while explicit deletion targets only one folder. Source edits invalidate dependencies before inference, and ready audio requires validated stored bytes as well as matching hashes.
- Site-wide `VoiceAgent` (intents in `src/lib/voice-agent.ts`) uses browser speech only, reads live published data per question, and drives the existing map via `tg-agent-map`; no second map, AI calls or audio storage. One final result = one command (`agent-session.ts`); no stale replies.
- Blogs: `blogs` rows + private `blog-images` bucket, public only when published; admin writes via `has_role`.
- Voice search uses place `aliases` + `SYNONYM_GROUPS` over real listings, so new data needs no code.
- Android = Capacitor shell loading hosted site; `platform.ts` detects `window.Capacitor` at runtime, no background listening.
