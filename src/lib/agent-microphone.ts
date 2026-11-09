/** Permission probing only; temporary tracks are always released. No recording. */
export const SPEECH_LOCALES = { te: "te-IN", en: "en-IN", ta: "ta-IN", kn: "kn-IN", ml: "ml-IN", hi: "hi-IN", or: "or-IN" } as const;
export type MicResult = "granted" | "denied" | "unavailable" | "insecure";
export async function checkMicrophone(deps: {
  secure: boolean;
  query?: () => Promise<{ state: string }>;
  request?: () => Promise<{ getTracks: () => { stop: () => void }[] }>;
}): Promise<MicResult> {
  if (!deps.secure) return "insecure";
  try { if ((await deps.query?.())?.state === "granted") return "granted"; } catch { /* Safari may not expose microphone permissions. */ }
  if (!deps.request) return "unavailable";
  try {
    const stream = await deps.request();
    stream.getTracks().forEach(track => track.stop());
    return "granted";
  } catch (error) {
    return error instanceof Error && ["NotAllowedError", "SecurityError"].includes(error.name) ? "denied" : "unavailable";
  }
}