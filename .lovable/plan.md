# Plan: Clean & Eco Tirumala Participation & Appreciation System

Additive feature in the existing Tirumala Guide. No new project, no production deploy, existing routes/design/RLS/admin untouched.

## Decisions confirmed
- **Login:** email magic link (no password, no OTP code form). Uses existing Cloud auth; first magic link creates the account, participant profile auto-creates on first sign-in.
- **Data:** Lovable Cloud database is the source of truth; Google Sheets receives a synced reporting copy via the existing Sheets connection.
- **Photos:** stored in your Google Drive (private folder, server-side upload only); database stores Drive file IDs. Public pages show only approved photos through a server proxy so Drive files stay non-public.
- **Card images:** your two uploaded images (Venkateswara photo + temple photo) become the Master Card Template branding. No TTD logo/authority anywhere.

## Pages (public)
1. `/clean-eco-tirumala` — hero (green/cream/gold), about, how to participate, rules, Participate Now, Top Contributors leaderboard, appreciation-card info, recent approved activities. 7-language copy via existing i18n.
2. Homepage: small promo banner (title, short text, Participate Now, View Contributors) — not the full dashboard.
3. `/clean-eco-tirumala/dashboard` — magic-link-gated participant dashboard: photo, name, Participant ID, email, activity counts, card status; buttons for new activity, my activities, my card, download.
4. `/clean-eco-tirumala/card` — My Appreciation Card with honest statuses (Not Yet Eligible / Under Review / Generated / Revoked) and PNG + PDF downloads when generated.

## Registration & sessions
- Participate form: full name, email, profile photo, privacy consent checkbox (required).
- Magic link sign-in; participant profile links to the auth account, so nobody can open another's profile by typing an email. Duplicate emails map to one account; one participant per account.
- Participant ID auto-generated (e.g. `TG-CET-P-000123`).

## Activities
- Categories: Plastic Waste Collection, General Cleaning, Waste into Dustbins, Tree Plantation, Environmental Protection, Other.
- Form: category, description, date, location, before photo, after photo, optional extra photos; mobile camera capture + upload, preview, client-side compression, size/format validation.
- Statuses: Pending / Approved / Rejected (with admin reason). Only approved counts.

## Database (additive, RLS on every table, admin via existing `has_role`)
- `eco_participants` (account link, name, email, photo Drive ID, public-display consent, hidden-from-leaderboard flag)
- `eco_activities` (participant, category, description, date, location, photo Drive IDs, status, admin comment, verified quantities: plastic kg, saplings, verified_by/at)
- `eco_activity_reviews` (audit history of every approve/reject/revoke/quantity change)
- `eco_card_settings` (single row: eligibility rules — min approved count, required categories, min period — plus template text)
- `eco_cards` (unique card number `TG-CET-2026-000001` via sequence, participant, start/end dates from first/latest approved activity, snapshot of totals, status, generation history)
- `eco_sheet_sync` (sync status/errors for retry)

## Google integration (server-side only)
- New server functions: upload validated photos to a Drive folder (existing google_drive connector), append/update activity rows in a new "Clean & Eco Tirumala" sheet (existing google_sheets connection) with the 15 columns you listed.
- Sync failure never loses a submission: record stays in database with sync-pending status; Admin gets Sync/Retry. Emails never appear on public pages.
- Requires linking the Google Drive connector to the project (one connect card during build).

## Admin (new tab in existing Admin panel)
- Participants list, activities queue with before/after photo inspection, approve/reject with comments, correct verified quantities, revoke approvals, hide from leaderboard, per-participant history.
- Card settings: eligibility rules, template text, branding image swap, sample preview, publish template (historical cards unchanged unless explicitly regenerated).

## Appreciation card
- One reusable HTML/SVG master template (green/cream/gold, leaf motifs, your two photos, Tirumala Guide branding, "independent appreciation card — not an official document" note).
- Auto-fill: photo, name, Participant ID, start/end dates (first/latest approved activity), approved activity count, verified plastic/saplings, approved photo count, achievement level.
- Auto-generates when eligibility rules pass (recalculated on every approve/revoke); unique sequential card number; PNG via canvas export and PDF via print-to-PDF stylesheet.

## Leaderboard
- Public: photo (only with consent), name, safe display ID, approved activities, verified plastic, verified saplings, total contributions, achievement level. Sorted by approved/verified records only; admin-hidden participants excluded.

## Testing
- Unit tests: eligibility rules, card number uniqueness, date logic, verified-quantity counting, status transitions, leaderboard filtering.
- Browser checks (mobile + desktop): full flow register → submit → admin approve → leaderboard → card → downloads; revoke recalculation; magic-link flow; existing pages unaffected.
- Drive/Sheets verified with real calls through the existing connections.

## Limits to state honestly
- Magic-link emails use Lovable's default sender until an email domain is set up.
- Drive photos load through the app server, slightly slower than direct storage.
- No background/offline support.
