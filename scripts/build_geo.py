"""Convert the uploaded Overpass GeoJSON (EPSG:4326, [lon, lat]) into:
  1. public/data/tirumala-map.json  – compact map layers in Leaflet [lat, lng] order
  2. /tmp/places_import.sql          – idempotent upsert of named POIs keyed by OSM id
Run: python3 scripts/build_geo.py <path-to-geojson>
"""
import json, sys

SRC = sys.argv[1]
d = json.load(open(SRC))
BBOX = (13.55, 13.80, 79.25, 79.50)  # generous sanity box around Tirumala

def ok(lon, lat):
    return BBOX[0] <= lat <= BBOX[1] and BBOX[2] <= lon <= BBOX[3]

def ll(pt):  # GeoJSON [lon, lat] -> Leaflet [lat, lng]
    lon, lat = pt[0], pt[1]
    return [round(lat, 6), round(lon, 6)]

stats = {"total": 0, "skipped_invalid": 0, "duplicates": 0, "unsupported": 0}
seen = set()
roads, buildings, water, wood = [], [], [], []
pois = []

for f in d["features"]:
    stats["total"] += 1
    g = f.get("geometry") or {}
    p = f.get("properties") or {}
    fid = p.get("@id") or f.get("id")
    if not fid or fid in seen:
        stats["duplicates"] += 1; continue
    seen.add(fid)
    t = g.get("type")
    if t == "LineString":
        pts = g.get("coordinates") or []
        if len(pts) < 2 or not all(ok(*c[:2]) for c in pts):
            stats["skipped_invalid"] += 1; continue
        if "highway" in p:
            r = {"h": p["highway"], "c": [ll(c) for c in pts]}
            if p.get("name"): r["n"] = p["name"]
            if p.get("name:te"): r["te"] = p["name:te"]
            roads.append(r)
    elif t == "Polygon":
        ring = (g.get("coordinates") or [[]])[0]
        if len(ring) < 4 or not all(ok(*c[:2]) for c in ring):
            stats["skipped_invalid"] += 1; continue
        poly = [ll(c) for c in ring]
        if p.get("natural") == "water": water.append(poly)
        elif p.get("natural") in ("wood", "scrub") and p.get("amenity") != "parking": wood.append(poly)
        elif "building" in p or p.get("amenity") == "parking": buildings.append(poly)
        named = p.get("name") or p.get("amenity") == "parking" or p.get("building") == "transportation"
        if named:
            pts = ring[:-1]
            lon = sum(c[0] for c in pts) / len(pts); lat = sum(c[1] for c in pts) / len(pts)
            pois.append((fid, p, round(lat, 6), round(lon, 6)))
    else:
        stats["unsupported"] += 1

json.dump({"source": d.get("copyright"), "generated": d.get("timestamp"), "roads": roads, "buildings": buildings, "water": water, "wood": wood},
          open("public/data/tirumala-map.json", "w"), separators=(",", ":"), ensure_ascii=False)

def classify(p):
    n = (p.get("name") or "").lower()
    a, b = p.get("amenity"), p.get("building")
    if p.get("tourism") == "hotel": return "hotel", False
    if a == "place_of_worship" or b == "temple": return "temple", False
    if a == "parking": return "parking", False
    if a == "social_facility" and "annaprasada" in n: return "food", False
    if "cro" in n and "reception" in n: return "office", False
    if "laddu" in n: return "food", False
    if "waiting hall" in n or "queue complex" in n or "cell phone" in n or "token" in n or "tokan" in n: return "amenity", False
    if p.get("natural") == "water": return "landmark", False
    if "statue" in n: return "landmark", False
    if a == "police": return "office", False
    if b == "transportation": return "transport", True   # unnamed; needs confirmation it is the bus station
    return "other", True  # unclear – admin review

# Map existing seeded slugs to OSM features so we update instead of duplicating
EXISTING = {"way/362777815": "sri-venkateswara-temple", "way/1548291853": "swami-pushkarini",
            "way/360048241": "annaprasadam-bhavan", "way/362927173": "cro-office"}

def q(s): return "'" + s.replace("'", "''") + "'"
rows, updates = [], []
for i, (fid, p, lat, lon) in enumerate(pois):
    cat, review = classify(p)
    name = {}
    if p.get("name"): name["en"] = p["name"]
    for k in ("te", "ta", "kn", "hi", "ml", "or"):
        if p.get(f"name:{k}"): name[k] = p[f"name:{k}"]
    tags = {k: v for k, v in p.items() if k != "@id"}
    if not name:  # no name in data – keep generic tag-derived label, hide until reviewed
        label = {"parking": "Parking area (unnamed in OSM)", "transport": "Transport building (unnamed in OSM)"}[cat]
        name = {"en": label}; review = True
    visible = not (review and not p.get("name"))
    if fid in EXISTING:
        updates.append(f"update public.places set osm_id={q(fid)}, osm_tags={q(json.dumps(tags, ensure_ascii=False))}::jsonb, lat={lat}, lng={lon}, coords_verified=true, coords_source='osm', needs_review=false where slug={q(EXISTING[fid])};")
        continue
    slug = "osm-" + fid.replace("/", "-")
    rows.append(f"({q(slug)},{q(fid)},{q(cat)},{q(json.dumps(name, ensure_ascii=False))}::jsonb,{lat},{lon},true,'osm',{str(review).lower()},{str(visible).lower()},{200+i},{q(json.dumps(tags, ensure_ascii=False))}::jsonb)")

sql = "\n".join(updates) + "\ninsert into public.places (slug, osm_id, category, name, lat, lng, coords_verified, coords_source, needs_review, visible, sort_order, osm_tags) values\n" + ",\n".join(rows) + "\non conflict (osm_id) do update set osm_tags = excluded.osm_tags, lat = excluded.lat, lng = excluded.lng;\n"
open("/tmp/places_import.sql", "w").write(sql)
stats.update(roads=len(roads), buildings=len(buildings), water=len(water), wood=len(wood), pois=len(pois), new_places=len(rows), updated=len(updates))
print(json.dumps(stats))
