# Tirumala Guide: premium redesign and document checklist

## Approval boundary
This is an inspection report and proposed scope, not implementation authorization. No application code, database, content, storage, settings, dependencies or deployment has been changed. Approving this scope authorizes only the phases below; Emergency, offline support, return-planning and other earlier roadmap features remain outside it.

## 1. Evidence and current findings

**Code-inspected:** current routes, shared presentation, language/copy modules, admin/auth patterns and repository migrations. **Preview-inspected:** Home, Darshan, Map, Journey, Transport and its four published category pages, About, Contact, Privacy, Terms, TTD links and signed-out Admin at 360×527; Home also at 1280×1800.

- All inspected mobile pages had no document-wide horizontal overflow. The first browser walkthrough captured no JavaScript page errors. Map tiles, clusters, attribution and controls rendered.
- Home headings and document language changed across all seven languages using isolated browser storage/reloads. This verifies persisted-language rendering, not translation quality. A subsequent actual language-menu test stopped because its test selector did not match; menu interaction remains unverified in this audit.
- Authenticated admin CRUD, live RLS behavior, walking navigation, voice audio, slow networks, physical Android, screen readers and contrast were not tested this turn. Repository migrations are evidence of intended policies, not confirmation of deployed policy contents. No tests/builds were run; earlier test counts are not fresh evidence.

### Confirmed findings and proposed changes

| Current implementation and evidence | Problem | Proposed improvement | Database? |
|---|---|---|---|
| `src/styles.css:65–118`: 16px base radius, cool silver/aubergine, multiple gradients and shadows | Does not match the approved traditional palette; repeated elevated surfaces | Semantic maroon/gold/stone/ivory tokens, restrained borders, small item radii, flat navigation; retain functional map/status colors | No |
| `src/routes/index.tsx:33–54`: photo in a rounded framed section before status and shortcuts | Photo dominates the first small-phone view; main heading is a devotional phrase, with brand only in header | Preserve the supplied deity image and face; unframed, shallow photographic introduction with Tirumala Guide title and brief devotional supporting text; prioritize status and essential actions | No |
| `src/components/HomeSections.tsx:140–160`, `PlaceImage.tsx:14–16` | Large photo slots become decorative emoji/category placeholders; category text repeats | Use real-photo items where available and compact text rows where absent; no artificial substitute facility images | No |
| `CookieNotice.tsx:10–19`; preview | On first visit the fixed notice covers status/actions and transport choices; storage reads/writes lack failure guards | Compact, accessible consent presentation; prevent obscuring key information, preserve choices, handle blocked storage | No |
| `transport.index.tsx:26–35`, `transport/TransportViews.tsx:10–18,39–58,69–87` | Discovery, sources, routes and providers share rounded/shadow card treatment | Route-oriented discovery, route facts in definition lists, boarding-point lists and separate provenance lines; providers retain distinct repeated-item treatment | No |
| Preview: package and pickup categories are published but have no items; category descriptions remain English in Telugu | Empty destinations and mixed language undermine trust | Honest localized empty states; identify missing translations in Admin; do not fabricate providers/content or silently unpublish records | No for presentation; approved content edits only |
| `TransportViews.tsx:75–79`; preview | Stops/duration/fare fields include raw English; dates render as ISO strings | Translate available structured values without changing facts; localized dates/numbers and visible incomplete-content handling | None initially; redesign transport field storage only if separately justified |
| `darshan.tsx:10–11` | Mostly repeats status; no procedure guide currently | Compact status/provenance layout; improve current supporting copy. A full procedure guide requires separately sourced content approval | No |
| `ttd.tsx:15–19` uses shared `StatusCards`; preview currently shows admin values under a TTD-report heading | Page context suggests TTD-derived figures although individual values are marked admin-entered | Separate official report links/data from guide-admin status; never attribute manual numbers to TTD | No |
| `i18n.tsx:46–47`: English “live map”; `704–709` silently falls back to English/Telugu | Misleading wording and incomplete translations can appear complete | “Facility map” wording in all seven languages; retain readable fallback but identify incomplete CMS translations in Admin | No for labels |
| `journey.tsx:66–69,75–92` | Repeated framed stops; tab relationships need completion | Timeline/editorial itinerary with existing controls, proper tab semantics and persistence feedback | No |
| `__root.tsx:18–75,83,100,113` | English-only error screens; old install theme; all script font families requested together | Localized errors, maroon browser theme, assess language-specific font loading without breaking scripts or hydration | No |
| `AppShell.tsx:14–27,31–75`, `LanguageSwitcher.tsx:16–49` | Shared gradients/pills, repeated notices and visual density | Flat branded header, readable language menu, compact footer and active navigation; do not enlarge the four-item bottom bar | No |
| `MapExplorer.tsx:355–575`, `map.tsx:29–47` | Many pill/rounded surfaces, small controls and role/application semantics merit review | Map-first styling, differentiated functional symbols, visible focus and accessible labels; retain GPS/routing logic, clusters, selection and attribution | No |

