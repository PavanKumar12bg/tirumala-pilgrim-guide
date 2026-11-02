import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, Upload, ImageOff, Loader2, Crosshair, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { announcementsQuery, CATEGORIES, IMAGE_BUCKET, placesQuery, statusQuery, type Localized, type Place } from "@/lib/places";
import { DICTS, LANGS, useI18n } from "@/lib/i18n";
import { isInsideTirumala } from "@/lib/geo";
import { compressToWebp } from "@/lib/image-compress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PlaceImage } from "@/components/PlaceImage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PhotoIdentifier, type PreparedPhoto } from "./PhotoIdentifier";
import { StatusHistory } from "./StatusHistory";

const selectCls = "h-11 w-full rounded-md border border-input bg-card px-3 text-base";

export function AdminPanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState("overview");
  const places = useQuery(placesQuery({ admin: true }));
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex h-auto min-h-12 w-full flex-wrap">
        <TabsTrigger value="overview" className="min-h-10">{t("overview")}</TabsTrigger>
        <TabsTrigger value="status" className="min-h-10">{t("statusTab")}</TabsTrigger>
        <TabsTrigger value="ticker" className="min-h-10">{t("announcements")}</TabsTrigger>
        <TabsTrigger value="places" className="min-h-10">{t("places")}</TabsTrigger>
        <TabsTrigger value="review" className="min-h-10">{t("reviewTab")}</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-6">
        <h1 className="text-2xl">{t("admin")} · {t("appName")}</h1>
        {places.isLoading ? <Loader2 className="mt-4 size-5 animate-spin" /> : places.isError ? <p role="alert" className="mt-4 text-destructive">{t("errorLoad")}</p> : <>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-4">
            {[
              { label: t("publicPlaces"), count: places.data?.filter((p) => p.visible).length ?? 0 },
              { label: t("verifiedPlaces"), count: places.data?.filter((p) => p.coords_verified && p.lat != null && p.lng != null).length ?? 0 },
              { label: t("missingPhotos"), count: places.data?.filter((p) => !p.image_path).length ?? 0 },
              { label: t("needsReview"), count: places.data?.filter((p) => p.needs_review || !p.coords_verified).length ?? 0 },
            ].map((stat) => <div key={stat.label}><dt className="text-sm text-muted-foreground">{stat.label}</dt><dd className="mt-1 font-display text-3xl text-primary">{stat.count}</dd></div>)}
          </dl>
          <div className="mt-5 flex flex-wrap gap-3"><Button className="min-h-12" onClick={() => setTab("places")}>{t("managePlaces")}</Button><Button variant="outline" className="min-h-12" onClick={() => setTab("review")}>{t("reviewPlaces")}</Button></div>
        </>}
      </TabsContent>
      <TabsContent value="status" className="mt-4"><StatusEditor /><div className="mt-6"><StatusHistory /></div></TabsContent>
      <TabsContent value="ticker" className="mt-4"><TickerEditor /></TabsContent>
      <TabsContent value="places" className="mt-4"><PlacesEditor mode="all" /></TabsContent>
      <TabsContent value="review" className="mt-4"><PlacesEditor mode="review" /></TabsContent>
    </Tabs>
  );
}

function LocalizedFields({ value, onChange, label, multiline }: { value: Localized; onChange: (v: Localized) => void; label: string; multiline?: boolean }) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const langs = showAll ? LANGS : LANGS.filter((l) => l.primary);
  const F = multiline ? Textarea : Input;
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      {langs.map((l) => (
        <div key={l.code} className="space-y-1">
          <Label className="text-xs text-muted-foreground" htmlFor={`${label}-${l.code}`}>{l.label}</Label>
          <F id={`${label}-${l.code}`} lang={l.code} value={value[l.code] ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, [l.code]: e.target.value })} className="text-base" />
        </div>
      ))}
      <Button type="button" variant="link" className="min-h-10 whitespace-normal px-0 text-xs" onClick={() => setShowAll(!showAll)}>
        {showAll ? t("collapse") : t("moreLanguages")}
      </Button>
    </fieldset>
  );
}

