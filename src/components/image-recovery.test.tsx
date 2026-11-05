import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReliableImage } from "./ReliableImage";
import { PlaceImage } from "./PlaceImage";

vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/places", () => ({ catIcon: () => "", catKey: (category: string) => category }));

describe("image request recovery", () => {
  it("retries a place photo when a fresh source replaces a failed URL", () => {
    const view = render(<PlaceImage src="/expired.webp" category="temple" alt="Temple" />);
    fireEvent.error(screen.getByRole("img", { name: "Temple" }));
    expect(screen.getByRole("img", { name: "Temple — noPhoto" }).tagName).toBe("DIV");
    view.rerender(<PlaceImage src="/fresh.webp" category="temple" alt="Temple" />);
    expect(screen.getByRole("img", { name: "Temple" }).getAttribute("src")).toBe("/fresh.webp");
  });

  it("does not request a failed image repeatedly and resets for a new source", () => {
    const onError = vi.fn();
    const view = render(<ReliableImage src="/broken.jpg" alt="Hero" onError={onError} />);
    fireEvent.error(screen.getByRole("img", { name: "Hero" }));
    expect(screen.getByRole("img", { name: "Hero" }).getAttribute("src")).toMatch(/^data:image/);
    fireEvent.error(screen.getByRole("img", { name: "Hero" }));
    expect(onError).toHaveBeenCalledTimes(1);
    view.rerender(<ReliableImage src="/replacement.jpg" alt="Hero" onError={onError} />);
    expect(screen.getByRole("img", { name: "Hero" }).getAttribute("src")).toBe("/replacement.jpg");
  });
});