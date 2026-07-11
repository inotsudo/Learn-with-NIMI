"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error; // digest available but not surfaced to avoid leaking internals
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            textAlign: "center",
            background: "#F9FAFB",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "1.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
              padding: "2.5rem 2rem",
              maxWidth: "26rem",
              width: "100%",
            }}
          >
            <p style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🌿</p>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#111827", marginBottom: "0.5rem" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6B7280", marginBottom: "1.75rem", lineHeight: 1.6 }}>
              Nimi bumped into a jungle vine! Don&apos;t worry — your progress is safe.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => reset()}
                style={{
                  background: "#15803D",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  borderRadius: "0.875rem",
                  padding: "0.65rem 1.5rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{
                  background: "#F3F4F6",
                  color: "#374151",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  borderRadius: "0.875rem",
                  padding: "0.65rem 1.5rem",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
