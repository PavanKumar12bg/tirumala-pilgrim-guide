# Tirumala Guide audit (read-only; nothing changed)

Evidence labels: **[Run]** = tested this turn, **[Code]** = code inspection only, **[Earlier]** = browser checks from earlier sessions, not repeated today.

## TTD source and parsing
- Source: `https://news.tirumala.org/wp-json/wp/v2/posts?search=Total%20pilgrims&per_page=3&orderby=date&order=desc` (TTD News WordPress API).
- How it works: the server downloads the 3 newest posts, reads the `<p>` text, and uses fixed text patterns (no AI) to find "Present Situation on DD-MM-YYYY", "Waiting Compartments..NN" and "Sarvadarshanam (without SSD Tokens)…X-Y H". It only accepts links from news.tirumala.org, skips reports dated in the future, and returns nothing if the date or wait time is missing.
- Real report fetched today **[Run]**: post "Total pilgrims who had darshan on 01-11-2026: 77,010". The text says: Tonsures 22,826; Hundi 4.13 Cr; Laddu 3.84 Lac; Aswini hospital 2,430; Present Situation on 02-11-2026: Waiting Compartments 06; Sarvadarshanam 4-6 H.
- What the app pulls out: date 2026-11-02, wait 4–6 hours, compartments 6. **It does not pull out the pilgrim count (77,010)** or the other figures.

## Implemented and verified
- All 37 automated tests pass across 9 files **[Run]**. They cover TTD parsing, the cache/failure fallback, i18n, voice commands, distances/routing, the journey planner and status history.
- Build OK **[Run]**.
- The parser handles today's real TTD wording, checked against the live API text **[Run]**.
- Home cards and the darshan page showed 4–6 h and 6 compartments with a source link **[Earlier]**.
- Shared header and ticker on Home, Map, Journey, Darshan and Admin; Telugu is the default; language choice is remembered **[Earlier]**.
- Map at 360 px: filters, grouped pins, real walking route from the OSRM foot profile, rerouting and arrival with simulated GPS **[Earlier]**.

## Present in code but not runtime-verified
- Refresh timing **[Code]**: the server caches a good result for 10 min and a failure for 1 min. The browser re-checks every 5 min while the app is open. The stale warning compares the report date with today's India date.
- On a failed fetch the last good report is kept with an "unavailable" note **[Code + unit test]**. That memory is per server instance only, so a cold start with TTD offline shows "unavailable".
- Real phone GPS, real walking, and speech recognition/voices on a phone in all 7 languages. These were never tested on a physical device.
- Android install on a real phone.
- Translations exist for all 7 languages, but many older admin labels are still English only.

## Confirmed bugs / gaps
1. The pilgrim count, tonsures and other TTD daily figures are not extracted, even though the source publishes them.
2. The ticker date is shown raw (`2026-11-02`) and not formatted for the language, unlike the cards.
3. If one TTD post changes its wording, the pattern returns nothing and the card says "unavailable". Nothing alerts the admin.
4. The old admin "crowd level" setting is still saved and kept in history but no longer shown publicly. This could confuse admins.
5. The API search term "Total pilgrims" depends on TTD keeping that post title.

## Missing features (AdSense readiness)
- No Privacy Policy, Terms, About, Contact or Disclaimer pages. The only pages are Home, Map, Journey, Darshan and Admin **[Run: route listing]**.
- No AdSense script, `ads.txt` or cookie/consent notice (needed for EEA/UK visitors).
- No footer links to policy pages. No disclaimer that this is not an official TTD site (important for a religious or trademark name).
- The content is thin: few pages with original text, which AdSense often rejects.
- The app is not published yet, and AdSense needs a live custom domain.

## Prioritized recommendations
1. Add About, Contact, Privacy, Terms and a "Not affiliated with TTD" disclaimer, linked in a footer, in all 7 languages.
2. Extract and show the pilgrim count and the other daily figures, labeled with the previous day's date.
3. Show a clear admin notice when the TTD report can't be read.
4. Format the ticker date for the selected language.
5. Remove or relabel the unused admin crowd-level field.
6. After publishing on a custom domain: add `ads.txt`, a consent banner and the AdSense script.
7. Test GPS, walking and voice on a real phone and report back.

## Tests run this turn
- `vitest`: 9 files, 37 passed, 0 failed.
- Live TTD API fetch: worked, with the values shown above.
- No browser tests were run today.
