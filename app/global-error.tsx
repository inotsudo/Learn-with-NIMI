"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
            background: "linear-gradient(to bottom right, #eef2ff, #faf5ff, #fdf2f8)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "1.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              padding: "2rem",
              maxWidth: "28rem",
              width: "100%",
            }}
          >
            <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>🙈</p>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1f2937", marginBottom: "0.5rem" }}>
              Oops! Something went wrong
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
              Don&apos;t worry, it&apos;s not your fault. Let&apos;s try that again!
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: "linear-gradient(to right, #9333ea, #4f46e5)",
                color: "#fff",
                fontWeight: 700,
                borderRadius: "1rem",
                padding: "0.75rem 1.5rem",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
