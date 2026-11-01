import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, Upload, ImageOff, Loader2, Crosshair, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { announcementsQuery, CATEGORIES, IMAGE_BUCKET, placesQuery, statusQuery, type Localized, type Place } from "@/lib/places";
import { DICTS, LANGS } from "@/lib/i18n";
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

const selectCls = "h-11 w-full rounded-md border border-input bg-card px-3 text-base";

export function AdminPanel() {
  return (
    <Tabs defaultValue="status">
      <TabsList className="grid h-12 w-full grid-cols-3">
        <TabsTrigger value="status" className="min-h-10">Status</TabsTrigger>
        <TabsTrigger value="ticker" className="min-h-10">Ticker</TabsTrigger>
        <TabsTrigger value="places" className="min-h-10">Places</TabsTrigger>
      </TabsList>
      <TabsContent value="status" className="mt-4"><StatusEditor /></TabsContent>
      <TabsContent value="ticker" className="mt-4"><TickerEditor /></TabsContent>
      <TabsContent value="places" className="mt-4"><PlacesEditor /></TabsContent>
    </Tabs>
  );
}

function LocalizedFields({ value, onChange, label, multiline }: { value: Localized; onChange: (v: Localized) => void; label: string; multiline?: boolean }) {
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
      <button type="button" className="min-h-10 text-xs text-primary underline-offset-4 hover:underline" onClick={() => setShowAll(!showAll)}>
        {showAll ? "Show Telugu & English only" : "Add other languages (Tamil, Kannada, Malayalam, Hindi, Odia)"}
      </button>
    </fieldset>
  );
}

function StatusEditor() {
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
    const { error } = await supabase.from("site_status").update({
      darshan_wait_hours: hours === "" ? null : Number(hours),
      crowd_level: crowd || null,
      darshan_note: note,
    }).eq("id", 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["site_status"] });
  };

  if (isLoading) return <Loader2 className="size-5 animate-spin" />;
  return (
    <div className="space-y-4 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-border">
      <p className="text-sm text-muted-foreground">These values are shown publicly as “set by admin”, with the update time. Leave empty to show “Not updated yet”.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hours">Darshan waiting time (hours)</Label>
          <Input id="hours" type="number" inputMode="decimal" min={0} max={72} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} className="h-11 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="crowd">Crowd status</Label>
          <select id="crowd" className={selectCls} value={crowd} onChange={(e) => setCrowd(e.target.value)}>
            <option value="">Not set</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">Heavy</option>
            <option value="very_high">Very heavy</option>
          </select>
        </div>
      </div>
      <LocalizedFields label="Short note (optional, e.g. which darshan type)" value={note} onChange={setNote} />
      <Button onClick={save} disabled={busy} className="min-h-12">{busy ? <Loader2 className="size-4 animate-spin" /> : "Save status"}</Button>
    </div>
  );
}

function TickerEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(announcementsQuery());
  const [draft, setDraft] = useState<Localized>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ["announcements"] });

  const add = async () => {
    if (!draft.te?.trim() && !draft.en?.trim()) return toast.error("Enter Telugu or English text");
    const { error } = await supabase.from("announcements").insert({ text: draft, sort_order: (data?.length ?? 0) + 1 });
    if (error) return toast.error(error.message);
    setDraft({});
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-border">
        <LocalizedFields label="New announcement" value={draft} onChange={setDraft} />
        <Button onClick={add} className="min-h-12"><Plus className="size-4" /> Add to ticker</Button>
      </div>
      {isLoading ? <Loader2 className="size-5 animate-spin" /> : null}
      {!isLoading && !data?.length ? <p className="text-sm text-muted-foreground">No announcements yet. The ticker is hidden until you add one.</p> : null}
      <ul className="space-y-2">
        {data?.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-border">
            <div className="min-w-0 flex-1 text-sm">
              <p lang="te">{a.text.te}</p>
              <p className="text-muted-foreground">{a.text.en}</p>
            </div>
            <Switch checked={a.active} aria-label="Active" onCheckedChange={async (v) => { await supabase.from("announcements").update({ active: v }).eq("id", a.id); refresh(); }} />
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={async () => { await supabase.from("announcements").delete().eq("id", a.id); refresh(); }}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlacesEditor() {
  const { data, isLoading, isError } = useQuery(placesQuery({ admin: true }));
  const [editing, setEditing] = useState<Place | "new" | null>(null);
  return (
    <div className="space-y-3">
      <Button onClick={() => setEditing("new")} className="min-h-12"><Plus className="size-4" /> Add place</Button>
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
                  {!p.visible ? <Badge variant="outline">Hidden</Badge> : null}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{editing === "new" ? "New place" : "Edit place"}</SheetTitle></SheetHeader>
          {editing ? <PlaceForm key={editing === "new" ? "new" : editing.id} place={editing === "new" ? null : editing} onDone={() => setEditing(null)} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `place-${Date.now()}`;
}

function PlaceForm({ place, onDone }: { place: Place | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState<Localized>(place?.name ?? {});
  const [desc, setDesc] = useState<Localized>(place?.description ?? {});
  const [category, setCategory] = useState(place?.category ?? "amenity");
  const [lat, setLat] = useState(place?.lat != null ? String(place.lat) : "");
  const [lng, setLng] = useState(place?.lng != null ? String(place.lng) : "");
  const [verified, setVerified] = useState(place?.coords_verified ?? false);
  const [visible, setVisible] = useState(place?.visible ?? true);
  const [featured, setFeatured] = useState(place?.featured ?? false);
  const [sort, setSort] = useState(String(place?.sort_order ?? 100));
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [imageSrc, setImageSrc] = useState(place?.imageSrc ?? null);
  const [imagePath, setImagePath] = useState(place?.image_path ?? null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["places"] });

  const save = async () => {
    if (!name.te?.trim() && !name.en?.trim()) return toast.error("Enter a Telugu or English name");
    const latN = lat === "" ? null : Number(lat);
    const lngN = lng === "" ? null : Number(lng);
    if ((latN == null) !== (lngN == null)) return toast.error("Enter both latitude and longitude, or neither");
    if (verified && latN == null) return toast.error("Cannot mark as verified without coordinates");
    setBusy(true);
    const row = { name, description: desc, category, lat: latN, lng: lngN, coords_verified: verified && latN != null, visible, featured, sort_order: Number(sort) || 100 };
    const { error } = place
      ? await supabase.from("places").update(row).eq("id", place.id)
      : await supabase.from("places").insert({ ...row, slug: slugify(name.en || name.te || "") + "-" + Math.random().toString(36).slice(2, 6) });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    refresh();
    onDone();
  };

  const upload = async (file: File) => {
    if (!place) return;
    setImgBusy(true);
    try {
      const { blob, width, height } = await compressToWebp(file);
      const path = `${place.id}/${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: "image/webp" });
      if (upErr) throw upErr;
      const { error } = await supabase.from("places").update({ image_path: path, image_width: width, image_height: height, image_bytes: blob.size }).eq("id", place.id);
      if (error) throw error;
      if (imagePath) await supabase.storage.from(IMAGE_BUCKET).remove([imagePath]);
      setImagePath(path);
      setImageSrc(URL.createObjectURL(blob));
      toast.success(`Photo saved (${Math.round(blob.size / 1024)} KB, ${width}×${height})`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
    setImgBusy(false);
  };

  const removeImage = async () => {
    if (!place || !imagePath) return;
    setImgBusy(true);
    await supabase.storage.from(IMAGE_BUCKET).remove([imagePath]);
    const { error } = await supabase.from("places").update({ image_path: null, image_width: null, image_height: null, image_bytes: null }).eq("id", place.id);
    setImgBusy(false);
    if (error) return toast.error(error.message);
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
          <PlaceImage src={imageSrc} category={category} alt={name.en ?? ""} />
        </div>
        {place ? (
          <div className="flex gap-2">
            <label className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
              {imgBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {imagePath ? "Replace photo" : "Upload photo"}
              <input type="file" accept="image/*" className="sr-only" disabled={imgBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
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
            if (error) return toast.error(error.message);
            refresh();
            onDone();
          }}><Trash2 className="size-4" /></Button>
        ) : null}
      </div>
    </div>
  );
}
