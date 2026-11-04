# Tirumala Guide — full read-only audit (nothing changed)

Evidence labels: **[Code]** file read this turn, **[DB]** database query this turn, **[Test]** run this turn, **[Earlier]** browser/external checks from earlier sessions, **[Assume]** not verified.

Done this turn: 50/50 tests passed in 11 files **[Test]**. Database counts **[DB]**. No browser walkthrough was run today, so layout, truncation and low-end phone speed are **unverified today**. No external URLs (TTD, OSRM, TirumalaInfo) were re-fetched today.

## 1. Feature inventory
| Feature | State |
|---|---|
| Home hero, darshan cards, ticker, quick actions | Done [Code][Earlier] |
| TTD daily report (date, wait range, compartments), 10 min cache | Done [Code][Test]; pilgrim count not extracted |
| Admin manual darshan override, labeled | Done [Code][Test] |
| Wait-jump alert (daily vs previous report) | Done [Code][Test] |
| Map: OSM tiles + attribution (`MapExplorer.tsx:94`), filters, clusters, GPS with denied/timeout/unavailable states (`:212-228`, `:353`) | Done [Code] |
| Walking route via public OSRM foot server | Done [Code][Earlier, simulated GPS only] |
| Places: 66 total, 63 verified pins, 12 need review, 7 with photos, **56 without Telugu name** | Partial [DB] |
| Journey planner (device only) | Done [Code][Earlier] |
| Trip & Transport, 4 published categories, private provider data admin-only | Done [Code][DB] |
| About/Privacy/Terms/Contact, cookie notice, not-affiliated footer (`AppShell.tsx:63-71`) | Done [Code] |
| Voice assistant | Partial; never tested on a phone |
| Android install (manifest only) | Partial; no offline |
| Emergency / help numbers page | **Missing** |
| Accessibility / senior / wheelchair info | **Missing** (only a free-text admin field, `TransportAdmin.tsx:243`) |
| Sitemap, og:image | Missing [Code] |
| Email alerts, AdSense | Blocked (domain, publisher ID) |

## 2. Ranked issues
**P0 (misleading / safety)**
- "on a live map" in home card subtitle (`i18n.tsx:45`) — map isn't live data; reword.
- `/ttd` page title "Official TTD reports" (`routes/ttd.tsx:10`) can read like an official TTD page; rename to "Links to TTD's official reports".
- Walking routes have no visible safety note (night, steep steps, monkeys, crowd closures). OSRM routes over any OSM footway, including steps — unsafe for wheelchair users [Code: foot profile only].

**P1**
- 56 of 66 place names have no Telugu — Telugu-only users see English [DB].
- Public OSRM server has no uptime promise; when it fails the user has no fallback text [Code `routing.ts:27-29`].
- No offline/poor-network message; map tiles fail silently [Assume — not tested].
- TTD parser memory is per server instance; cold start + TTD down = "unavailable" [Code].
- No emergency page (police, ambulance, TTD helpline, lost-and-found).
- Many admin labels English-only [Earlier].

**P2**
- Ticker date shown raw `YYYY-MM-DD` (earlier audit, not re-checked).
- Unused admin crowd-level field still saved (`places.ts:88-92`).
- No admin warning when TTD wording changes and parsing fails.
- `min-h-screen` in `AppShell.tsx:60` instead of `min-h-dvh`.
- ETA uses OSRM walking speed; real Tirumala crowds/steps make it optimistic.

**P3**
- No sitemap; no og:image; some transport content falls back to English.

## 3. New-user journey (code-based; screen walkthrough not run today)
1. Opens in Telugu, sees hero + darshan card. Friction: "TTD report date" vs "checked at" vs "admin-entered" is three different labels — elderly users may not tell them apart.
2. Map: must grant location. If denied, a notice appears but there is no "pick your start point on the map" option — dead end for directions.
3. Place card: many names in English only.
4. Directions: route starts only with GPS; no step text, only a line. Low-literacy users need "walk toward X landmark".
5. Transport: helpline call buttons work; no "which bus do I take from here" guide.
6. Help/emergency: none — biggest dead end.
7. Language switch: in header, remembered [Earlier].

## 4. Map audit — top improvements
1. Safety + "routes are from OpenStreetMap, not checked by TTD" note on every route.
2. Manual start point when GPS is denied or inaccurate.
3. Telugu names for all places (admin task, real names only).
4. Clear "routing service busy, try again" + show straight distance labeled as "as the crow flies, not a path".
5. Review the 12 flagged places; the 3 unverified stay unpinned.
6. Do **not** offer "wheelchair route" until step-free paths are surveyed.

## 5. Accessibility and senior/disability features
| Idea | Pros | Cons / source needed | Verdict |
|---|---|---|---|
| Info page on TTD senior/disabled darshan rules | High value | Must quote official TTD page with date; rules change | Add now, source-linked |
| Wheelchair availability points | Useful | Needs official list; never invent | Later, only if sourced |
| Step-free route | Huge value | Needs ground survey; risk of harm | Don't add yet |
| Larger text toggle | Cheap, helps elderly | None | Add now |
| "Call for help" button | Simple | Only official numbers | Add now |
| Arrange priority darshan/escort | — | App cannot do it; misleading | Don't add |

Code checks still needed: icon-only button labels, focus rings, colour contrast of gold on silver — run a proper accessibility pass.

## 6. Backlog
| Item | Impact | Effort | Risk | Data needed | Rec |
|---|---|---|---|---|---|
| Fix P0 wording | High | XS | Low | None | Now |
| Route safety note | High | S | Low | None | Now |
| Emergency/help page | High | S | Med | Official numbers | Now |
| Telugu place names | High | M (admin) | Low | Real names | Now |
| Manual start point | High | M | Low | None | Now |
| Senior/disability info page | High | S | Med | TTD source | Now |
| Parser-failure admin alert | Med | S | Low | None | Later |
| Offline map shell | Med | L | Med | — | Later |
| Pilgrim count from TTD | Low | S | Low | TTD | Later |
| Turn-by-turn voice | Med | L | High | — | Don't yet |
| Live crowd | — | — | High | No source | Don't add |

## 7. Remove / simplify
- Remove unused crowd-level field from admin (confusing).
- Voice assistant: keep but hide behind "Try voice" until phone-tested.
- Journey planner: keep; low risk, but not core — don't expand.

## 8. TTD approval readiness
- Honest positioning: "Independent pilgrim guide using public TTD reports and OpenStreetMap."
- Checklist: no TTD logo/branding [Code: none found]; not-affiliated notice on every page [Code]; source + date on every figure [Code]; fix P0 wording; published site on own domain; privacy page [Code]; list of data sources; error/uptime record; real-phone test report; contact owner. Then a proposal letter.

## 9. Test plan / acceptance
- Unit: P0 wording keys; route-error message; manual start point.
- Browser at 360×640: every page in Telugu, no English place names where Telugu exists, no overflow.
- GPS denied → user can still get directions.
- OSRM blocked → clear message, no fake line.
- Real phone in Tirumala: GPS, route, voice (owner).

## 10. Roadmap
- **Phase 1 (small):** P0 wording, route safety note, emergency page, text-size toggle.
- **Phase 2:** Telugu place names, manual start point, routing error message, review 12 flagged places.
- **Phase 3:** senior/disability info from TTD, parser alert, ticker date format, remove crowd field.
- **Phase 4:** publish on domain, real-phone test, TTD proposal, AdSense.

## Not verified this turn
Live preview screens, phone performance, full accessibility scan, TTD/OSRM/TirumalaInfo availability today, each translation's wording quality, security scan results.
