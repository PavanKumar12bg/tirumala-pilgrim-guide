# Tirumala Pilgrim Guide

Build a polished mobile-first full-stack web app named "Tirumala Guide" for pilgrims visiting Tirumala. Start implementing now, not just planning.

LANGUAGES:
- Default language switcher prominently offers తెలుగు and English.
- Also support Tamil (தமிழ்), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Hindi (हिन्दी), and Odia (ଓଡ଼ିଆ). All visible UI text must change when a user selects a language, not just the language menu. Persist selected language. Use proper Unicode font fallbacks per script. Telugu should use Mandali for headings where available and Noto Sans Telugu for body; load Mandali from a reliable font source if possible and provide fallback. Use appropriate script fonts for Tamil, Kannada, Malayalam, Devanagari, and Odia; never render these languages in a Telugu font. Main languages are Telugu and English, with other five available under language selector.

DESIGN:
- Human-crafted, premium devotional/travel experience, not generic AI-template look. Mobile-first Android-friendly, fast, large tap targets, accessible contrast, clear hierarchy, tasteful motion.
- Use a refined palette inspired by ice silver #DDE3E8, deep aubergine #3A0F34, and marigold #EAAA00, with restrained temple-gold accents.
- Homepage has a prominent Lord Venkateswara hero image, Tirumala hills/temple imagery, announcement ticker, darshan waiting time and crowd status cards, a dedicated route-map card/button, and useful destination/facility cards. Show graceful placeholder art/icon for places without a photo, never broken images.
- Use the photos available in the conversation as visual guidance where possible, but do not claim they are uploaded into project assets unless actually attached. Admin must be able to upload/replace images later.

MAP:
- Build a dedicated Tirumala-only map experience using Leaflet and OpenStreetMap, not a static map screenshot. Initial viewport should frame Tirumala hill/temple town, restrict panning to a reasonable Tirumala-area boundary, show OSM attribution, GPS current-location control, destination search/dropdown, categorized markers, selected-place details, and route distance/estimated walking time UI.
- Use actual routable walking directions only if a real routing service/data is available. Do not fake a route or claim GPS routing works if not implemented. Include sensible unavailable/error states and manual destination selection fallback.
- Expected places/categories include Sri Venkateswara Swamy Temple, Adi Varahaswamy Temple, Pushkarini, ATC Circle, CRO Office, JEO Camp Office, Matrusri Tarigonda Vengamamba Annaprasada Bhavan, bus stands, parking, enquiry, pilgrim amenities, toilets/bathrooms, hospitals/medical shops, hotels/restaurants, and other verified useful places. Use one canonical place dataset for homepage cards and map markers. Never invent coordinates or names. If coordinates are not verified, flag as needing admin verification instead of placing a fabricated marker.
- Support Telugu and English place names/descriptions; admin can fill other languages later.

ADMIN:
- Create a separate protected admin route/panel with real authorization checks; a secret URL alone is not security. If backend auth is not configured, clearly mark setup required rather than pretending it is secure.
- Admin can edit announcement ticker, darshan waiting-time display, crowd status, destination name/description/category/coordinates, visibility, and images.
- Every place, including toilets and bathrooms, must work without a photo. Admin can upload a photo from phone, replace it, and remove it. Show a neutral category-specific placeholder until an image is uploaded.
- Image upload flow should store image files in object storage and URLs/metadata in the database, not as DB blobs. Compress/resize client-side to WebP, max dimension 1200px, aim around 100–250 KB and <=300 KB when practical without repeatedly recompressing originals.
- Do not expose admin editing to public users. Keep backend access rules secure.

IMPLEMENTATION:
- Build a coherent working first version with responsive pages, reusable components, language dictionary/i18n, place data model, map, homepage, and admin UI scaffold. Keep data and UI architecture maintainable. Do not seed fake live crowd/wait-time values; label sample/admin-set values clearly.
- Add metadata/accessibility and loading/empty/error states. Make the app feel like a finished product.
- Important: the user will later upload real Tirumala photos taken personally; design the admin image-upload workflow for adding these later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cdc15b59-64d1-4ddd-9cc4-8277e96ef936).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
