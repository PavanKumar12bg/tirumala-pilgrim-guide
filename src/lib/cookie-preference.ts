export const COOKIE_PREFERENCE_KEY = "tg-cookie-consent";
export type CookiePreference = "all" | "essential";

export function readCookiePreference(storage: Pick<Storage, "getItem">): CookiePreference | null {
  try {
    const value = storage.getItem(COOKIE_PREFERENCE_KEY);
    return value === "all" || value === "essential" ? value : null;
  } catch { return null; }
}

export function saveCookiePreference(storage: Pick<Storage, "setItem">, value: CookiePreference): boolean {
  try { storage.setItem(COOKIE_PREFERENCE_KEY, value); return true; }
  catch { return false; }
}