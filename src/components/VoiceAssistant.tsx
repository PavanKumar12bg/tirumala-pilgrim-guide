import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { interpretCommand, type VoiceAction } from "@/lib/voice-commands";
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; abort: () => void; onresult: ((e: { results: { [n: number]: { [n: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export function VoiceAssistant({ open, onOpenChange, onAction }: { open: boolean; onOpenChange: (o: boolean) => void; onAction: (a: VoiceAction) => void }) {
 const { t, lang } = useI18n();
 const [text, setText] = useState("");
 const [listening, setListening] = useState(false);
 const [error, setError] = useState("");
 const [supported, setSupported] = useState(false);
 const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
 const ref = useRef<Recognition | null>(null);
 useEffect(() => {
  const w = window as SpeechWindow;
  setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  const update = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
  update(); window.speechSynthesis?.addEventListener("voiceschanged", update);
  return () => { ref.current?.abort(); window.speechSynthesis?.cancel(); window.speechSynthesis?.removeEventListener("voiceschanged", update); };
 }, []);
 useEffect(() => { if (!open) { ref.current?.abort(); setListening(false); window.speechSynthesis?.cancel(); } }, [open]);
 useEffect(() => { ref.current?.abort(); setListening(false); }, [lang]);
 const voice = voices.find(v => v.lang.toLowerCase().startsWith(`${lang}-`) || v.lang === lang);
 const start = () => {
  const w = window as SpeechWindow;
  const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Constructor) return setError(t("voiceUnavailable"));
  ref.current?.abort();
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
  <div className="flex gap-2"><Button className="min-h-11 flex-1" onClick={confirm} disabled={!text.trim() || listening}>{t("confirmAction")}</Button><Button variant="outline" size="icon" className="size-11" aria-label={t("speak")} title={t("speak")} disabled={!text || listening} onClick={() => {
   if (!voice || !window.speechSynthesis) return setError(t("speechUnavailable"));
   window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = `${lang}-IN`; utterance.voice = voice; window.speechSynthesis.speak(utterance);
  }}><Volume2 className="size-4" /></Button></div>
 </DialogContent></Dialog>;
}