Unused presentation such as `RouteMapCard` (`HomeSections.tsx:78–98`) will be inventoried, not automatically deleted. Shared UI primitives will change only when necessary, not as a blanket rewrite.

## 2. Preserve

- Existing TanStack routes, React/TypeScript/Tailwind, Lovable Cloud, Drizzle migrations, admin separation and authentication.
- Canonical places, verified-coordinate rules, GeoJSON layers, GPS, walking routing and rate limits, map attribution, transport templates and private-provider separation.
- Uploaded temple logo, deity cover and relevant existing place photos; private photo storage and signed URLs.
- Telugu default, existing per-script fonts and seven-language selection.
- Source/report dates, checked times, stale/unavailable handling and admin-origin labels.
- Home background-only announcements: no announcement card, ticker, speaker or announcement button. Sound preferences remain text-only in the existing language menu; voice assistant functionality remains available.

## 3. Design and copy scope

References: maroon `#641E26`, gold `#C49A45`, stone `#F3EFE6`, ivory `#FAF8F2`, dark text `#292521`. Convert to semantic OKLCH tokens in `src/styles.css`; components use semantic classes. Gold is an accent, not assumed readable small text on ivory. Adjust states for contrast, retain distinguishable success/warning/map colors, and avoid a uniformly beige page.

Keep Mandali/Noto Sans Telugu and appropriate other-script stacks. Define a restrained heading/body scale, reading widths, spacing, focus and touch targets. No unnecessary gradients, glows, decorative badges or new animation libraries. A subtle photo overlay is allowed only for readability. Use existing authentic photos, document provenance/permission gaps, and never generate substitute images of real facilities.

Page treatments: Home information-first/photo-led; Darshan factual/status-first; Transport route comparison and stop lists; Map full-screen; Journey itinerary; institutional/legal pages editorial. Emergency is not built in this scope; its later contact-list design remains reserved.

Review `src/lib/i18n.tsx`, `site-copy.ts`, `upgrade-copy.ts`, `ttd-report-copy.ts`, `transport-copy.ts`, `journey-copy.ts`, `voice-copy.ts`. Rewrite only clarity/tone without changing verified facts. No new timings, fares, rules, helplines, facilities or guarantees. Safety-critical translations require native-language review; automated checks cannot certify naturalness.

## 4. Pilgrim Document Checklist

### Public experience
Add `/checklist`, titled Pilgrim Document Checklist. Link from Home and Journey, and contextually from Darshan; preserve the existing four-item bottom navigation.

Five fixed categories: ticket/booking; identity; travel documents; family/personal essentials; other preparation. Use accessible checkbox rows, concise applicability text, category progress, overall completion and reset with confirmation. Progress stays on this browser/device, no registration, document uploads, identity numbers or cloud progress.

Every item separates **requirement level** (required for a specified service / recommended / check current instructions) from **verification status** (verified / unverified / review due). Always show applicability: no blanket mandatory-ID claim. Show source and last verification where established; absent dates stay “not verified.” Hide empty groups honestly.

Store versioned item IDs and content revisions locally after hydration. Language switching must preserve completion; materially changed instructions should request rechecking. Ignore deleted/unpublished IDs in progress; handle corrupt/blocked storage and stale/offline content visibly. This is not offline-guide implementation.

### Official-source evidence and limits
Public official-source research located TTD FAQ (`https://www.tirumala.org/FAQ.aspx`) and notices supporting ticket/token allotted-slot arrival and event-specific exceptions. These do not establish a universal current document list. Current service-specific ID/original-copy, child, dress and permitted-item requirements remain unverified. Booking records with an ID field are not sufficient evidence and personal booking PDFs will not be used as checklist sources.

Before publication, verify current official instructions for each claimed requirement and record exact source/service/date. Old notices are context, not freshly verified standing rules. Unverified items remain drafts or explicitly editorial reminders; native safety-content review is a release dependency.

