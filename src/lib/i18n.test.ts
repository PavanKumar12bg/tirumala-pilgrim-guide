import { describe, expect, it } from "vitest";
import { DEFAULT_LANG, DICTS, LANGS, pickLocalized } from "./i18n";
import { UPGRADE_COPY } from "./upgrade-copy";
describe("seven-language guide", () => {
 it("defaults to Telugu and supports exactly the seven requested languages", () => {
  expect(DEFAULT_LANG).toBe("te");
  expect(LANGS.map(l => l.code)).toEqual(["te", "en", "ta", "kn", "ml", "hi", "or"]);
 });
 it("uses requested language, then English, then Telugu for announcements", () => {
  expect(pickLocalized({ ta: "தமிழ்", en: "English", te: "తెలుగు" }, "ta")).toBe("தமிழ்");
  expect(pickLocalized({ en: "English", te: "తెలుగు" }, "or")).toBe("English");
  expect(pickLocalized({ te: "తెలుగు" }, "or")).toBe("తెలుగు");
 });
 it("provides translated values for every added voice and dashboard field", () => {
  for (const { code } of LANGS) for (const key of Object.keys(UPGRADE_COPY.en) as (keyof typeof UPGRADE_COPY.en)[]) expect(typeof DICTS[code][key] === "string" && DICTS[code][key].trim().length > 0).toBe(true);
 });
});