"use client";

import { forwardRef, useState } from "react";
import { getStorageUrl } from "@/lib/queries";

interface Props {
  imageUrl: string;
  side: "left" | "right";
}

const IllustrationPage = forwardRef<HTMLDivElement, Props>(({ imageUrl, side }, ref) => {
  const [loaded, setLoaded] = useState(false);
  const url = getStorageUrl(imageUrl);

  return (
    <div ref={ref} className="w-full h-full relative overflow-hidden select-none" style={{ background: "#faf6ee" }}>
      <img
        src={url}
        alt=""
        onLoad={() => setLoaded(true)}
        draggable={false}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />

      {!loaded && (
        <div className="absolute inset-0 bg-[#faf6ee] flex items-center justify-center">
          <div className="w-8 h-8 border-3 theme-border-strong border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Gutter shadow */}
      {side === "left" && (
        <div className="absolute top-0 bottom-0 right-0 w-6 pointer-events-none"
          style={{ background: "linear-gradient(to right, transparent, rgba(0,0,0,0.06))" }} />
      )}
      {side === "right" && (
        <div className="absolute top-0 bottom-0 left-0 w-6 pointer-events-none"
          style={{ background: "linear-gradient(to left, transparent, rgba(0,0,0,0.06))" }} />
      )}
    </div>
  );
});

IllustrationPage.displayName = "IllustrationPage";
export default IllustrationPage;
