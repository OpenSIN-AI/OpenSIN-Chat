// SPDX-License-Identifier: MIT

import { DotsThree } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface MessageMoreMenuProps {
  children: ReactNode;
}

export default function MessageMoreMenu({ children }: MessageMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Weitere Aktionen"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-muted hover:bg-theme-bg-secondary hover:text-theme-text-primary"
      >
        <DotsThree size={17} weight="bold" />
      </button>

      {open && (
        <div className="absolute bottom-9 left-0 z-40 min-w-44 rounded-xl border border-theme-border bg-theme-bg-primary p-1 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}
