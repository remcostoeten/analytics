"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-red-500/20 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 text-red-500"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-red-500 mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground mb-1">
                {error.message || "An unexpected error occurred while loading the dashboard"}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground/60 font-mono mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={reset}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
