# Trip & Transport — audit and plan (nothing changed yet)

## A. What exists today (from inspection)
- **Navigation:** phone bottom bar has 3 items (Home, Map, Journey) in `AppShell.BottomNav`; desktop header shows Journey. Pages: index, map, journey, darshan, ttd, about, privacy, terms, contact, admin.
- **Admin:** `/admin` (client-only), email sign-in, access via `user_roles` + `has_role()`; tabs Overview, Status, Announcements, Places, Review.
- **Data patterns to reuse:** multilingual text stored as `jsonb` per language (`places.name`, `announcements.text`) and read with `pickLocalized`; `visible` / `sort_order` columns; admin-only write policies `has_role(auth.uid(),'admin')`; private `place-images` bucket with signed URLs and WebP compression; `places` table with verified coordinates for map pins.
- **Gap:** no table today can hold private fields safely — every public table is readable column-wide by anyone who passes its row policy. So private provider data must live in a **separate admin-only table**, not hidden columns.

## B. User flow and templates
```text
Bottom bar "Trip & Transport" -> /transport  (grid of published category cards)
  -> /transport/$slug  (layout chosen by the category's template)
       -> /transport/$slug/stop/$stopId  (destination detail, packages only)
```
Bottom bar becomes 4 items: Home, Map, Trip & Transport, Journey.

Fixed set of templates (code-defined, type-checked); admin picks one per category and can switch sections on/off and rename them:
1. **Package** — package intro; ordered destination list (name, photos, short text, map pin only if linked to a verified place, visit duration, access/operating notes, route distance only via the existing walking-route engine or when admin enters a sourced value); "Offered by" list of linked approved providers.
2. **Route guide** (Tirupati to Tirumala) — options (road / bus / footpath) each with boarding points, route notes, fares, timing notes, official link; providers only if admin links them.
3. **Bus routes** (Free buses) — routes with ordered stop list, map line where stops are verified places, service notes, a fixed notice "No live bus positions or arrival times are available".
4. **Pickup providers** (Bus stand / railway) — pickup points + linked approved providers.
5. **Help & info** (Senior citizen assistance) — eligibility, assistance notes, official contacts and sources.
Every template also shows "Source" link(s) and "Last verified" date. New categories reuse any template — no code change needed. Adding a truly new layout later = adding one template in code.

## C. Additive database changes (all new; existing tables/policies untouched)
| Table | Purpose | Public can read |
|---|---|---|
| `transport_categories` | slug, template, title/description (jsonb per language), icon, image_path, status (draft/published/archived), sort_order, `sections` jsonb (template settings), sources jsonb, last_verified_on | only `status='published'` |
| `transport_items` | entries inside a category: destination / route option / bus route / stop / help note; kind, title, body, photos, optional `place_id` (map), duration, notes, fare_text, sort_order, published | only if published AND parent category published |
| `transport_providers` | public profile: display name, vehicle type, capacity, public phone, service area, status (pending/approved/suspended), active | only approved AND active AND linked to a live offer |
| `transport_provider_private` | 1-to-1: commission, agreement notes, private phone, internal notes | **never** (admin only, no anon grant) |
| `transport_offers` | provider ↔ category (optional item/package): price text, included places, duration, inclusions, exclusions, extra charges, published | only published + provider approved/active + category published |

Rules:
- Writes on all five: `has_role(auth.uid(),'admin')` only. GRANTs: `anon` SELECT only on the four public tables; `transport_provider_private` granted to `authenticated` + policy admin-only.
- Public pages read through one server function that selects an explicit column list (no `*`) with the public key, so even a future column added by mistake is not sent.
- Validation trigger: offers can only be published when the provider is approved (time-independent rules stay as CHECKs, e.g. status values).
- Photos reuse the private `place-images` bucket under a `transport/` folder, same admin-only upload policy.
- Prices/fares are free text with source + date, not computed numbers.

## D. Admin screens (new "Transport" tab in existing admin)
- **Categories:** list with drag/up-down order, publish/unpublish/archive, create/edit (title & description in 7 languages, icon, image, template, section toggles/labels, sources, last verified date).
- **Items inside a category:** add/edit/reorder destinations, route options, bus routes & stops, help notes; link to an existing place for the map; photos.
- **Providers:** add/edit, approve/suspend, active toggle, public fields; separate "Private" panel (commission, agreement, notes).
- **Offers:** link a provider to a category/package with price and terms; publish toggle; warning if provider not approved.
- Preview button opens the public page.

## E. Official sources — what was confirmed today
Read on tirumala.org (pages show no "last updated" date, so every fact gets saved with source URL + today's check date):
- Two stone footpaths (Sopanamargas): from **Alipiri** and from **Srivari Mettu**.
- Two ghat roads: up road about **17.80 km**, down road about **18.00 km**.
- **Dharmarathams:** TTD free buses inside Tirumala, about every **8 minutes**, clockwise and anticlockwise, circular route past cottages.
- Tirupati: **3 free TTD buses** railway station to Srivari Mettu, **18 trips every 45 min, 5 am–6:15 pm**, last trip from Srivari Mettu **7:15 pm**; APSRTC free buses railway station to Alipiri (mentioned on Transport Facilities page).
Not confirmed (will NOT be seeded): fares for Tirupati–Tirumala buses, full free-bus stop lists, live bus data (no official feed found), package prices, any provider/driver/phone, opening hours or distances for Kapila Theertham, Akasa Ganga, Papavinasanam, Srivari Padalu, senior-citizen assistance rules (page not yet checked — will check before seeding or leave empty).
Suggestion: seed the 5 categories as **drafts** containing only the facts above, so you review before publishing.

## F. Steps, tests, risks
Steps: 1) migration (5 tables, grants, RLS, trigger) 2) public server function + query options 3) `/transport` list + `$slug` page with 5 template renderers + stop detail 4) bottom bar + header link + translations (7 languages for app labels; admin content in languages you fill, falling back to English) 5) admin Transport tab 6) draft seed 7) tests + mobile check.

Tests:
- Signed-out request to `transport_provider_private` returns no rows / permission error.
- Public fetch never contains commission, private phone, notes keys.
- Pending, suspended or inactive provider and unpublished offer are absent from public pages.
- Draft/archived categories and unpublished items return 404/hidden.
- Provider linked to package A does not appear in package B or Tirupati-to-Tirumala.
- Call button uses `tel:` with the public number only.
- Bus page shows "no live data" notice; no times invented.
- Non-admin signed-in user cannot insert/update any table.
- 360px layout: no sideways scroll, 4-item bottom bar fits in all 7 languages.

Risks: the free-text `sections` settings can drift from templates (validated in code with a schema, unknown keys ignored); 4 bottom items with long Telugu/Malayalam labels may be tight (short labels); listing private operators carries trust/legal responsibility for you; official pages may change without dates.

## G. Decisions needed from you
1. Bottom bar: replace or add? (Plan: add as 4th item, keep Journey.)
2. Should providers be able to sign up themselves, or only you add them? (Plan: only admin adds — no provider accounts.)
3. Show an "Approved by Tirumala Guide" label on providers, or just "Offered by"? (Plan: "Offered by" + disclaimer that the guide doesn't verify or book.)
4. Seed the 5 example categories as drafts with only the confirmed facts? (Plan: yes.)
5. Should admin content be entered in all 7 languages or Telugu + English only?
