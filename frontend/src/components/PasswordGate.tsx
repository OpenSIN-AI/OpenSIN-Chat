// Purpose: Simple password gate component for demo access
// Docs: PasswordGate.doc.md
import React, { useState } from "react";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Simone123") {
      setUnlocked(true);
    } else {
      alert("Falsches Passwort!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-theme-bg-container">
      <h1 className="text-2xl font-bold mb-4 text-white">OpenAfD Chat</h1>
      <p className="text-sm text-gray-400 mb-6">Demo-Zugang — Passwort eingeben:</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          className="px-4 py-2 rounded-lg bg-theme-bg-secondary border border-theme-modal-border text-white w-64"
          autoFocus
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          Zugang
        </button>
      </form>
    </div>
  );
}
