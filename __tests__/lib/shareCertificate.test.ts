import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const gen = vi.hoisted(() => ({
  dataUrl: vi.fn<(name: string, lang: string) => Promise<string | null>>(),
  imageUrl: vi.fn<(name: string, lang: string, childId?: string, slug?: string) => Promise<string | null>>(),
}));
vi.mock("@/lib/certificateImage", () => ({
  generateCertificateDataUrl: gen.dataUrl,
  generateCertificateImageUrl: gen.imageUrl,
}));

import { shareCertificate } from "@/lib/shareCertificate";

const input = { childName: "Ketsia", childId: "child-1", language: "fr", storySlug: "the-talking-faces", storyTitle: "Nimi et les visages", url: "/stories/the-talking-faces" };

describe("shareCertificate — shares with family, never into a public feed", () => {
  let open: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gen.dataUrl.mockReset();
    gen.imageUrl.mockReset();
    open = vi.fn();
    vi.stubGlobal("open", open);
    vi.stubGlobal("fetch", vi.fn(async () => ({ blob: async () => new Blob(["x"], { type: "image/jpeg" }) })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error test cleanup of optional browser APIs
    delete navigator.canShare;
    // @ts-expect-error test cleanup of optional browser APIs
    delete navigator.share;
  });

  it("uses the phone share sheet with the certificate image when files can be shared", async () => {
    gen.dataUrl.mockResolvedValue("data:image/jpeg;base64,AAAA");
    const share = vi.fn(async () => {});
    Object.assign(navigator, { canShare: () => true, share });

    await shareCertificate(input);

    expect(share).toHaveBeenCalledTimes(1);
    const arg = (share.mock.calls[0] as unknown[])[0] as { files: File[]; text: string };
    expect(arg.files[0].name).toBe("Ketsia-certificate.jpg");
    expect(arg.text).toContain("Nimi et les visages");
    expect(arg.text).toContain(`${window.location.origin}/stories/the-talking-faces`);
    expect(open).not.toHaveBeenCalled();
    expect(gen.imageUrl).not.toHaveBeenCalled();
  });

  it("falls back to WhatsApp with a link to the certificate image", async () => {
    gen.dataUrl.mockResolvedValue(null);
    gen.imageUrl.mockResolvedValue("https://cdn.example/cert.jpg");

    await shareCertificate(input);

    expect(gen.imageUrl).toHaveBeenCalledWith("Ketsia", "fr", "child-1", "the-talking-faces");
    expect(open).toHaveBeenCalledTimes(1);
    const url = decodeURIComponent(String(open.mock.calls[0][0]));
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).toContain("https://cdn.example/cert.jpg");
  });

  it("still opens WhatsApp with text when certificate generation fails", async () => {
    gen.dataUrl.mockRejectedValue(new Error("no template"));
    gen.imageUrl.mockRejectedValue(new Error("upload failed"));

    await expect(shareCertificate(input)).resolves.toBeUndefined();

    expect(open).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain('Ketsia just completed "Nimi et les visages"');
  });
});
