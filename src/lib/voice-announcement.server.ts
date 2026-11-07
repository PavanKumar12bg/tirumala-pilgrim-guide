import { generateResponse, generateSpeech } from "@lovable.dev/ai-gateway";
import { LANG_NAMES, VOICE_LANGS, type VoiceLang } from "./voice-announcement";
import { validateAudioFile } from "./announcement-audio-file";

export async function translateAll(source: string, langs: readonly VoiceLang[] = VOICE_LANGS): Promise<Record<VoiceLang, string>> {
  const props = Object.fromEntries(langs.map((l) => [l, { type: "string" }]));
  const r = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions:
      "You translate short darshan announcements for pilgrims at Tirumala temple. Translate the announcement into each requested language " +
      `(${langs.map((l) => `${l}=${LANG_NAMES[l]}`).join(", ")}). Keep the exact meaning. Do not add, remove or soften any information. ` +
      "Write every number, time and date with Western digits (0-9) exactly as in the original. Use simple, polite language suitable for a public temple announcement. " +
      "If a field's language is the same as the original, return the original text unchanged.",
    input: source,
    text: { format: { type: "json_schema", name: "translations", strict: true, schema: { type: "object", properties: props, required: [...langs], additionalProperties: false } } },
  });
  const out = (r.output ?? []) as { type?: string; content?: { type?: string; text?: string }[] }[];
  const text = out.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text;
  if (!text) throw new Error("No translation returned");
  const parsed = JSON.parse(text) as Record<string, unknown>;
  return Object.fromEntries(VOICE_LANGS.map((l) => [l, typeof parsed[l] === "string" ? (parsed[l] as string).trim() : ""])) as Record<VoiceLang, string>;
}

export async function speak(text: string, lang: VoiceLang): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const b = await generateSpeech({
    model: "google/gemini-3.1-flash-tts-preview",
    contents: [{ role: "user", parts: [{ text: `Read this ${LANG_NAMES[lang]} temple announcement aloud in ${LANG_NAMES[lang]}, slowly, clearly and calmly, like a public announcement:\n\n${text}` }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } },
  });
  const blob = await b.blob();
  if (blob.size < 1000) throw new Error("Voice output was empty");
  const contentType = b.contentType || blob.type;
  if (!/^audio\/(wav|x-wav|mpeg|ogg)(;|$)/i.test(contentType)) throw new Error(`Unsupported voice content type: ${contentType || "missing"}`);
  console.info("voice speech received", { lang, contentType, bytes: blob.size, runId: b.runId });
  const bytes = await blob.arrayBuffer();
  validateAudioFile(bytes, contentType);
  return { bytes, contentType };
}
