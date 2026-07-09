// SPDX-License-Identifier: MIT
import { Link } from "react-router-dom";

/**
 * ErrorBoundaryFallback
 * Default UI rendered by react-error-boundary when an unhandled render error
 * bubbles up to the nearest <ErrorBoundary>.
 *
 * Props (injected by react-error-boundary):
 *   error                {Error|null|undefined}
 *   resetErrorBoundary   {function}
 */
export default function ErrorBoundaryFallback({ error, resetErrorBoundary }) {
  const message = error?.message ?? null;
  const stack = error?.stack ?? null;

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-main-gradient p-8 text-center text-white"
    >
      <h1 className="text-2xl font-bold">Something went wrong</h1>

      {message && (
        <p className="max-w-prose text-sm text-white/70">{message}</p>
      )}

      {import.meta.env.DEV && stack && (
        <pre className="max-h-64 w-full max-w-2xl overflow-auto rounded bg-black/30 p-4 text-left text-xs text-white/60">
          {stack}
        </pre>
      )}

      <div className="flex gap-4">
        <button
          aria-label="Try Again"
          onClick={resetErrorBoundary}
          className="rounded bg-white/10 px-6 py-2 text-sm font-medium hover:bg-white/20"
        >
          Try Again
        </button>

        <Link
          to="/"
          className="rounded bg-primary px-6 py-2 text-sm font-medium hover:opacity-90"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
