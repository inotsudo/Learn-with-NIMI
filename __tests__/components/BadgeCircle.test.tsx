import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BadgeCircle from "@/components/stories/BadgeCircle";

// getMilestoneBadgeMeta returns null for unknown slugs
vi.mock("@/lib/milestoneBadges", () => ({
  getMilestoneBadgeMeta: (slug: string) => {
    if (slug === "milestone-100") return { emoji: "💯", label: "100 missions" };
    return null;
  },
}));

describe("BadgeCircle", () => {
  it("renders milestone emoji when slug matches", () => {
    const { container } = render(<BadgeCircle slug="milestone-100" size="md" />);
    expect(container.textContent).toContain("💯");
  });

  it("renders a fallback img for non-milestone slugs", () => {
    render(<BadgeCircle slug="some-story-badge" size="md" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/badges/some-story-badge.png");
  });

  it("renders the champion fallback when slug is null", () => {
    const { container } = render(<BadgeCircle slug={null} />);
    expect(container.textContent).toContain("🏅");
  });

  it("applies xl size class to the milestone container", () => {
    const { container } = render(<BadgeCircle slug="milestone-100" size="xl" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("w-32");
  });

  it("applies sm size class to the milestone container", () => {
    const { container } = render(<BadgeCircle slug="milestone-100" size="sm" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("w-10");
  });

  it("shows fallback champion when image errors", async () => {
    const { container } = render(<BadgeCircle slug="broken-badge" size="md" />);
    const img = screen.getByRole("img");
    // Simulate image load failure
    img.dispatchEvent(new Event("error"));
    // After error, the img should be replaced by fallback div
    await vi.waitFor(() => {
      expect(container.textContent).toContain("🏅");
    });
  });
});
