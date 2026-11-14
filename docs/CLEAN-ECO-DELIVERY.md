# Clean & Eco continuation

## Added
- Capacitor core/Android/CLI 8.6 installed as requested; no APK built and no production deployment.
- Admin inbox filters pending/approved/rejected/all, refreshes on focus or Refresh Inbox, retains before/after photo review and Google sync retry, and exposes Recheck Card.
- Rejections require a reason. Card reconciliation uses migration 0017 for an atomic version-checked commit and idempotent retries; review success is reported separately from Google/card failures.
- Public `/clean-eco-tirumala`, `/participate`, `/dashboard`, `/new-activity`, `/activities`, `/card` under that prefix; seven-language page copy merged into existing dictionaries.
- Existing Admin Panel now has Clean & Eco: review, verified quantities, before/after photos, retry sync, participant hiding, eligibility and template publication.
- Shared server-only synchronization writes private Drive URLs and confirms Sheets records; retained staging/outbox protects retries.
- Card generation snapshots template/settings and reviewed totals; PNG/PDF export code added using html-to-image and jsPDF.
- Public projection functions and consent-scoped profile storage policy added in migrations 0015–0016; no private email projected.

## Connections
Google Drive and Google Sheets are linked. Server-only environment names: `GOOGLE_DRIVE_API_KEY`, `GOOGLE_SHEETS_API_KEY`, `LOVABLE_API_KEY`. Existing dedicated activity sheet and private photo folder verified. No sheet headers or voice-training examples overwritten.

## Verified
- Six voice-training records synchronized; 42 temple queries, 13 food, 22 transport, 15 Home, 16 Map, 20 Blogs.
- Live typed Telugu “శ్రీ వారి ఆలయం చూపించు” selected `/map?place=sri-venkateswara-temple`; “బ్లాగ్ సెక్షన్ ఓపెన్ చేయి” opened `/blogs`.
- Actual browser registration created private QA participant TG-CET-P-000001, email explicitly unverified.
- Two-photo cleaning submission e38127f8-9c30-4ca2-b61a-f29f58ca3bbf recorded in Drive and Sheets; dashboard status pending, zero approved totals. Synthetic test photos are explicitly QA-only, not real contributions. No public consent granted.
- Automatic build/typecheck OK; 316 regression tests passed, including before/after requirement and rejection reason validation. Mobile public registration/new-activity and signed-out admin gate checked without overflow or runtime errors.

## Not yet verified / incomplete
- Signed-in admin inbox was inspected while the owner's session was available: the prior QA contribution was already approved by the owner, and existing template reference uploads were preserved. The session is now signed out and own-session mint failed; final approval/rejection → leaderboard → generated-card/export/revocation checks need another admin sign-in. No test contribution was falsely approved by the agent.
- Eligibility rules have not been published; card generation intentionally remains gated until the owner sets and publishes them.
- Reference images are pending. Sample is labeled not issued; card title/stat/photo-placeholder labels are English-first, so seven-language card presentation remains incomplete.
- Card HTML export can vary with device fonts; actual PNG/PDF download requires testing with a legitimately generated card.
- No automatic Sheet polling: use existing Admin Voice Q&A Sync Now after edits; each command reads fresh active training rows. Sheets quotas respected. No deployment.
- Historical templates are preserved. Reconciliation/concurrency and long-term staging cleanup need further acceptance testing.

## Files
New `src/components/eco/*`, `src/components/admin/CleanEcoAdmin.tsx`, `src/routes/clean-eco-tirumala.*`, `src/lib/eco/{models,queries,sync.server,cards.server,public.functions,media.functions,template.functions}`; modified eco participant/admin functions, global dictionaries/styles, Home promo, Admin tab, voice training tests and roadmap.