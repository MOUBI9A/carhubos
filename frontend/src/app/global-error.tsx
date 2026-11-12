"use client";

import { useEffect } from "react";

/**
 * Fail-safe for errors thrown by the root layout itself, including providers.
 * Unlike app/error.tsx this must own the html/body nodes.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CarHub root layout failed", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#101114", color: "#f4f4f5" }}>
        <main style={{ maxWidth: 520, margin: "12vh auto", padding: 24, textAlign: "center" }}>
          <h1>This page couldn't load</h1>
          <p>An unexpected error interrupted this page. Retry or return to the home screen.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={reset} type="button" style={{ border: 0, padding: "12px 18px", borderRadius: 8, cursor: "pointer" }}>
              Retry page
            </button>
            {/* Root layout may itself be broken: use a hard navigation, not Next router. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "#93c5fd", padding: "12px 18px" }}>Go to home</a>
          </div>
          {error.digest && <small>Reference: {error.digest}</small>}
        </main>
      </body>
    </html>
  );
}
