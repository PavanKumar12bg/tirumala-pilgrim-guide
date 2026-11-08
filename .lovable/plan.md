# Clean & Eco Tirumala — implementation plan

## Scope and corrections to the earlier plan
Add the complete participation feature to this existing Tirumala Guide only. Preserve maps, navigation, announcements, voice helper, existing authentication, data and security. No production deployment.

Correct the earlier assumptions: **no password/OTP/email verification**, **Sheets activity records**, **private Drive photos**.

## Existing features to reuse
- File-based pages in `src/routes`, shared `AppShell`, existing buttons/forms and seven-language dictionaries in `src/lib/i18n.tsx`.
- `src/components/admin/AdminPanel.tsx` tabs and existing admin role checks; server mutations use `requireSupabaseAuth` and `has_role`, not UI-only authorization.
- Existing `src/start.ts` bearer attachment and CSRF protection.
- `src/lib/image-compress.ts` for mobile image compression, with additional server validation.
- Pavan's Google Sheets connection is already linked. No accessible Google Drive connection was listed; connect it during approved implementation.
- No participant-registration feature exists to duplicate. Root audio and voice components need no changes.

## Pages and presentation
- `/clean-eco-tirumala`: green/cream/gold branding, initiative, participation steps, rules, registration entry, leaderboard, card explanation and recent approved activities. Use unframed sections and restrained typography; all public interface copy in seven languages.
- Add only a compact Home promotion with Participate Now and View Contributors. Leave bottom navigation unchanged.
- Separate participant pages for dashboard, new activity, activity history and My Appreciation Card. They use the existing shell and show a registration/resume state when no valid participant session exists.
- Dashboard shows photo, name, ID, private unverified email, submitted/approved/pending/rejected totals and card status.
- Participation guidance must not authorize planting or handling hazardous waste: follow local rules, obtain required permission and avoid restricted areas.

## Registration and privacy
Collect full name, email, profile photo and required collection consent; public display consent is separate and optional.

Create a server-issued, unguessable participant session in an HttpOnly, Secure, SameSite cookie. Store a hash of its capability, expiry and revocation state. This proves possession of a registration session, **not ownership of an email address**. Do not create anonymous auth accounts or alter existing admin sign-in.

Automatically assign a unique participant/display ID and record `email_verified=false`. Repeated registration in the same valid session returns that participant. A matching email in another browser never reveals the existing profile or creates a session for it; show a neutral recovery instruction without exposing whether that email exists. Use an explicit admin-assisted recovery process rather than impersonation by email. Warn that clearing cookies or switching devices loses automatic access and that shared-browser sessions must be ended.

Offer participant requests to hide/remove public profile/photos. Consent withdrawal removes public access promptly; private record deletion and audit-retention handling are reported separately.

## Activities and private images
Support all six requested categories, description, date, area, required before/after photos and optional additional photos; mobile camera/file upload, preview and compression.

Validate signatures, dimensions and JPEG/PNG/WebP format server-side; strip metadata. Proposed limits: 8 photos/activity, 10 MB incoming and 2 MB compressed per image, covered by tests.

Submission IDs and idempotency keys prevent accidental duplicate retries. Google Drive files remain private. Participant/admin photo access is authorized per file; public access requires approved activity, explicit display consent and a public-safe projection. Public endpoints must enforce these conditions themselves; knowing a Drive ID does not grant access.

Show Pending Review, Approved or Rejected with the admin reason. Pending/rejected activities never count. A failed external upload/write must produce a visible recoverable state, not success.

## Sheets, durability and review consistency
Use a dedicated spreadsheet/tab and private Drive folder in the owner's connected account, not participants' Google accounts. Do not reuse or overwrite voice-training tabs.

Sheets includes all 15 requested columns plus reconciliation/version and verified quantities. Photo references stay private; write user content literally to prevent formula injection.

Sheets is not transactional, so a small Cloud safety layer is necessary for sessions, durable pending submissions, review versions, audit records, eligibility and card uniqueness. **Do not silently replace Sheets with a permanent duplicate activity table.** Pending payloads are retained in an outbox until acknowledged; verified review/contribution snapshots retain only fields needed to recalculate recognition safely. Read descriptive activity history from Sheets through a bounded cache.

Batch/cache Sheets reads, use stable IDs and bounded retries. Durable outbox plus private temporary Cloud image staging preserves failures until Drive/Sheets read-back. Admin Sync/Retry is idempotent; scoped cleanup is recoverable.

Reviews originate in the website Admin panel. Out-of-band Sheet edits are flagged for reconciliation, never silently treated as authorized approvals. Serialize reviews per activity and use atomic local contribution/card recalculation; external Sheet updates remain explicit sync jobs.

