export const VOICE_LANGS = ["te", "en", "hi", "ta", "kn", "ml", "or"] as const;
export type VoiceLang = (typeof VOICE_LANGS)[number];
export const LANG_NAMES: Record<VoiceLang, string> = { te: "Telugu", en: "English", hi: "Hindi", ta: "Tamil", kn: "Kannada", ml: "Malayalam", or: "Odia" };
export const REPEAT_CHOICES = [1, 3, 5, 10, 15] as const;
export const AUDIO_BUCKET = "announcement-audio";
export const VOICE_PREF_KEY = "tirumala-guide-voice-announcements";
export const MAX_SOURCE_CHARS = 1500;

/** Every number in the original must survive translation unchanged (Western digits). */
export function numbersPreserved(source: string, translated: string): boolean {
  const nums = source.match(/\d+(?:[.,:]\d+)*/g) ?? [];
  return nums.every((n) => translated.includes(n));
}

/** Short stable hash used to tie an audio file to the exact text it speaks. */
export function textHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

export function validateSource(text: unknown): string {
  if (typeof text !== "string") throw new Error("Text required");
  const t = text.trim();
  if (t.length < 3) throw new Error("Announcement is too short");
  if (t.length > MAX_SOURCE_CHARS) throw new Error(`Announcement must be under ${MAX_SOURCE_CHARS} characters`);
  return t;
}

/** Delay before the next automatic repeat, or null when repeating is off. */
export function repeatDelayMs(s: { repeat_enabled: boolean; repeat_minutes: number } | null | undefined): number | null {
  if (!s?.repeat_enabled) return null;
  const m = (REPEAT_CHOICES as readonly number[]).includes(s.repeat_minutes) ? s.repeat_minutes : 5;
  return m * 60_000;
}

/** Identity of a playable clip; a change means stop the old audio and load the new one. */
export const clipKey = (id: string, lang: string, hash: string | null) => `${id}:${lang}:${hash ?? ""}`;
