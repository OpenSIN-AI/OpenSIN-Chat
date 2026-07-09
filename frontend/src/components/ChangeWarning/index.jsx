// SPDX-License-Identifier: MIT

/**
 * ChangeWarningModal
 * A simple confirmation dialog shown when the user is about to make a
 * potentially destructive configuration change. Split warningText on "\n"
 * so multi-line warning strings render as separate paragraphs.
 *
 * Props:
 *   warningText  {string}   - Warning body. Split on "\n" for multiple lines.
 *   onClose      {function} - Called when the user dismisses (X or Cancel).
 *   onConfirm    {function} - Called when the user confirms the action.
 */
export default function ChangeWarningModal({ warningText, onClose, onConfirm }) {
  // Split on real newlines as well as the literal two-character "\n" sequence,
  // since callers (and JSX string attributes) may pass either form.
  const lines = (warningText ?? "")
    .split(/\\n|\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-warning-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="relative w-full max-w-md rounded-lg bg-main-gradient p-6 shadow-xl">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 text-white/60 hover:text-white"
        >
          ✕
        </button>

        <h2
          id="change-warning-title"
          className="mb-4 text-lg font-semibold text-white"
        >
          Warning
        </h2>

        <div className="mb-6 space-y-2 text-sm text-white/80">
          {lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