## Admin, contributions and leaderboard
Add a Clean & Eco tab: participants, activity queue with before/after comparison, date/location inspection, approve/reject/comments, verified plastic weight and sapling counts, correction/revocation, contribution history, public hiding, removal requests and sync retry.

Record actor, timestamp, prior/new values and reason for every review or correction. Require an authorized admin for confirmed quantities; user claims are separate and unverified.

Leaderboard includes only opted-in, non-hidden participants with approved contributions. Show safe ID/name/photo, approved cleaning count, verified plastic/saplings, approved activity total and achievement level. Default ordering is approved activity count, with stable ID tie-breaks; photos never affect rank. Achievement thresholds are admin-configurable rather than fabricated weights combining kilograms and saplings.

## Eligibility and one master appreciation card
Admin configures minimum approved activity count, required categories, optional minimum period and structured recognition conditions; no executable expressions. Publish explicit rules before issuing cards rather than assuming a single approval qualifies.

Recalculate on approval, rejection, revocation, quantity correction and explicit rules reevaluation. Start/end dates come from first/latest approved **activity dates**, not submission dates or fixed validity. Period is calendar-day span; include this definition in Admin settings. Count photos only from approved records.

Allocate unique card numbers such as `TG-CET-2026-000001` atomically with a uniqueness constraint. Store issued snapshots, rule/template versions and append-only generation/status history. When eligibility is lost, mark current card revoked/under review and disable current issued downloads; preserve history. A downloaded file cannot be remotely recalled.

One reusable HTML/SVG template displays requested branding, participant photo/name/ID, card number, dates, approved cleaning/photos, verified quantities when present and achievement level. Clearly state independent Tirumala Guide appreciation, not an official identity/travel document. Two supplied devotional photos are pending: use clearly labeled placeholders and block final template publication until approved images are supplied.

Admin previews labeled sample data, edits localized template text/images/rules and publishes a version. Template changes do not silently alter issued snapshots; explicit regeneration creates a new historical version. Provide high-resolution PNG and actual PDF downloads via browser-compatible rendering/PDF tooling, not merely print-dialog instructions. Embed authorized images/fonts so exports match the preview.

## Technical scope
Proposed new modules: `src/lib/eco/` schemas, session/server helpers, connector helpers, queries, contribution/eligibility logic and export helpers; `src/components/eco/` forms, activity views and master card; `src/components/admin/CleanEcoAdmin.tsx`.

Add `clean-eco-tirumala` index/dashboard/activity/activities/card route files with unique metadata; private pages are noindex. Add per-file authorized media endpoints.

Modify only Home, existing Admin tab wiring, translations, feature-specific semantic CSS tokens and sitemap for the public initiative page. Do not edit generated clients/route tree manually.

New tables: participants, hashed sessions, submission outbox, review events, contribution snapshots, template/rule versions, cards/history, sync state and removal requests. Explicit grants/RLS on all; no anonymous private access or new auth-user foreign keys. Participant capability/ownership checks precede scoped server access; Admin uses existing authenticated RLS. Public DTOs exclude private fields. Existing tables remain unchanged.

## Setup and environment
- Reuse server-only Sheets credentials and `LOVABLE_API_KEY`.
- Link Google Drive securely after plan approval; use the exact environment names returned by the connection, never invented credential placeholders.
- Store spreadsheet ID/tab and Drive folder ID as Admin configuration, not secrets.
- Sessions use opaque random capabilities with hashes; no extra signing-secret requirement if no encrypted cookie payload is used. Generate capabilities only inside server requests and never log them.
- User supplies the two card branding photos; native review of seven-language safety/privacy wording remains a release prerequisite.

## Verification and delivery
Add focused tests for session isolation/email non-ownership, consent/public filtering, file validation, idempotency, sync failure/retry, review authorization, count/quantity corrections, category/period eligibility, date bounds, unique card IDs, historical versioning and revocation.

Run relevant/new tests and inspect automatic typecheck/build. Verify real registration → upload → owner Admin review → totals/leaderboard → card → PNG/PDF → revocation, plus cross-session denial. Check 360×527/desktop and existing Home/transport/map/audio/voice flows.

Final report lists exact files/migrations, connector setup, required environment names, completed flows, actual test counts and blockers. Do not claim Google/owner-authenticated checks or physical-phone behavior passed unless exercised. No deployment.

## Approval boundary
This turn changes planning/project requirements only. Implementation starts after approval of this revised plan. Google Drive authorization, chosen private folder/spreadsheet, owner Admin access and the two final images are the external dependencies; unavailable integrations must remain honest pending states, not simulated completions.