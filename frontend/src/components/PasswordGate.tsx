// Purpose: Simple password gate component for demo access
// Docs: PasswordGate.doc.md
import React, { useState } from "react";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auth-Logik unverändert (nur Demozweck)
    if (password === "Simone123") {
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b0d12] via-[#0b0d12] to-[#0f1419] px-4 font-sans">
      {/* Hintergrund-Akzente (weicher, ohne Pixel-Raster) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60rem 40rem at 50% -10%, rgba(37,99,235,0.22), transparent 60%), radial-gradient(40rem 30rem at 100% 110%, rgba(37,99,235,0.10), transparent 60%)",
        }}
      />

      <main className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            OpenAfD Chat
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Sovereigner Zugang — bitte authentifizieren
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span className="text-xs font-medium text-blue-300">
              Demo-Umgebung — Zugang nur mit Passwort
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="demo-password"
                className="text-sm font-medium text-slate-300"
              >
                Passwort
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="demo-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="••••••••"
                  aria-invalid={error}
                  className={`w-full rounded-lg border bg-[#0b0d12] py-2.5 pl-10 pr-4 text-white placeholder:text-slate-600 outline-none transition focus:ring-2 ${
                    error
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-white/10 focus:border-blue-500 focus:ring-blue-500/30"
                  }`}
                  autoFocus
                />
              </div>
              {error && (
                <p className="flex items-center gap-1.5 text-sm text-red-400" role="alert">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m15 9-6 6M9 9l6 6" />
                  </svg>
                  Falsches Passwort. Bitte erneut versuchen.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 active:scale-[0.99]"
            >
              Zugang erhalten
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} OpenAfD Chat · Nur zu Demonstrationszwecken
        </p>
      </main>
    </div>
  );
}
