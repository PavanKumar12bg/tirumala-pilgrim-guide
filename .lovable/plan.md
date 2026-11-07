# Tirumala Guide — Read-only Product Audit

No changes proposed. This document is the audit itself; approving it changes nothing. Counts are live data from the database as of this audit.

## 1. Existing user-facing features by pilgrim journey stage

### Before the trip (planning)
- **Darshan information** — `/darshan` (`routes/darshan.tsx`, `StatusCards` in `HomeSections.tsx`). Shows TTD's daily wait range and number of full queue compartments, with the report date and a source link (`ttd-report.server.ts`, cached TTD News fetch). Admin-entered figures are labeled (`darshan-display.ts`). There is no live crowd feed.
- **Wait-increase alert** — compares one daily report with the previous one and alerts when the wait goes up by more than an hour (`ttd-report.ts`). It is not live.
- **Trip & Transport** — `/transport`, `/transport/$slug`, `/transport/$slug/stop/$stopId` (`TransportViews.tsx`). Uses five fixed templates (package, route guide, bus routes, pickup, help info). 4 categories are published and 1 is a draft. Free-bus and footpath info links to sources and states there is no live bus data.
- **Journey planner** — `/journey` (`journey.ts`). A multi-day itinerary saved on the device, with start time, planned and actual arrival times typed in by hand, and visited places.
- **Official TTD links** — `/ttd`, plus `TirumalaInfoLink`.
- **Languages** — 7 languages (`i18n.tsx`, `LanguageSwitcher`), each script with its own font.
- **Phone home-screen install** — install manifest only. Nothing works offline.

### On the hill (navigation and amenities)
- **Home** — `/`: full-width deity photo, darshan status cards, three quick buttons (Map, Voice, Medical/Food/Amenities shortcuts that open the map), and a list of places (`PlacesGrid`).
- **Map** — `/map` (`MapExplorer.tsx`). Leaflet/OSM map with GPS, nearby search, category filters, marker grouping and map layers built from GeoJSON. Real walking routes come from OSRM, with re-routing, off-route detection and arrival detection. Only places with verified coordinates get a pin.
- **Place data** (visible places / with verified pins): hotel 28/28, amenity 14/14, other 6/6, temple 5/4, landmark 4/4, office 3/2, food 2/2, transport 1/0, **medical 0**.
- **Voice assistant** — `VoiceAssistant.tsx`, `voice-commands.ts`. Spoken commands for categories, location, nearby, temple, map, navigate, stop and language switch, with an editable text fallback. It uses the device's speech support.
- **Announcement ticker** — `AnnouncementTicker` in the header on every page. 1 announcement is active.
- **Background voice announcement** — `BackgroundDarshanAudio`. Plays the announcement in the selected language, repeats on the admin's timing, has a one-button Allow prompt when the browser blocks sound, and a sound on/off choice in the language menu. 1 published voice announcement, 1 draft.

### Emergency
- **Emergency page** — `/emergency`. A read-only list of medical places, linked from the footer only. **There are currently no medical places, so the page shows the empty/pending notice.**

### Trust and legal
- About, Contact, Privacy, Terms pages (`InfoPage`), cookie notice (`CookieNotice`), and footer links in `AppShell`.

## 2. Partially built or placeholder
- **Emergency** — the page structure exists, but there is no data and no verified emergency phone numbers (blocked on purpose).
- **Senior assistance listing** — not published; waiting on verification.
- **Transport providers** — 2 exist; public visibility depends on approval and live offers. The provider network is mostly empty.
- **Crowd level** — the `crowd_level` column and admin field exist, but there is no automated source. Only daily TTD reports are used.
- **Pilgrim count from TTD reports** — not extracted.
- **New-report email alerts** — mentioned only. They need an owned sending domain.
- **AdSense** — only the cookie notice exists. There is no publisher ID or custom domain.
- **Verification metadata** (source, last/next review, responsible admin) — only transport has `last_verified_on` and sources. Places and announcements have none, and review intervals are not enforced anywhere.
- **Native review of safety text** — not done for the 5 extra languages.
- **Darshan page** — shows only the report and links. There is no step-by-step darshan guide.

## 3. Admin capabilities — `/admin` (`AdminPanel.tsx`; roles enforced by database security rules)
- First-admin claim (`claim_first_admin`) and admin-only access.
- **Overview** tab: summary counts.
- **Status**: manual darshan override (auto or manual mode, wait range, compartments), status editor, and daily history with trends (`StatusHistory`, `status_history` trigger).
- **Ticker**: add, edit, reorder and turn off multilingual ticker items.
- **Voice announcement** (`VoiceAnnouncementAdmin`): several drafts, AI translation into 7 languages and voice per language, status/error/retry per language, preview, all-or-nothing publish, scoped delete with cleanup report, and autoplay/repeat settings.
- **Places / Review**: create and edit places, show/hide, feature, order, check coordinates, review queue for OSM imports, compressed WebP photo upload into private storage, and AI photo identification that only suggests (`PhotoIdentifier`).
- **Transport** (`TransportAdmin`): categories by template, items, providers, offers, and private fields (commission, notes, private phone) visible to admins only.

## 4. Clearly absent (not in code)
- Step-by-step first-time pilgrim guide and darshan procedure guide (Phase 1).
- Senior and disabled-pilgrim guide (Phase 2).
- Return-trip planner (Phase 3, beyond what transport covers).
- Verified emergency contacts center (Phase 4 content).
- A dedicated nearby-facilities page (the map's nearby search covers part of this).
- Wrong-information reporting by visitors (Phase 6). No such table or form exists.
- Offline mode / service worker (Phase 7, deferred on purpose).
- Document checklist (kept separate; not built).
- Booking: seva, darshan tickets, accommodation, donations. Only links to TTD.
- Festival/event calendar and educational/history content.
- Pilgrim accounts, favorites synced across devices, push notifications, and email or SMS sending.
- Live crowd data, live bus tracking, and fares not tied to a source (intentionally excluded).
- Lost & found, a lost-person helper, and a weather or ghat-road status feed.
- Usage analytics shown in admin.

## Pending blockers (from the roadmap)
- Live admin Generate → Publish → Delete check needs the owner signed in.
- Production host (Vercel) settings are unverified.
- Advanced admin security work is blocked on a domain and an owner decision.
