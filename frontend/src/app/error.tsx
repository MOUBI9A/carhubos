"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * A recoverable boundary around app pages. Without it a client render error
 * only shows the framework's generic broken-page screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CarHub page render failed", error);
  }, [error]);

  return (
    <main role="alert" className="min-h-[65vh] flex flex-col items-center justify-center px-6 text-center gap-5">
      <div className="p-5 rounded-2xl bg-danger/10 border border-danger/20">
        <AlertTriangle className="h-8 w-8 text-danger" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">This page couldn't load</h1>
      <p className="max-w-md text-sm text-text-muted">
        This page encountered an unexpected error. Retry without changing records,
        or return to your home screen.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 font-semibold"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Retry page
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-hairline px-4 py-2 text-foreground"
        >
          Go to home
        </Link>
      </div>
      {error.digest && <p className="text-xs text-text-faint">Reference: {error.digest}</p>}
    </main>
  );
}
