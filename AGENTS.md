<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Tirumala Guide architecture
- One canonical `places` table feeds both homepage cards and map markers; markers render only when `coords_verified` is true, so unverified places never get fabricated pins.
- UI strings live in `src/lib/i18n.tsx` dictionaries (one per language); per-script fonts are switched via `html:lang()` CSS vars in `src/styles.css`.
- Place photos live in the private `place-images` bucket (workspace blocks public buckets) and are shown via signed URLs; DB stores only path/metadata.
- Admin rights come from `user_roles` + `has_role()`; RLS enforces writes. `claim_first_admin()` only works while no admin exists.
- In-app walking routes come from the keyless FOSSGIS OSRM foot profile (`src/lib/routing.ts`); never draw straight-line routes or open external navigation, and keep re-route requests rate-limited via `NAV_CONFIG`.
- Map layers and place imports are generated from the uploaded OSM GeoJSON by `scripts/build_geo.py` (converts [lon,lat] to [lat,lng]); places are keyed by unique `osm_id` so re-imports update rather than duplicate.
- AI photo identification runs only in the admin-checked server function `src/lib/photo-identify.functions.ts` (model call in `photo-identify.server.ts`); the AI only suggests a place id from existing records and the admin confirms before any save.
- Map markers declutter with a built-in screen-grid clustering in `MapExplorer` (no plugin); floating map controls live in the same bottom stack as the place card so they cannot overlap it.
- The public journey planner stores validated personal itineraries on the current device and references canonical place IDs; arrival plans are manually entered rather than invented travel estimates.
- Home status cards and ticker consume the same site-status record; only stored, admin-entered values appear, with their update timestamp, so announcements cannot masquerade as an automated live feed.
- TopBar owns the persistent announcement ticker on public and admin pages; map height is flex-allocated and observed for Leaflet resizing to avoid content overlap.
- Every site-status save appends a database-triggered, admin-readable history snapshot; trends use latest actual saves per India-calendar day without filling missing days.
- Browser voice is a one-utterance progressive enhancement with editable transcript and controlled commands; device recognition/voices are not guaranteed and text remains usable. Proposed navigation selects a place but still requires Start Navigation.
