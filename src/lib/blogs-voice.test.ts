import { describe, expect, it } from "vitest";
import { findFreeFood, findPlaces, parseIntent } from "./voice-agent";
import { parseBlogContent, searchBlogs, isValidSlug, type Blog } from "./blogs";
import type { Place } from "./places";

const place = (o: Partial<Place>): Place => ({ id: o.slug ?? "x", slug: "x", category: "other", name: {}, description: {}, lat: null, lng: null, coords_verified: false, visible: true, featured: false, sort_order: 1, image_path: null, image_width: null, image_height: null, image_bytes: null, updated_at: "", osm_id: null, osm_tags: {}, coords_source: null, needs_review: false, ...o });
const vengamamba = place({ slug: "vengamamba", category: "food", name: { te: "తరిగొండ మాతృశ్రీ వెంగమాంబ అన్నసత్రం", en: "Tarigonda Vengamamba Annaprasadam Complex" } });
const temple = place({ slug: "srivari-temple", category: "temple", name: { te: "శ్రీ వేంకటేశ్వర స్వామి ఆలయం", en: "Sri Venkateswara Swamy Temple" } });
const aliasOnly = place({ slug: "new-hall", name: { en: "Hall 7" }, aliases: ["మంచి నీళ్ళ హాల్", "rest hall"] });

describe("food synonyms", () => {
  for (const q of ["అన్నసత్రం", "అన్న సత్రం", "అన్నదానం", "ఉచిత భోజనం", "ఉచిత అన్నదానం", "Free food", "Free meals", "Annasatram", "Annadanam", "free meal facility"])
    it(q, () => expect(parseIntent(q)?.kind).toBe("freeFood"));
  it("finds the real annasatram listing", () => expect(findFreeFood([vengamamba, temple])).toEqual([vengamamba]));
  it("partial name match", () => expect(findPlaces("వెంగమాంబ", [vengamamba, temple]).match).toBe(vengamamba));
});

describe("temple / srivari synonyms", () => {
  for (const q of ["శ్రీవారి ఆలయం", "శ్రీవారి దేవాలయం", "బాలాజీ ఆలయం", "Srivari Temple", "Balaji Temple", "Main Temple"]) {
    it(q, () => {
      const i = parseIntent(q);
      expect(i?.kind).toBe("navigate");
      expect(findPlaces((i as { query: string }).query, [vengamamba, temple]).match).toBe(temple);
    });
  }
  it("srivari darshan still opens darshan page", () => expect(parseIntent("శ్రీవారి దర్శనం ఓపెన్ చేయి")).toEqual({ kind: "open", page: "/darshan" }));
});

describe("admin aliases make new listings searchable", () => {
  it("matches alias", () => expect(findPlaces("rest hall", [aliasOnly, temple]).match).toBe(aliasOnly));
});

describe("blog intents", () => {
  it("open blogs", () => expect(parseIntent("open blogs")).toEqual({ kind: "open", page: "/blogs" }));
  it("telugu open blogs", () => expect(parseIntent("బ్లాగులు ఓపెన్ చేయి")).toEqual({ kind: "open", page: "/blogs" }));
  it("latest", () => expect(parseIntent("show latest blogs")?.kind).toBe("blogsLatest"));
  it("search", () => expect(parseIntent("search blogs about temples")).toEqual({ kind: "blogSearch", query: "temples" }));
  it("annadanam blogs", () => expect(parseIntent("find blogs about annadanam")).toEqual({ kind: "blogSearch", query: "annadanam" }));
  it("read this blog", () => expect(parseIntent("read this blog")?.kind).toBe("readBlog"));
});

const blog = (o: Partial<Blog>): Blog => ({ id: o.slug ?? "b", slug: "b", lang: "en", title: "", excerpt: "", content: [], category: "general", tags: [], keywords: [], seo_title: null, seo_description: null, featured_image_path: "p", status: "published", published_at: null, updated_at: "", ...o });
describe("blog search and content", () => {
  const a = blog({ slug: "a", title: "Guide to Annadanam", category: "annadanam" });
  const b = blog({ slug: "b", title: "Temples near Tirumala", tags: ["temples"] });
  it("ranks by title/tags", () => { expect(searchBlogs("temples", [a, b])).toEqual([b]); expect(searchBlogs("annadanam", [a, b])[0]).toBe(a); });
  it("parses structured content safely", () => expect(parseBlogContent("## Head\n\nPara one\nline\n\n- item\n> quote\n<script>x</script>")).toEqual([
    { type: "h2", text: "Head" }, { type: "p", text: "Para one line" }, { type: "li", text: "item" }, { type: "quote", text: "quote" }, { type: "p", text: "<script>x</script>" },
  ]));
  it("slug rules", () => { expect(isValidSlug("annadanam-guide")).toBe(true); expect(isValidSlug("Bad Slug")).toBe(false); expect(isValidSlug("a--b")).toBe(false); });
});
