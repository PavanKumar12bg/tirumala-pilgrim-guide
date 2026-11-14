import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: () => ({ handler: (fn: unknown) => fn }),
    handler: (fn: unknown) => fn,
  }),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("./transport-data", () => ({
  PUBLIC_CATEGORY_COLS: "id,slug,template", PUBLIC_ITEM_COLS: "id", PUBLIC_OFFER_COLS: "id", PUBLIC_PROVIDER_COLS: "id",
  isTemplate: (value: string) => value === "route_guide", toPublicOffers: () => [],
}));
import { getPublicTransportCategory, listPublicTransportCategories } from "./transport.functions";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("transport public loading", () => {
  it("loads published transport with browser publishable settings when server settings are absent", async () => {
    vi.stubEnv("SUPABASE_URL", ""); vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_URL", "https://public.example.test");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const select = vi.fn(); const eq = vi.fn(); const order = vi.fn().mockResolvedValue({ data: [{ id: "c1", template: "route_guide" }], error: null });
    mocks.createClient.mockReturnValue({ from: () => ({ select }) });
    select.mockReturnValue({ eq }); eq.mockReturnValue({ order });
    const categories = await listPublicTransportCategories();
    expect(categories).toEqual([{ id: "c1", template: "route_guide" }]);
    expect(mocks.createClient.mock.calls[0]?.slice(0, 2)).toEqual(["https://public.example.test", "sb_publishable_test"]);
    expect(eq).toHaveBeenCalledWith("status", "published");
  });
  it("rejects a failed details read rather than presenting it as empty content", async () => {
    vi.stubEnv("SUPABASE_URL", "https://server.example.test");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const results: Record<string, unknown> = {
      transport_categories: { data: { id: "c1", template: "route_guide" }, error: null },
      transport_items: { data: null, error: { message: "Network unavailable" } },
      transport_offers: { data: [], error: null },
    };
    mocks.createClient.mockReturnValue({ from: (table: string) => {
      const chain = { select: () => chain, eq: () => chain, order: () => Promise.resolve(results[table]), maybeSingle: () => Promise.resolve(results[table]), then: (resolve: (value: unknown) => unknown) => Promise.resolve(results[table]).then(resolve) };
      return chain;
    } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(getPublicTransportCategory({ data: { slug: "tirupati-to-tirumala" } })).rejects.toThrow("Could not load transport information");
    } finally { log.mockRestore(); }
  });
});