### Why one new table is justified
`places` models locations, `announcements` ticker text, `transport_*` transport-specific linked records, and `voice_*` audio publication. Reusing them would couple unrelated access/publication rules. Reuse their localized-content, ordering and admin patterns—not their rows.

Propose `pilgrim_checklist_items`: UUID, stable slug, five-category key, seven-language title/instructions/applicability JSON, requirement level, verification status, source URL, last-verified date, optional review interval, next-review date, draft/published/archived status, sort order, content revision and timestamps. Any verifier identifier/private review notes must not appear in public projections. No profiles/progress table or new bucket.

Publish validation must require all seven language values and valid applicability; “required” additionally needs verified source/date. A guarded database publish function/trigger validates these even if a caller bypasses Admin UI. Date-dependent checks use triggers, not immutable CHECK assumptions.

RLS: anonymous/non-admin reads published rows only; no public writes. Admin can read/manage drafts via existing `has_role`; preserve other policies. Explicit grants accompany the additive migration. Validate input lengths, category/status enums and safe HTTPS source URLs server-side. Use existing TanStack server functions and authenticated RLS-scoped clients; no Express, Edge Functions, new scheduler or exposed privileged credentials.

Admin → Checklist: add/edit/order/category/source/date/applicability, seven-language completion, preview, publish/unpublish and delete confirmation. English-first Admin is acceptable. No AI translation/TTS or paid generation added automatically.

## 5. Exact implementation inventory

**Modify:** `src/styles.css`; `src/routes/__root.tsx`, `index.tsx`, `darshan.tsx`, `map.tsx`, `journey.tsx`, `transport.index.tsx`, `transport.$slug.tsx`, `transport.$slug_.stop.$stopId.tsx`, `about.tsx`, `contact.tsx`, `privacy.tsx`, `terms.tsx`, `ttd.tsx`; `src/components/AppShell.tsx`, `LanguageSwitcher.tsx`, `HomeSections.tsx`, `InfoPage.tsx`, `CookieNotice.tsx`, `PlaceImage.tsx`, `MapExplorer.tsx`, `TirumalaInfoLink.tsx`, `transport/TransportViews.tsx`, `admin/AdminPanel.tsx`; existing copy modules above; `public/manifest.webmanifest` only for approved theme alignment. Ticker/voice presentation changes, if needed, must preserve behavior and Home exclusion.

**Add for checklist:** `src/routes/checklist.tsx`, `src/components/PilgrimChecklist.tsx`, `src/components/admin/PilgrimChecklistAdmin.tsx`, `src/lib/pilgrim-checklist.ts`, `pilgrim-checklist.functions.ts`, `pilgrim-checklist-copy.ts`, focused validation/progress/publication tests and one additive Drizzle migration. Database tool owns migration filename and generated types; never hand-edit generated clients/types/route tree. Record new module rules in `AGENTS.md` and approved tasks in `roadmap.md` only after authorization.

## 6. Phases, risk and acceptance

1. **Design foundation + shared shell:** token/typography/navigation/notice pass. No schema changes. Risk: global styles affect Admin/map contrast. Check all public pages and signed-in Admin, keyboard/focus, reduced motion and 200% zoom.
2. **Purpose-built public pages + copy:** Home, Darshan, Transport, Journey, institutional pages and map presentation. No map algorithm/data rewrites. Check 320/360/390px, tablet and desktop; no overlap; map selection/routes/GPS-denial/error flow; all seven languages; report/admin provenance. Preserve every useful action.
3. **Checklist CMS + public local progress:** one additive table and secure publish workflow. Verify admin create/edit/order/publish/unpublish/delete, anonymous/non-admin restrictions, incomplete-translation/source rejection, five categories, check/reload/language-switch/reset, changed/unpublished item reconciliation and blocked storage.
4. **Regression + release evidence:** run existing relevant tests plus new concrete rule tests; inspect platform build output, route metadata and hydration. Test signed-in admin-to-public readback and voice regression, slow network/error states and real Android/assistive technology where available. No publish/deploy unless separately approved.

Source verification, accurate multilingual content, native safety review, real photographs and physical-device testing are dependencies—not claimed completed. No new libraries, paid image generation, AI calls, deployment or unrelated feature work is included.

**Awaiting explicit approval of this scope. Each phase stops at its acceptance gate; later phases require their own approval.**