function StatusEditor() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(statusQuery());
  const [hours, setHours] = useState("");
  const [crowd, setCrowd] = useState("");
  const [note, setNote] = useState<Localized>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!data) return;
    setHours(data.darshan_wait_hours != null ? String(data.darshan_wait_hours) : "");
    setCrowd(data.crowd_level ?? "");
    setNote(data.darshan_note ?? {});
  }, [data]);

  const save = async () => {
    setBusy(true);
    const { data: saved, error } = await supabase.from("site_status").update({
      darshan_wait_hours: hours === "" ? null : Number(hours),
      crowd_level: crowd || null,
      darshan_note: note,
    }).eq("id", 1).select("id");
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!saved?.length) { toast.error(t("errorLoad")); return; }
    toast.success(t("statusSaved"));
    qc.invalidateQueries({ queryKey: ["site_status"] });
    qc.invalidateQueries({ queryKey: ["status-history"] });
  };

  if (isLoading) return <Loader2 className="size-5 animate-spin" />;
  return (
    <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-4 border-b pb-5">
      <p className="text-sm text-muted-foreground">{t("statusHelp")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hours">{t("darshanWait")} ({t("hours")})</Label>
          <Input id="hours" type="number" inputMode="decimal" min={0} max={72} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} className="h-11 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="crowd">{t("crowdStatus")}</Label>
          <select id="crowd" className={selectCls} value={crowd} onChange={(e) => setCrowd(e.target.value)}>
            <option value="">{t("unavailable")}</option>
            <option value="low">{t("crowd_low")}</option>
            <option value="moderate">{t("crowd_moderate")}</option>
            <option value="high">{t("crowd_high")}</option>
            <option value="very_high">{t("crowd_very_high")}</option>
          </select>
        </div>
      </div>
      <LocalizedFields label={t("details")} value={note} onChange={setNote} />
      <Button type="submit" disabled={busy} className="min-h-12">{busy ? <Loader2 className="size-4 animate-spin" /> : t("saveStatus")}</Button>
    </form>
  );
}

