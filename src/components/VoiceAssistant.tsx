import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { interpretCommand, type VoiceAction } from "@/lib/voice-commands";
import { createBrowserSpeech } from "@/lib/browser-speech";
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; abort: () => void; onresult: ((e: { results: { [n: number]: { [n: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export function VoiceAssistant({ open, onOpenChange, onAction }: { open: boolean; onOpenChange: (o: boolean) => void; onAction: (a: VoiceAction) => void }) {
 const { t, lang } = useI18n();
 const [text, setText] = useState("");
 const [listening, setListening] = useState(false);
 const [error, setError] = useState("");
 const [supported, setSupported] = useState(false);
 const [speechState, setSpeechState] = useState<"loading" | "playing" | "idle" | "failed" | "unavailable">("idle");
 const speech = useRef<ReturnType<typeof createBrowserSpeech> | null>(null);
 const ref = useRef<Recognition | null>(null);
 useEffect(() => {
  const w = window as SpeechWindow;
  setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  const synth = window.speechSynthesis;
  if (synth && typeof window.SpeechSynthesisUtterance === "function") {
    speech.current = createBrowserSpeech({ synth, utterance: text => new SpeechSynthesisUtterance(text), status: setSpeechState });
    const load = () => { synth.getVoices(); };
    load(); synth.addEventListener("voiceschanged", load);
    return () => { ref.current?.abort(); speech.current?.stop(); synth.removeEventListener("voiceschanged", load); };
  }
  return () => { ref.current?.abort(); };
 }, []);
 useEffect(() => { if (!open) { ref.current?.abort(); setListening(false); speech.current?.stop(); } }, [open]);
 useEffect(() => { ref.current?.abort(); setListening(false); speech.current?.stop(); }, [lang]);
 const start = () => {
  const w = window as SpeechWindow;
  const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Constructor) return setError(t("voiceUnavailable"));
  ref.current?.abort();
  speech.current?.stop();
  const recognition = new Constructor(); ref.current = recognition;
  recognition.lang = `${lang}-IN`; recognition.continuous = false; recognition.interimResults = false;
  recognition.onresult = e => { setText(e.results[0]?.[0]?.transcript ?? ""); setListening(false); };
  recognition.onerror = () => { setError(t("voiceError")); setListening(false); };
  recognition.onend = () => setListening(false);
  setError(""); setText("");
  try { recognition.start(); setListening(true); } catch { setError(t("voiceError")); }
 };
 const confirm = () => { const action = interpretCommand(text); if (action) { ref.current?.abort(); onAction(action); onOpenChange(false); } };
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="z-[1300] max-h-[85svh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-lg p-4" aria-describedby="voice-privacy">
  <DialogTitle>{t("voiceAssistant")}</DialogTitle><DialogDescription id="voice-privacy" className="text-xs">{t("voicePrivacy")}</DialogDescription>
  <div className="flex gap-2"><Button className="min-h-11 flex-1" disabled={!supported} onClick={start}><Mic className="size-4" />{listening ? t("listening") : t("listen")}</Button>{listening ? <Button variant="outline" aria-label={t("stopNav")} onClick={() => { ref.current?.abort(); setListening(false); }}><Square className="size-4" /></Button> : null}</div>
  {!supported ? <p className="text-sm text-muted-foreground">{t("voiceUnavailable")}</p> : null}
  {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  <Label htmlFor="voice-text">{t("recognized")}</Label><Input id="voice-text" value={text} onChange={e => setText(e.target.value)} disabled={listening} />
  <div className="flex gap-2"><Button className="min-h-11 flex-1" onClick={confirm} disabled={!text.trim() || listening}>{t("confirmAction")}</Button><Button variant="outline" size="icon" className="size-11" aria-label={speechState === "playing" || speechState === "loading" ? t("stopNav") : t("speak")} title={t("speak")} disabled={!text.trim() || listening} onClick={() => {
   setError("");
   if (!speech.current) return setSpeechState("unavailable");
   if (speechState === "playing" || speechState === "loading") speech.current.stop();
   else speech.current.speak(text, lang);
  }}>{speechState === "playing" || speechState === "loading" ? <Square className="size-4" /> : <Volume2 className="size-4" />}</Button></div>
  <p role={speechState === "failed" || speechState === "unavailable" ? "alert" : "status"} className="text-xs text-muted-foreground">{speechState === "loading" ? t("loading") : speechState === "playing" ? t("speechPlaying") : speechState === "failed" ? t("soundUnavailable") : speechState === "unavailable" ? t("speechUnavailable") : ""}</p>
 </DialogContent></Dialog>;
}