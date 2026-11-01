import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { compressToWebp } from "@/lib/image-compress";
import { suggestPlaceForPhoto } from "@/lib/photo-identify.functions";
import type { Place } from "@/lib/places";

export type PreparedPhoto = { blob: Blob; width: number; height: number; url: string };

const toDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Could not read photo"));
    r.readAsDataURL(b);
  });

/** Admin-only: upload a photo, ask AI which place it shows, then open that place with the photo ready to save. */
export function PhotoIdentifier({ places, onUse }: { places: Place[]; onUse: (place: Place, photo: PreparedPhoto) => void }) {
  const suggest = useServerFn(suggestPlaceForPhoto);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof suggestPlaceForPhoto>> | null>(null);
  const [pick, setPick] = useState("");

  const run = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose a photo"); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("Photo is larger than 25 MB"); return; }
    setBusy(true);
    setRes(null);
    try {
      const out = await compressToWebp(file);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ ...out, url: URL.createObjectURL(out.blob) });
      const r = await suggest({ data: { image: await toDataUrl(out.blob) } });
      setRes(r);
      if (r.ok) setPick(r.place_id ?? "");
      else toast.error(r.error);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not process this photo");
    }
    setBusy(false);
  };

  const reset = () => { if (photo) URL.revokeObjectURL(photo.url); setPhoto(null); setRes(null); setPick(""); };
  const chosen = places.find((p) => p.id === pick);
  const suggested = res?.ok ? places.find((p) => p.id === res.place_id) : undefined;

  return (
    <section className="rounded-xl bg-card p-3 ring-1 ring-border">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-gold" aria-hidden />
        <h3 className="font-semibold">Identify a photo with AI</h3>
        {photo ? <button onClick={reset} aria-label="Clear" className="ml-auto grid size-9 place-items-center rounded-full hover:bg-muted"><X className="size-4" /></button> : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Upload a photo; AI suggests the matching place. You confirm before anything is saved.</p>
      {!photo ? (
        <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-dashed text-sm font-semibold">
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Choose photo"}
          <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(f); e.target.value = ""; }} />
        </label>
      ) : (
        <div className="mt-2 flex gap-3">
          <img src={photo.url} alt="Selected upload" className="size-24 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1 space-y-1.5 text-sm">
            {busy ? <p className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Analysing photo…</p> : null}
            {res?.ok ? (
              <>
                <p className="text-muted-foreground">{res.depicted}</p>
                <p>
                  {suggested ? <>Suggested: <b>{suggested.name.en || suggested.name.te}</b> </> : <b>No confident match. </b>}
                  <Badge variant={res.confidence === "high" ? "default" : "secondary"}>{res.confidence}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">{res.reason}</p>
              </>
            ) : null}
            {res ? (
              <>
                <select aria-label="Place for this photo" className="h-11 w-full rounded-md border border-input bg-card px-2" value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">Choose place…</option>
                  {places.map((p) => <option key={p.id} value={p.id}>{p.name.en || p.name.te}</option>)}
                </select>
                <Button className="min-h-11 w-full" disabled={!chosen} onClick={() => { if (chosen && photo) { onUse(chosen, photo); setPhoto(null); setRes(null); } }}>
                  Open place with this photo
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
