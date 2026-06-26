"use client";

export default function FloatingStickers() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div
        className="absolute top-20 left-10 text-yellow-300 animate-bounce text-2xl"
        style={{ animationDelay: "0s" }}
      >
        ⭐
      </div>
      <div
        className="absolute top-40 right-20 text-pink-300 animate-bounce text-2xl"
        style={{ animationDelay: "1s" }}
      >
        🌟
      </div>
      <div
        className="absolute bottom-40 left-20 text-blue-300 animate-bounce text-2xl"
        style={{ animationDelay: "2s" }}
      >
        ✨
      </div>
      <div
        className="absolute bottom-20 right-10 text-green-300 animate-bounce text-2xl"
        style={{ animationDelay: "0.5s" }}
      >
        🎈
      </div>
      <div
        className="absolute top-60 left-1/4 theme-text-muted animate-bounce text-xl"
        style={{ animationDelay: "1.5s" }}
      >
        💫
      </div>
      <div
        className="absolute bottom-60 right-1/4 text-orange-300 animate-bounce text-xl"
        style={{ animationDelay: "2.5s" }}
      >
        🌈
      </div>
    </div>
  );
}
