"use client";

import { generateCertificateDataUrl, generateCertificateImageUrl } from "@/lib/certificateImage";

export interface ShareCertificateInput {
  childName: string;
  childId: string | null;
  language: string;
  storySlug: string;
  storyTitle: string;
  /** Link included in the message (absolute, or a path on this site); defaults to the current page. */
  url?: string;
}

/**
 * Shares the child's personalised story certificate with family — never into a
 * public feed.
 *
 *   1. Native share sheet with the certificate image (Android Chrome / iOS Safari).
 *   2. Otherwise WhatsApp, with a link to the uploaded certificate image.
 *   3. Otherwise WhatsApp with the text only.
 *
 * Never throws; resolves once the share sheet or WhatsApp tab has been opened.
 */
export async function shareCertificate({ childName, childId, language, storySlug, storyTitle, url }: ShareCertificateInput): Promise<void> {
  const pageUrl = !url ? window.location.href : url.startsWith("/") ? `${window.location.origin}${url}` : url;
  const name = childName || "My child";
  try {
    const dataUrl = await generateCertificateDataUrl(name, language).catch(() => null);
    if (dataUrl) {
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const file = new File([blob], `${name}-certificate.jpg`, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: `🎉 ${name} just completed "${storyTitle}" on NIMIPIKO!\n🔗 ${pageUrl}` });
        } catch { /* share sheet dismissed — nothing to do */ }
        return;
      }
    }

    const certPublicUrl = await generateCertificateImageUrl(name, language, childId ?? undefined, storySlug).catch(() => null);
    const message = certPublicUrl
      ? `🎉 ${name} just completed "${storyTitle}" on NIMIPIKO! 🎓\n\n📜 View certificate:\n${certPublicUrl}\n\n🔗 Start learning:\n${pageUrl}`
      : `🎉 ${name} just completed "${storyTitle}" on NIMIPIKO! 🎓\n\n🔗 ${pageUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  } catch {
    const message = `🎉 ${name} just completed "${storyTitle}" on NIMIPIKO! 🎓\n\n🔗 ${pageUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }
}
