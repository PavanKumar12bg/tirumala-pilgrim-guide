import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ voice: vi.fn(), remove: vi.fn(), translate: vi.fn(), publish: vi.fn(), invalidate: vi.fn(), success: vi.fn(), error: vi.fn(), data: { draft: null as any, live: null as any } }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: m.invalidate }), useQuery: (q: any) => q.queryKey[0] === "admin_voice_ann" ? { data: m.data } : { data: null } }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/voice-announcement.functions", () => ({ generateVoice: m.voice, deleteAnnouncement: m.remove, createAndTranslate: m.translate, publishAnnouncement: m.publish }));
vi.mock("sonner", () => ({ toast: { success: m.success, error: m.error } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => { const chain: any = { select: () => chain, eq: () => Promise.resolve({ data: [{ lang: "te", text_status: "ready" }, { lang: "en", text_status: "ready" }], error: null }) }; return chain; } } }));
import { VoiceAnnouncementAdmin } from "./VoiceAnnouncementAdmin";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.clearAllMocks(); m.data = { draft: null, live: null }; m.invalidate.mockResolvedValue(undefined); vi.spyOn(window, "confirm").mockReturnValue(true); });
it("Delete checks the result and refreshes public and admin queries even on cleanup failure", async () => {
  m.data.live = { id, source_text: "Test", source_lang: "en", langs: [], status: "published" };
  m.remove.mockResolvedValue({ ok: false, deleted: true, error: "Audio cleanup failed" });
  render(<VoiceAnnouncementAdmin />);
  fireEvent.click(screen.getByRole("button", { name: "Delete", exact: true }));
  await waitFor(() => expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["voice_announcement"] }));
  expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["admin_voice_ann"] });
  expect(m.success).not.toHaveBeenCalled(); expect(m.error).toHaveBeenCalledWith("Audio cleanup failed");
  expect(screen.getByRole("button", { name: "Retry audio cleanup" })).toBeEnabled();
});
it("one thrown language call does not stop remaining languages and busy clears", async () => {
  m.translate.mockResolvedValue({ ok: true, id });
  m.voice.mockRejectedValueOnce(new Error("Voice request failed")).mockResolvedValueOnce({ ok: true });
  render(<VoiceAnnouncementAdmin />);
  fireEvent.change(screen.getByLabelText("Announcement"), { target: { value: "Test announcement" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate 7 languages and voices" }));
  await waitFor(() => expect(m.voice).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole("button", { name: "Generate 7 languages and voices" })).toBeEnabled());
  expect(m.voice.mock.calls[1]?.[0]).toEqual({ data: { id, lang: "en" } });
});
it("successful deletion alone reports Deleted", async () => {
  m.data.live = { id, source_text: "Test", source_lang: "en", langs: [] };
  m.remove.mockResolvedValue({ ok: true }); render(<VoiceAnnouncementAdmin />);
  fireEvent.click(screen.getByRole("button", { name: "Delete", exact: true }));
  await waitFor(() => expect(m.success).toHaveBeenCalledWith("Deleted"));
});
