import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
const COOKIE = "tg_eco_session";
async function digest(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join(""); }
export async function participantSession() {
  const token = getCookie(COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await supabaseAdmin.from("eco_sessions").select("participant_id").eq("token_hash", await digest(token)).eq("revoked", false).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw new Error("Participant session unavailable");
  return data?.participant_id ?? null;
}
export async function requireParticipant() { const id = await participantSession(); if (!id) throw new Error("Open your participant session first"); return id; }
export async function issueParticipantSession(id: string) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
  const { error } = await supabaseAdmin.from("eco_sessions").insert({ participant_id: id, token_hash: await digest(token), expires_at: new Date(Date.now() + 30 * 86400000).toISOString() });
  if (error) throw new Error("Could not create a secure participant session");
  setCookie(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
}
export async function endParticipantSession() { const token = getCookie(COOKIE); if (token) { const { error } = await supabaseAdmin.from("eco_sessions").update({ revoked: true }).eq("token_hash", await digest(token)); if (error) throw new Error("Could not end session"); } deleteCookie(COOKIE, { path: "/" }); }