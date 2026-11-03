# TirumalaInfo Live Darshan Status: investigation and plan

Nothing was changed. All findings come from requests made today (3 Nov 2026, about 06:58 UTC).

## 1. Source evidence
- `GET https://www.tirumalainfo.com/tirumala-live-status.php` returned 200, `text/html`, about 829 KB. The figures are already in the HTML the server sends, so they don't depend on a separate request after the page loads.
- Text seen on the page: "Updated just now · 3rd November 2026 12:03 PM · Auto-refresh every 15 min", "3,710 Pilgrims in Queue", "10/31 Active Compartments", "17,100 Darshan Completed Today", "Free Sarva Darshan 3-6 hrs — Estimated from reporting point", plus a share block for "Reporting Location: Krishnateja Circle".
- DOM ids found: `sc-wait`, `sc-wait-val`, `sc-wait-sub`, `stab-sarva`, `td-sarva`, `tp-sarva`. I did not map the compartment count to a stable id.
- **No documented or public JSON API for live status was found.** The page script calls only helper endpoints (`/daily-stats.php?action=summary`, `/panchang.php?action=today`, `/rasi-phala.php`, `/qa-ai.php`, `/pilgrim-quiz.php`). `robots.txt` disallows several of these, including `/daily-stats.php`, `/panchang.php`, `/save-status.php` and `/live-diag.php`. I did not call any of them.
- How the values relate: wait time (3–6 h) and active/total compartments (10/31) are what the site reports. The site labels the wait as "Estimated", so it is the site's own estimate, not an official TTD figure. The underlying source and how often it's updated are not documented.

## 2. Terms and robots conclusion: blocked
- `robots.txt` (`User-agent: *`) does not disallow `/tirumala-live-status.php`. So simply viewing the page is not blocked.
- `/terms.php` says users may not "Scrape, mirror, or republish our data feeds at scale without written permission". The Intellectual property section says "You may link to any public page freely. Republication, mirroring … " is restricted.
- Polling every 5 minutes and showing the figures on our own cards, and through our own API, counts as republishing their data feed. **That needs TirumalaInfo's written permission.** I recommend we don't build the scraper or the three endpoints until you have that permission.

## 3. Extraction reliability (if permission is granted)
- Medium to low. The values sit inside emoji-heavy marketing text and a page of about 800 KB. The ids above exist, but the site doesn't promise to keep them stable. A pattern-based parser like our TTD parser would work, but it would break silently whenever they redesign.
- The best option is to ask them for an official JSON feed or written permission naming fields and a polling interval.

## 4. What to do now (allowed, no permission needed)
- Add a "TirumalaInfo live status" link card on `/darshan` and `/ttd` that opens their page. Linking is explicitly allowed.
- Keep the current sources as they are: the TTD News daily report plus the admin manual figures added last turn.
- Draft a permission request email from pavankumarg4636@gmail.com asking for a JSON feed, the allowed polling interval and attribution wording.

## 5. Plan once written permission arrives
How it fits this project: the app runs on TanStack Start on an edge Worker, with Lovable Cloud. There is no Express or Vercel setup, and no always-running Node process is needed.
- Fetcher: `src/lib/tirumalainfo.server.ts`, with a fixed URL, a 10 s timeout, `redirect: "error"` and a size cap. It parses only fields that are explicitly present, so any missing field becomes `null`.
- Storage: a new table `live_status_snapshots` with `source`, `waiting_min_h`, `waiting_max_h`, `occupied_compartments`, `total_compartments`, `source_timestamp`, `fetched_at`, `ok` and `error`. RLS gives public read access to the latest row only, and writes come from the server side only. This keeps the last good result even across cold starts, which fixes the weakness of our current in-memory TTD cache.
- Schedule: a managed HTTP schedule calls `POST /api/public/jobs/live-status` (cron-authenticated) every 5 minutes, or whatever interval their permission allows. The interval is stored in config. Visitors never trigger fetches to TirumalaInfo.
- Public read endpoints (read from our database only): `GET /api/public/darshan-status`, `/api/public/waiting-time` and `/api/public/compartments`. Each returns `success, source, waitingTime{min,max,unit}|null, occupiedCompartments|null, totalCompartments|null, sourceTimestamp|null, lastFetchedAt, dataStatus`. `dataStatus` is `fresh` if the last good fetch is within 2× the interval, `stale` if it's older, and `unavailable` if there has never been a good fetch. The `/api/public` prefix is required here; plain `/api/...` paths would be blocked on the published site.
- Manual refresh button: it re-reads our database only. At most one source fetch per 2 minutes is allowed overall, enforced on the server by checking `fetched_at`, so visitors can't flood the source.
- Card: a compact black/gold variant inside the existing status cards. It shows the wait, occupied/total, the source with attribution and link, last updated (source time and our fetch time separately), a freshness badge, refresh and API health. All text is in 7 languages.
- Tests: parser fixtures (full, missing fields, changed wording returns null), the freshness logic, the rate limit, and the API response shape. A Playwright check at 360 px.

## 6. Unknown or blocked
- Blocked: written permission from TirumalaInfo.
- Unknown: their underlying data source, how accurate it is, and how stable their DOM ids are. Whether "Active Compartments 10/31" means the same as TTD's "Waiting Compartments 06" also needs checking: the two currently disagree.

## Decision needed
Approve section 4 now (link card and permission email draft), and keep section 5 on hold until permission arrives?