function TickerEditor() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(announcementsQuery());
  const [draft, setDraft] = useState<Localized>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState<Localized>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ["announcements"] });

  const add = async () => {
    if (!draft.te?.trim() && !draft.en?.trim()) { toast.error("Enter Telugu or English text"); return; }
    const { error } = await supabase.from("announcements").insert({ text: draft, sort_order: (data?.length ?? 0) + 1 });
    if (error) { toast.error(error.message); return; }
    setDraft({});
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-border">
        <LocalizedFields label={t("newAnnouncement")} value={draft} onChange={setDraft} />
        <Button onClick={add} className="min-h-12"><Plus className="size-4" />{t("newAnnouncement")}</Button>
      </div>
      {isLoading ? <Loader2 className="size-5 animate-spin" /> : null}
      {!isLoading && !data?.length ? <p className="text-sm text-muted-foreground">No announcements yet. Saved darshan and crowd updates still appear in the ticker.</p> : null}
      <ul className="space-y-2">
        {data?.map((a) => (
          <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-card p-3 ring-1 ring-border">
            <div className="min-w-0 flex-1 text-sm">
              <p lang="te">{a.text.te}</p>
              <p className="text-muted-foreground">{a.text.en}</p>
            </div>
            <div className="flex items-center gap-1"><Switch checked={a.active} aria-label={t("publish")} onCheckedChange={async (v) => { const { error } = await supabase.from("announcements").update({ active: v }).eq("id", a.id); if (error) toast.error(error.message); else refresh(); }} />
            <Button variant="ghost" size="sm" onClick={() => { setEditing(a.id); setEditText(a.text); }}>{t("edit")}</Button>
            <Button variant="ghost" size="icon" aria-label={t("remove")} onClick={async () => { const { error } = await supabase.from("announcements").delete().eq("id", a.id); if (error) toast.error(error.message); else refresh(); }}>
              <Trash2 className="size-4 text-destructive" />
            </Button></div>
            {editing === a.id ? <div className="col-span-2 space-y-2"><LocalizedFields label={t("announcements")} value={editText} onChange={setEditText} /><Button onClick={async () => { const { error } = await supabase.from("announcements").update({ text: editText }).eq("id", a.id); if (error) toast.error(error.message); else { setEditing(null); refresh(); } }}>{t("edit")}</Button><Button variant="ghost" onClick={() => setEditing(null)}>{t("close")}</Button></div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function issuesOf(p: Place) {
  const out: string[] = [];
  if (p.needs_review) out.push("Needs review");
  if (!p.coords_verified || p.lat == null) out.push("No verified location");
  else if (p.lng != null && !isInsideTirumala(p.lat, p.lng)) out.push("Location outside Tirumala area");
  if (!p.name.te?.trim()) out.push("No Telugu name");
  if (!p.name.en?.trim()) out.push("No English name");
  if (!p.image_path) out.push("No photo");
  if (!p.visible) out.push("Hidden");
  return out;
}

const REVIEW_FILTERS = ["All issues", "Needs review", "No verified location", "No Telugu name", "No photo", "Hidden"] as const;

function PlacesEditor({ mode }: { mode: "all" | "review" }) {
  const { data: all, isLoading, isError } = useQuery(placesQuery({ admin: true }));
  const [editing, setEditing] = useState<Place | "new" | null>(null);
  const [aiPhoto, setAiPhoto] = useState<PreparedPhoto | null>(null);
  const [filter, setFilter] = useState<(typeof REVIEW_FILTERS)[number]>("All issues");
  const [q, setQ] = useState("");
  const data = (all ?? []).filter((p) => {
    if (q && !Object.values(p.name).some((n) => n?.toLowerCase().includes(q.toLowerCase()))) return false;
    if (mode === "all") return true;
    const iss = issuesOf(p).filter((i) => i !== "No photo" || filter === "No photo");
    return filter === "All issues" ? iss.length > 0 : issuesOf(p).includes(filter);
  });
  return (
    <div className="space-y-3">
      {mode === "all" ? <PhotoIdentifier places={all ?? []} onUse={(p, ph) => { setAiPhoto(ph); setEditing(p); }} /> : null}
      {mode === "all" ? <Button onClick={() => setEditing("new")} className="min-h-12"><Plus className="size-4" /> Add place</Button> : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Places imported from your GeoJSON (OpenStreetMap) or added manually that need attention. “All issues” excludes missing photos; use the “No photo” filter for those.</p>
          <div className="flex flex-wrap gap-2">
            {REVIEW_FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`min-h-10 rounded-full px-3 text-sm ring-1 ${filter === f ? "bg-primary text-primary-foreground ring-primary" : "ring-border"}`}>{f}</button>
            ))}
          </div>
        </div>
      )}
      <Input placeholder="Search places" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 text-base" aria-label="Search places" />
      <p className="text-xs text-muted-foreground">{data.length} place(s)</p>
      {isLoading ? <Loader2 className="size-5 animate-spin" /> : null}
      {isError ? <p className="text-sm text-destructive">Could not load places.</p> : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {data?.map((p) => (
          <li key={p.id}>
            <button onClick={() => setEditing(p)} className="flex w-full items-center gap-3 rounded-xl bg-card p-2 text-left ring-1 ring-border hover:ring-primary">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg"><PlaceImage src={p.imageSrc} category={p.category} alt={p.name.en ?? ""} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold" lang="te">{p.name.te || p.name.en}</p>
                <p className="truncate text-sm text-muted-foreground">{p.name.en}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary">{DICTS.en[`cat_${p.category}` as keyof typeof DICTS.en] ?? p.category}</Badge>
                  {p.coords_verified && p.lat != null ? <Badge variant="outline">On map</Badge> : <Badge variant="destructive">Needs location</Badge>}
                  {p.osm_id ? <Badge variant="outline">OSM</Badge> : null}
                  {mode === "review" ? issuesOf(p).filter((i) => !i.includes("location")).map((i) => <Badge key={i} variant="secondary">{i}</Badge>) : null}
                  {mode === "all" && !p.visible ? <Badge variant="outline">Hidden</Badge> : null}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setAiPhoto(null); } }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{editing === "new" ? "New place" : "Edit place"}</SheetTitle></SheetHeader>
          {editing ? <PlaceForm key={editing === "new" ? "new" : editing.id} place={editing === "new" ? null : editing} initialPhoto={aiPhoto} onDone={() => { setEditing(null); setAiPhoto(null); }} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `place-${Date.now()}`;
}

function PlaceForm({ place, onDone, initialPhoto }: { place: Place | null; onDone: () => void; initialPhoto?: PreparedPhoto | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState<Localized>(place?.name ?? {});
  const [desc, setDesc] = useState<Localized>(place?.description ?? {});
  const [category, setCategory] = useState(place?.category ?? "amenity");
  const [lat, setLat] = useState(place?.lat != null ? String(place.lat) : "");
  const [lng, setLng] = useState(place?.lng != null ? String(place.lng) : "");
  const [verified, setVerified] = useState(place?.coords_verified ?? false);
  const [visible, setVisible] = useState(place?.visible ?? true);
  const [featured, setFeatured] = useState(place?.featured ?? false);
  const [review, setReview] = useState(place?.needs_review ?? false);
  const [pending, setPending] = useState<PreparedPhoto | null>(place ? initialPhoto ?? null : null);
  const [sort, setSort] = useState(String(place?.sort_order ?? 100));
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [imageSrc, setImageSrc] = useState(place?.imageSrc ?? null);
  const [imagePath, setImagePath] = useState(place?.image_path ?? null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["places"] });

  const save = async () => {
    if (!name.te?.trim() && !name.en?.trim()) { toast.error("Enter a Telugu or English name"); return; }
    const latN = lat === "" ? null : Number(lat);
    const lngN = lng === "" ? null : Number(lng);
    if ((latN == null) !== (lngN == null)) { toast.error("Enter both latitude and longitude, or neither"); return; }
    if (verified && latN == null) { toast.error("Cannot mark as verified without coordinates"); return; }
    if (latN != null && lngN != null && (!Number.isFinite(latN) || !Number.isFinite(lngN) || !isInsideTirumala(latN, lngN))) { toast.error("Coordinates must be numbers inside the Tirumala map area (latitude ≈ 13.6–13.75, longitude ≈ 79.31–79.47)"); return; }
    setBusy(true);
    const row = { name, description: desc, category, lat: latN, lng: lngN, coords_verified: verified && latN != null, coords_source: latN == null ? null : latN === place?.lat && lngN === place?.lng ? place?.coords_source ?? "admin" : "admin", needs_review: review, visible, featured, sort_order: Number(sort) || 100 };
    const { error } = place
      ? await supabase.from("places").update(row).eq("id", place.id)
      : await supabase.from("places").insert({ ...row, slug: slugify(name.en || name.te || "") + "-" + Math.random().toString(36).slice(2, 6) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    refresh();
    onDone();
  };

  const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];
  const prepare = async (file: File) => {
    if (!ACCEPT.includes(file.type) && !/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name)) { toast.error("Please choose a JPG, PNG, WebP or HEIC photo"); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("Photo is larger than 25 MB"); return; }
    setImgBusy(true);
    try {
      const out = await compressToWebp(file);
      if (out.blob.size > 1024 * 1024) throw new Error("Compressed photo is still over 1 MB");
      if (pending) URL.revokeObjectURL(pending.url);
      setPending({ ...out, url: URL.createObjectURL(out.blob) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read this photo (HEIC may not be supported by this browser)");
    }
    setImgBusy(false);
  };

  const upload = async () => {
    if (!place || !pending) return;
    setImgBusy(true);
    try {
      const { blob, width, height } = pending;
      const path = `${place.id}/${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: "image/webp" });
      if (upErr) throw upErr;
      const { error } = await supabase.from("places").update({ image_path: path, image_width: width, image_height: height, image_bytes: blob.size }).eq("id", place.id);
      if (error) throw error;
      if (imagePath) await supabase.storage.from(IMAGE_BUCKET).remove([imagePath]);
      setImagePath(path);
      setImageSrc(pending.url);
      setPending(null);
      toast.success(`Photo saved (${Math.round(blob.size / 1024)} KB, ${width}×${height})`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
    setImgBusy(false);
  };

  const removeImage = async () => {
    if (!place || !imagePath) return;
    if (!confirm("Remove this photo? The place will show its category placeholder.")) return;
    setImgBusy(true);
    await supabase.storage.from(IMAGE_BUCKET).remove([imagePath]);
    const { error } = await supabase.from("places").update({ image_path: null, image_width: null, image_height: null, image_bytes: null }).eq("id", place.id);
    setImgBusy(false);
    if (error) { toast.error(error.message); return; }
    setImagePath(null);
    setImageSrc(null);
    refresh();
  };

  const useGps = () => navigator.geolocation?.getCurrentPosition(
    (p) => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); toast.success("Filled from your current GPS position"); },
    () => toast.error("Could not get GPS position"),
    { enableHighAccuracy: true },
  );

  return (
    <div className="space-y-5 px-4 pb-10">
      <section className="space-y-2">
        <p className="text-sm font-semibold">Photo</p>
        <div className="aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-border">
          <PlaceImage src={pending?.url ?? imageSrc} category={category} alt={name.en ?? ""} />
        </div>
        {pending ? (
          <div className="space-y-2 rounded-xl bg-accent/20 p-3">
            <p className="text-sm font-semibold">Preview — not saved yet</p>
            <p className="text-xs text-muted-foreground">WebP · {pending.width}×{pending.height} · {Math.round(pending.blob.size / 1024)} KB{pending.blob.size > 300 * 1024 ? " (above 300 KB target)" : ""}</p>
            <div className="flex gap-2">
              <Button className="min-h-12 flex-1" onClick={upload} disabled={imgBusy}>{imgBusy ? <Loader2 className="size-4 animate-spin" /> : imagePath ? "Save & replace photo" : "Save photo"}</Button>
              <Button variant="outline" className="min-h-12" onClick={() => { URL.revokeObjectURL(pending.url); setPending(null); }} disabled={imgBusy}>Cancel</Button>
            </div>
          </div>
        ) : place ? (
          <div className="flex gap-2">
            <label className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
              {imgBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {imagePath ? "Choose new photo" : "Choose photo"}
              <input type="file" accept="image/*" className="sr-only" disabled={imgBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void prepare(f); e.target.value = ""; }} />
            </label>
            {imagePath ? <Button variant="outline" className="min-h-12" onClick={removeImage} disabled={imgBusy}><ImageOff className="size-4" /> Remove</Button> : null}
          </div>
        ) : <p className="text-xs text-muted-foreground">Save the place first, then add a photo.</p>}
        <p className="text-xs text-muted-foreground">Photos are resized to 1200px and converted to WebP (~100–250 KB) on your phone before upload.</p>
      </section>

      <LocalizedFields label="Name" value={name} onChange={setName} />
      <LocalizedFields label="Description" value={desc} onChange={setDesc} multiline />

      <div className="space-y-1.5">
        <Label htmlFor="cat">Category</Label>
        <select id="cat" className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {DICTS.en[`cat_${c.id}` as keyof typeof DICTS.en]}</option>)}
        </select>
      </div>

      <fieldset className="space-y-2 rounded-xl bg-muted/60 p-3">
        <legend className="text-sm font-semibold">Location</legend>
        <div className="grid grid-cols-2 gap-2">
          <div><Label htmlFor="lat" className="text-xs">Latitude</Label><Input id="lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} className="h-11 text-base" /></div>
          <div><Label htmlFor="lng" className="text-xs">Longitude</Label><Input id="lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} className="h-11 text-base" /></div>
        </div>
        <Button type="button" variant="outline" className="min-h-11 w-full" onClick={useGps}><Crosshair className="size-4" /> Use my current GPS position</Button>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>Coordinates verified (shows marker on public map)</span>
          <Switch checked={verified} onCheckedChange={setVerified} />
        </label>
      </fieldset>

      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2">{visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />} Visible to public</span>
        <Switch checked={visible} onCheckedChange={setVisible} />
      </label>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>Needs admin review</span>
        <Switch checked={review} onCheckedChange={setReview} />
      </label>
      {place?.osm_id ? (
        <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Imported from GeoJSON · {place.osm_id}</p>
          {place.coords_source ? <p>Coordinates source: {place.coords_source}</p> : null}
          {Object.entries(place.osm_tags ?? {}).map(([k, v]) => <p key={k}>{k}: {v}</p>)}
        </div>
      ) : null}
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>Featured</span>
        <Switch checked={featured} onCheckedChange={setFeatured} />
      </label>
      <div className="space-y-1.5">
        <Label htmlFor="sort">Sort order (lower first)</Label>
        <Input id="sort" type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 text-base" />
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={busy} className="min-h-12 flex-1">{busy ? <Loader2 className="size-4 animate-spin" /> : "Save"}</Button>
        {place ? (
          <Button variant="outline" className="min-h-12 text-destructive" onClick={async () => {
            if (!confirm("Delete this place permanently?")) return;
            if (imagePath) await supabase.storage.from(IMAGE_BUCKET).remove([imagePath]);
            const { error } = await supabase.from("places").delete().eq("id", place.id);
            if (error) { toast.error(error.message); return; }
            refresh();
            onDone();
          }}><Trash2 className="size-4" /></Button>
        ) : null}
      </div>
    </div>
  );
}
