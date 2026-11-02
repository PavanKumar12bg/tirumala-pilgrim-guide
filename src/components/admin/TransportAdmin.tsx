import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { LANGS, pickLocalized, useI18n } from "@/lib/i18n";
import { IMAGE_BUCKET, placesQuery, type Localized } from "@/lib/places";
import { compressToWebp } from "@/lib/image-compress";
import { TEMPLATE_DEFS, TEMPLATES, type ItemDetails, type Sections, type Source, type TemplateId } from "@/lib/transport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const selectCls = "h-11 w-full rounded-md border border-input bg-card px-3 text-base";
type Cat = { id: string; slug: string; template: TemplateId; title: Localized; description: Localized; icon: string; image_path: string | null; status: string; sort_order: number; sections: Sections; sources: Source[]; last_verified_on: string | null };
type Item = { id: string; category_id: string; kind: string; title: Localized; body: Localized; photo_paths: string[]; place_id: string | null; duration_text: string | null; notes: Localized; fare_text: string | null; details: ItemDetails; source_url: string | null; last_verified_on: string | null; sort_order: number; published: boolean };
type Provider = { id: string; display_name: string; vehicle_type: string | null; capacity: number | null; public_phone: string | null; service_area: string | null; status: string; active: boolean };
type Priv = { provider_id: string; commission: string | null; agreement_notes: string | null; private_phone: string | null; internal_notes: string | null };
type Offer = { id: string; provider_id: string; category_id: string; price_text: string | null; included_places: string | null; duration_text: string | null; inclusions: string | null; exclusions: string | null; extra_charges: string | null; published: boolean; sort_order: number };

const j = (v: unknown) => v as Json;
const nn = (v: string) => (v.trim() === "" ? null : v.trim());
const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Save failed");

const adminQ = {
  cats: { queryKey: ["admin-transport", "cats"], queryFn: async () => { const { data, error } = await supabase.from("transport_categories").select("*").order("sort_order"); if (error) throw error; return data as unknown as Cat[]; } },
  items: { queryKey: ["admin-transport", "items"], queryFn: async () => { const { data, error } = await supabase.from("transport_items").select("*").order("sort_order"); if (error) throw error; return data as unknown as Item[]; } },
  providers: { queryKey: ["admin-transport", "providers"], queryFn: async () => { const { data, error } = await supabase.from("transport_providers").select("*").order("display_name"); if (error) throw error; return data as unknown as Provider[]; } },
  offers: { queryKey: ["admin-transport", "offers"], queryFn: async () => { const { data, error } = await supabase.from("transport_offers").select("*").order("sort_order"); if (error) throw error; return data as unknown as Offer[]; } },
};
function useRefresh() {
  const qc = useQueryClient();
  return () => { void qc.invalidateQueries({ queryKey: ["admin-transport"] }); void qc.invalidateQueries({ queryKey: ["transport"] }); };
}

function L10n({ label, value, onChange, multiline }: { label: string; value: Localized; onChange: (v: Localized) => void; multiline?: boolean }) {
  const [all, setAll] = useState(false);
  const F = multiline ? Textarea : Input;
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-semibold">{label}</legend>
      {(all ? LANGS : LANGS.filter((l) => l.primary)).map((l) => (
        <div key={l.code}><Label className="text-xs text-muted-foreground">{l.label}</Label>
          <F lang={l.code} value={value?.[l.code] ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange({ ...value, [l.code]: e.target.value })} className="text-base" /></div>
      ))}
      <Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={() => setAll(!all)}>{all ? "Fewer languages" : "All 7 languages"}</Button>
    </fieldset>
  );
}
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="space-y-1"><Label className="text-sm">{label}</Label>{children}</div>;

async function uploadPhoto(file: File, folder: string) {
  const out = await compressToWebp(file);
  if (out.blob.size > 1024 * 1024) throw new Error("Compressed photo is still over 1 MB");
  const path = `transport/${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, out.blob, { contentType: "image/webp" });
  if (error) throw error;
  return path;
}

async function swapOrder(table: "transport_categories" | "transport_items" | "transport_offers", list: { id: string; sort_order: number }[], idx: number, dir: -1 | 1) {
  const a = list[idx], b = list[idx + dir];
  if (!a || !b) return;
  const ao = a.sort_order === b.sort_order ? b.sort_order + dir : b.sort_order;
  await supabase.from(table).update({ sort_order: ao }).eq("id", a.id);
  await supabase.from(table).update({ sort_order: a.sort_order }).eq("id", b.id);
}

export function TransportAdmin() {
  return (
    <Tabs defaultValue="cats">
      <TabsList className="flex h-auto w-full flex-wrap">
        <TabsTrigger value="cats" className="min-h-10">Categories</TabsTrigger>
        <TabsTrigger value="providers" className="min-h-10">Providers</TabsTrigger>
      </TabsList>
      <TabsContent value="cats" className="mt-4"><CategoriesAdmin /></TabsContent>
      <TabsContent value="providers" className="mt-4"><ProvidersAdmin /></TabsContent>
    </Tabs>
  );
}

function CategoriesAdmin() {
  const { lang } = useI18n();
  const cats = useQuery(adminQ.cats);
  const refresh = useRefresh();
  const [edit, setEdit] = useState<Cat | "new" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  if (cats.isLoading) return <Loader2 className="size-5 animate-spin" />;
  if (cats.isError) return <p role="alert" className="text-destructive">Could not load categories.</p>;
  const list = cats.data ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl">Trip & Transport categories</h2><Button onClick={() => setEdit("new")}><Plus className="size-4" />New category</Button></div>
      <p className="text-sm text-muted-foreground">Visitors only see categories marked Published, and only published items inside them.</p>
      {list.map((c, i) => (
        <div key={c.id} className="rounded-xl bg-card p-3 ring-1 ring-border">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl" aria-hidden>{c.icon}</span>
            <div className="min-w-0 flex-1"><p className="font-semibold">{pickLocalized(c.title, lang)}</p><p className="text-xs text-muted-foreground">/{c.slug} · {TEMPLATE_DEFS[c.template]?.label}</p></div>
            <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
            <select aria-label="Status" className="h-10 rounded-md border bg-card px-2 text-sm" value={c.status} onChange={async (e) => { const { error } = await supabase.from("transport_categories").update({ status: e.target.value }).eq("id", c.id); if (error) fail(error); refresh(); }}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
            <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={async () => { await swapOrder("transport_categories", list, i, -1); refresh(); }}><ArrowUp className="size-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === list.length - 1} onClick={async () => { await swapOrder("transport_categories", list, i, 1); refresh(); }}><ArrowDown className="size-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setEdit(c)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Hide items" : "Items & offers"}</Button>
            {c.status === "published" ? <a className="inline-flex items-center gap-1 text-sm text-primary" href={`/transport/${c.slug}`} target="_blank" rel="noreferrer">Preview<ExternalLink className="size-3.5" /></a> : null}
          </div>
          {open === c.id ? <div className="mt-4 space-y-6 border-t pt-4"><ItemsAdmin cat={c} />{TEMPLATE_DEFS[c.template]?.providers ? <OffersAdmin cat={c} /> : <p className="text-xs text-muted-foreground">This template does not show providers.</p>}</div> : null}
        </div>
      ))}
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{edit === "new" ? "New category" : "Edit category"}</SheetTitle></SheetHeader>
          {edit ? <CategoryForm initial={edit === "new" ? null : edit} nextOrder={(list.at(-1)?.sort_order ?? 0) + 10} onDone={() => { setEdit(null); refresh(); }} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CategoryForm({ initial, nextOrder, onDone }: { initial: Cat | null; nextOrder: number; onDone: () => void }) {
  const [c, setC] = useState<Omit<Cat, "id">>(initial ?? { slug: "", template: "package", title: {}, description: {}, icon: "🚌", image_path: null, status: "draft", sort_order: nextOrder, sections: {}, sources: [], last_verified_on: null });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof c>(k: K, v: (typeof c)[K]) => setC({ ...c, [k]: v });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-z0-9-]+$/.test(c.slug)) return toast.error("Web address: lowercase letters, numbers and dashes only");
    if (!c.title.en && !c.title.te) return toast.error("Add a title in English or Telugu");
    setBusy(true);
    const row = { slug: c.slug, template: c.template, title: j(c.title), description: j(c.description), icon: c.icon || "🚌", image_path: c.image_path, status: c.status, sort_order: c.sort_order, sections: j(c.sections), sources: j(c.sources.filter((s) => s.url.startsWith("https://"))), last_verified_on: c.last_verified_on || null };
    const { error } = initial ? await supabase.from("transport_categories").update(row).eq("id", initial.id) : await supabase.from("transport_categories").insert(row);
    setBusy(false);
    if (error) return fail(error);
    toast.success("Saved"); onDone();
  };
  return (
    <form onSubmit={save} className="mt-4 space-y-4">
      <Field label="Web address (slug)"><Input value={c.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} placeholder="free-bus-routes" /></Field>
      <Field label="Page layout (template)">
        <select className={selectCls} value={c.template} onChange={(e) => set("template", e.target.value as TemplateId)}>{TEMPLATES.map((t) => <option key={t} value={t}>{TEMPLATE_DEFS[t].label}</option>)}</select>
      </Field>
      <L10n label="Title" value={c.title} onChange={(v) => set("title", v)} />
      <L10n label="Description" value={c.description} onChange={(v) => set("description", v)} multiline />
      <Field label="Icon (emoji)"><Input value={c.icon} onChange={(e) => set("icon", e.target.value.slice(0, 4))} className="w-24" /></Field>
      <Field label="Card image (optional)">
        <Input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { set("image_path", await uploadPhoto(f, "categories")); toast.success("Photo uploaded — press Save"); } catch (err) { fail(err); } }} />
        {c.image_path ? <Button type="button" variant="link" className="px-0" onClick={() => set("image_path", null)}>Remove image</Button> : null}
      </Field>
      <fieldset className="space-y-2 rounded-lg border p-3">
        <legend className="px-1 text-sm font-semibold">Sections</legend>
        <L10n label="List heading (optional)" value={c.sections.heading ?? {}} onChange={(v) => set("sections", { ...c.sections, heading: v })} />
        {TEMPLATE_DEFS[c.template].providers ? <>
          <L10n label="Providers heading (optional)" value={c.sections.providers_heading ?? {}} onChange={(v) => set("sections", { ...c.sections, providers_heading: v })} />
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!c.sections.hide_providers} onCheckedChange={(v) => set("sections", { ...c.sections, hide_providers: v })} />Hide providers section</label>
        </> : null}
        <label className="flex items-center gap-2 text-sm"><Switch checked={!!c.sections.hide_sources} onCheckedChange={(v) => set("sections", { ...c.sections, hide_sources: v })} />Hide sources section</label>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Official sources</legend>
        {c.sources.map((s, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Label" value={s.label} onChange={(e) => set("sources", c.sources.map((x, k) => k === i ? { ...x, label: e.target.value } : x))} />
            <Input placeholder="https://…" value={s.url} onChange={(e) => set("sources", c.sources.map((x, k) => k === i ? { ...x, url: e.target.value } : x))} />
            <Button type="button" size="icon" variant="ghost" aria-label="Remove source" onClick={() => set("sources", c.sources.filter((_, k) => k !== i))}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => set("sources", [...c.sources, { label: "", url: "" }])}><Plus className="size-4" />Add source</Button>
      </fieldset>
      <Field label="Last verified on"><Input type="date" value={c.last_verified_on ?? ""} onChange={(e) => set("last_verified_on", e.target.value || null)} /></Field>
      <Button type="submit" disabled={busy} className="min-h-12 w-full">{busy ? <Loader2 className="size-4 animate-spin" /> : "Save"}</Button>
    </form>
  );
}

const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

function ItemsAdmin({ cat }: { cat: Cat }) {
  const { lang } = useI18n();
  const items = useQuery(adminQ.items);
  const refresh = useRefresh();
  const [edit, setEdit] = useState<Item | "new" | null>(null);
  const list = (items.data ?? []).filter((i) => i.category_id === cat.id);
  const kind = TEMPLATE_DEFS[cat.template].itemKind;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between"><h3 className="font-semibold">Items ({kind.replace("_", " ")})</h3><Button size="sm" onClick={() => setEdit("new")}><Plus className="size-4" />Add</Button></div>
      {list.length === 0 ? <p className="text-sm text-muted-foreground">No items yet.</p> : null}
      {list.map((it, i) => (
        <div key={it.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/50 p-2 text-sm">
          <span className="min-w-0 flex-1 font-medium">{pickLocalized(it.title, lang) || "(untitled)"}</span>
          <label className="flex items-center gap-1 text-xs"><Switch checked={it.published} onCheckedChange={async (v) => { const { error } = await supabase.from("transport_items").update({ published: v }).eq("id", it.id); if (error) fail(error); refresh(); }} />Published</label>
          <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={async () => { await swapOrder("transport_items", list, i, -1); refresh(); }}><ArrowUp className="size-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === list.length - 1} onClick={async () => { await swapOrder("transport_items", list, i, 1); refresh(); }}><ArrowDown className="size-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setEdit(it)}>Edit</Button>
          <Button size="icon" variant="ghost" aria-label="Delete item" onClick={async () => { if (!confirm("Delete this item?")) return; const { error } = await supabase.from("transport_items").delete().eq("id", it.id); if (error) fail(error); refresh(); }}><Trash2 className="size-4" /></Button>
        </div>
      ))}
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{edit === "new" ? "Add item" : "Edit item"}</SheetTitle></SheetHeader>
          {edit ? <ItemForm cat={cat} initial={edit === "new" ? null : edit} nextOrder={(list.at(-1)?.sort_order ?? 0) + 10} onDone={() => { setEdit(null); refresh(); }} /> : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function ItemForm({ cat, initial, nextOrder, onDone }: { cat: Cat; initial: Item | null; nextOrder: number; onDone: () => void }) {
  const { lang } = useI18n();
  const places = useQuery(placesQuery({ admin: true }));
  const kind = TEMPLATE_DEFS[cat.template].itemKind;
  const [it, setIt] = useState<Omit<Item, "id">>(initial ?? { category_id: cat.id, kind, title: {}, body: {}, photo_paths: [], place_id: null, duration_text: null, notes: {}, fare_text: null, details: {}, source_url: null, last_verified_on: null, sort_order: nextOrder, published: false });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof it>(k: K, v: (typeof it)[K]) => setIt({ ...it, [k]: v });
  const setD = (d: Partial<ItemDetails>) => setIt({ ...it, details: { ...it.details, ...d } });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (it.source_url && !it.source_url.startsWith("https://")) return toast.error("Source link must start with https://");
    setBusy(true);
    const row = { category_id: cat.id, kind: it.kind, title: j(it.title), body: j(it.body), photo_paths: it.photo_paths, place_id: it.place_id, duration_text: it.duration_text ? nn(it.duration_text) : null, notes: j(it.notes), fare_text: it.fare_text ? nn(it.fare_text) : null, details: j(it.details), source_url: it.source_url ? nn(it.source_url) : null, last_verified_on: it.last_verified_on || null, sort_order: it.sort_order, published: it.published };
    const { error } = initial ? await supabase.from("transport_items").update(row).eq("id", initial.id) : await supabase.from("transport_items").insert(row);
    setBusy(false);
    if (error) return fail(error);
    toast.success("Saved"); onDone();
  };
  return (
    <form onSubmit={save} className="mt-4 space-y-4">
      <L10n label="Name" value={it.title} onChange={(v) => set("title", v)} />
      <L10n label="Description" value={it.body} onChange={(v) => set("body", v)} multiline />
      {cat.template === "route_guide" ? <Field label="Mode"><select className={selectCls} value={it.details.mode ?? ""} onChange={(e) => setD({ mode: e.target.value })}><option value="">—</option><option value="road">Road</option><option value="bus">Bus</option><option value="footpath">Footpath</option></select></Field> : null}
      {cat.template === "route_guide" || cat.template === "pickup" ? <Field label="Starting / boarding points (one per line)"><Textarea value={(it.details.boarding_points ?? []).join("\n")} onChange={(e) => setD({ boarding_points: lines(e.target.value) })} /></Field> : null}
      {cat.template === "bus_routes" ? <Field label="Stops in order (one per line)"><Textarea value={(it.details.stops ?? []).join("\n")} onChange={(e) => setD({ stops: lines(e.target.value) })} /></Field> : null}
      {cat.template === "package" ? <>
        <Field label="Visit duration"><Input value={it.duration_text ?? ""} onChange={(e) => set("duration_text", e.target.value)} placeholder="e.g. 30 min" /></Field>
        <Field label="Accessibility / operating notes"><Textarea value={it.details.access ?? ""} onChange={(e) => setD({ access: e.target.value })} /></Field>
      </> : null}
      {cat.template !== "help_info" && cat.template !== "package" ? <Field label="Fare (only if from an official source)"><Input value={it.fare_text ?? ""} onChange={(e) => set("fare_text", e.target.value)} /></Field> : null}
      <L10n label="Notes / timing notes" value={it.notes} onChange={(v) => set("notes", v)} multiline />
      <Field label="Map place (only verified places show a pin)">
        <select className={selectCls} value={it.place_id ?? ""} onChange={(e) => set("place_id", e.target.value || null)}>
          <option value="">None</option>
          {(places.data ?? []).map((p) => <option key={p.id} value={p.id}>{pickLocalized(p.name, lang)}{p.coords_verified ? "" : " (unverified)"}</option>)}
        </select>
      </Field>
      <Field label="Photos">
        <Input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { set("photo_paths", [...it.photo_paths, await uploadPhoto(f, "items")]); toast.success("Photo uploaded — press Save"); } catch (err) { fail(err); } e.target.value = ""; }} />
        {it.photo_paths.map((p, i) => <div key={p} className="flex items-center justify-between text-xs"><span><Upload className="mr-1 inline size-3" />Photo {i + 1}</span><Button type="button" variant="link" size="sm" onClick={() => set("photo_paths", it.photo_paths.filter((x) => x !== p))}>Remove</Button></div>)}
      </Field>
      <Field label="Source link"><Input value={it.source_url ?? ""} onChange={(e) => set("source_url", e.target.value)} placeholder="https://www.tirumala.org/…" /></Field>
      <Field label="Last verified on"><Input type="date" value={it.last_verified_on ?? ""} onChange={(e) => set("last_verified_on", e.target.value || null)} /></Field>
      <label className="flex items-center gap-2 text-sm"><Switch checked={it.published} onCheckedChange={(v) => set("published", v)} />Published</label>
      <Button type="submit" disabled={busy} className="min-h-12 w-full">{busy ? <Loader2 className="size-4 animate-spin" /> : "Save"}</Button>
    </form>
  );
}

function OffersAdmin({ cat }: { cat: Cat }) {
  const offers = useQuery(adminQ.offers);
  const providers = useQuery(adminQ.providers);
  const refresh = useRefresh();
  const [edit, setEdit] = useState<Offer | "new" | null>(null);
  const list = (offers.data ?? []).filter((o) => o.category_id === cat.id);
  const prov = new Map((providers.data ?? []).map((p) => [p.id, p]));
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between"><h3 className="font-semibold">Providers offering this</h3><Button size="sm" onClick={() => setEdit("new")} disabled={!providers.data?.length}><Plus className="size-4" />Link provider</Button></div>
      {!providers.data?.length ? <p className="text-sm text-muted-foreground">Add a provider in the Providers tab first.</p> : null}
      {list.map((o) => {
        const p = prov.get(o.provider_id);
        const ok = p?.status === "approved" && p.active;
        return (
          <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/50 p-2 text-sm">
            <span className="min-w-0 flex-1 font-medium">{p?.display_name ?? "?"} {o.price_text ? `· ${o.price_text}` : ""}</span>
            {!ok ? <Badge variant="secondary">hidden: provider not approved/active</Badge> : null}
            <label className="flex items-center gap-1 text-xs"><Switch checked={o.published} onCheckedChange={async (v) => { const { error } = await supabase.from("transport_offers").update({ published: v }).eq("id", o.id); if (error) fail(error); refresh(); }} />Published</label>
            <Button size="sm" variant="outline" onClick={() => setEdit(o)}>Edit</Button>
            <Button size="icon" variant="ghost" aria-label="Unlink provider" onClick={async () => { if (!confirm("Remove this provider from this category?")) return; const { error } = await supabase.from("transport_offers").delete().eq("id", o.id); if (error) fail(error); refresh(); }}><Trash2 className="size-4" /></Button>
          </div>
        );
      })}
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>Provider offer</SheetTitle></SheetHeader>
          {edit ? <OfferForm cat={cat} providers={providers.data ?? []} initial={edit === "new" ? null : edit} onDone={() => { setEdit(null); refresh(); }} /> : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function OfferForm({ cat, providers, initial, onDone }: { cat: Cat; providers: Provider[]; initial: Offer | null; onDone: () => void }) {
  const [o, setO] = useState<Omit<Offer, "id">>(initial ?? { provider_id: providers[0]?.id ?? "", category_id: cat.id, price_text: "", included_places: "", duration_text: "", inclusions: "", exclusions: "", extra_charges: "", published: false, sort_order: 100 });
  const [busy, setBusy] = useState(false);
  const txt = (k: "price_text" | "included_places" | "duration_text" | "inclusions" | "exclusions" | "extra_charges", label: string, multi?: boolean) => {
    const F = multi ? Textarea : Input;
    return <Field label={label}><F value={o[k] ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setO({ ...o, [k]: e.target.value })} /></Field>;
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const row = { provider_id: o.provider_id, category_id: cat.id, price_text: nn(o.price_text ?? ""), included_places: nn(o.included_places ?? ""), duration_text: nn(o.duration_text ?? ""), inclusions: nn(o.inclusions ?? ""), exclusions: nn(o.exclusions ?? ""), extra_charges: nn(o.extra_charges ?? ""), published: o.published, sort_order: o.sort_order };
    const { error } = initial ? await supabase.from("transport_offers").update(row).eq("id", initial.id) : await supabase.from("transport_offers").insert(row);
    setBusy(false);
    if (error) return fail(error);
    toast.success("Saved"); onDone();
  };
  return (
    <form onSubmit={save} className="mt-4 space-y-4">
      <Field label="Provider"><select className={selectCls} value={o.provider_id} disabled={!!initial} onChange={(e) => setO({ ...o, provider_id: e.target.value })}>{providers.map((p) => <option key={p.id} value={p.id}>{p.display_name} ({p.status}{p.active ? "" : ", inactive"})</option>)}</select></Field>
      {txt("price_text", "Package price")}
      {txt("duration_text", "Duration")}
      {txt("included_places", "Included places", true)}
      {txt("inclusions", "Included", true)}
      {txt("exclusions", "Not included", true)}
      {txt("extra_charges", "Extra charges", true)}
      <label className="flex items-center gap-2 text-sm"><Switch checked={o.published} onCheckedChange={(v) => setO({ ...o, published: v })} />Published (provider must be approved)</label>
      <Button type="submit" disabled={busy} className="min-h-12 w-full">{busy ? <Loader2 className="size-4 animate-spin" /> : "Save"}</Button>
    </form>
  );
}

function ProvidersAdmin() {
  const providers = useQuery(adminQ.providers);
  const refresh = useRefresh();
  const [edit, setEdit] = useState<Provider | "new" | null>(null);
  if (providers.isLoading) return <Loader2 className="size-5 animate-spin" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl">Transport providers</h2><Button onClick={() => setEdit("new")}><Plus className="size-4" />Add provider</Button></div>
      <p className="text-sm text-muted-foreground">A provider appears publicly only when approved, active, and linked to a published offer inside a published category. Private details are never shown to visitors.</p>
      {(providers.data ?? []).map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-3 ring-1 ring-border">
          <div className="min-w-0 flex-1"><p className="font-semibold">{p.display_name}</p><p className="text-xs text-muted-foreground">{[p.vehicle_type, p.public_phone].filter(Boolean).join(" · ")}</p></div>
          <Badge variant={p.status === "approved" ? "default" : "secondary"}>{p.status}</Badge>
          {!p.active ? <Badge variant="outline">inactive</Badge> : null}
          <Button size="sm" variant="outline" onClick={() => setEdit(p)}>Edit</Button>
        </div>
      ))}
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{edit === "new" ? "Add provider" : "Edit provider"}</SheetTitle></SheetHeader>
          {edit ? <ProviderForm initial={edit === "new" ? null : edit} onDone={() => { setEdit(null); refresh(); }} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProviderForm({ initial, onDone }: { initial: Provider | null; onDone: () => void }) {
  const [p, setP] = useState<Omit<Provider, "id">>(initial ?? { display_name: "", vehicle_type: "", capacity: null, public_phone: "", service_area: "", status: "pending", active: false });
  const priv = useQuery({ queryKey: ["admin-transport", "private", initial?.id], enabled: !!initial, queryFn: async () => { const { data, error } = await supabase.from("transport_provider_private").select("*").eq("provider_id", initial!.id).maybeSingle(); if (error) throw error; return data as Priv | null; } });
  const [pv, setPv] = useState<Partial<Priv> | null>(null);
  const privVals = pv ?? priv.data ?? {};
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.display_name.trim()) return toast.error("Add a public name");
    setBusy(true);
    try {
      const row = { display_name: p.display_name.trim(), vehicle_type: nn(p.vehicle_type ?? ""), capacity: p.capacity, public_phone: nn(p.public_phone ?? ""), service_area: nn(p.service_area ?? ""), status: p.status, active: p.active };
      let id = initial?.id;
      if (id) { const { error } = await supabase.from("transport_providers").update(row).eq("id", id); if (error) throw error; }
      else { const { data, error } = await supabase.from("transport_providers").insert(row).select("id").single(); if (error) throw error; id = data.id; }
      if (pv) {
        const { error } = await supabase.from("transport_provider_private").upsert({ provider_id: id!, commission: nn(pv.commission ?? ""), agreement_notes: nn(pv.agreement_notes ?? ""), private_phone: nn(pv.private_phone ?? ""), internal_notes: nn(pv.internal_notes ?? "") });
        if (error) throw error;
      }
      toast.success("Saved"); onDone();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  const pf = (k: keyof Omit<Priv, "provider_id">, label: string) => <Field label={label}><Textarea value={(privVals as Partial<Priv>)[k] ?? ""} onChange={(e) => setPv({ ...privVals, [k]: e.target.value })} rows={2} /></Field>;
  return (
    <form onSubmit={save} className="mt-4 space-y-4">
      <Field label="Public business / driver name"><Input value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></Field>
      <Field label="Vehicle type"><Input value={p.vehicle_type ?? ""} onChange={(e) => setP({ ...p, vehicle_type: e.target.value })} placeholder="Sumo, Innova, Tempo Traveller…" /></Field>
      <Field label="Seats"><Input type="number" min={1} value={p.capacity ?? ""} onChange={(e) => setP({ ...p, capacity: e.target.value ? Number(e.target.value) : null })} /></Field>
      <Field label="Public phone (shown on Call button)"><Input type="tel" value={p.public_phone ?? ""} onChange={(e) => setP({ ...p, public_phone: e.target.value })} placeholder="+91 …" /></Field>
      <Field label="Service area"><Input value={p.service_area ?? ""} onChange={(e) => setP({ ...p, service_area: e.target.value })} /></Field>
      <Field label="Approval"><select className={selectCls} value={p.status} onChange={(e) => setP({ ...p, status: e.target.value })}><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option></select></Field>
      <label className="flex items-center gap-2 text-sm"><Switch checked={p.active} onCheckedChange={(v) => setP({ ...p, active: v })} />Active</label>
      <fieldset className="space-y-2 rounded-lg border border-dashed border-destructive/40 p-3">
        <legend className="px-1 text-sm font-semibold">Private — admin only, never shown publicly</legend>
        {pf("commission", "Commission")}{pf("agreement_notes", "Agreement notes")}{pf("private_phone", "Private phone")}{pf("internal_notes", "Internal notes")}
      </fieldset>
      <Button type="submit" disabled={busy} className="min-h-12 w-full">{busy ? <Loader2 className="size-4 animate-spin" /> : "Save"}</Button>
    </form>
  );
}
