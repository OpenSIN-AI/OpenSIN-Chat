// SPDX-License-Identifier: MIT

import { useState } from "react";
import CitationPopover from "./CitationPopover";

interface InlineCitationProps {
  number: number;
  source: any;
  workspaceSlug?: string;
}

export default function InlineCitation({ number, source, workspaceSlug }: InlineCitationProps) {
  const [open, setOpen] = useState(false);

  if (!source) return null;

  return (
    <span className="relative inline-flex align-super">
      <button
        type="button"
        aria-label={`Quelle ${number}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="mx-0.5 inline-flex min-w-4 items-center justify-center rounded-md bg-theme-bg-secondary px-1 py-0.5 text-[9px] font-semibold leading-none text-theme-text-secondary transition-colors hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
      >
        {number}
      </button>

      {open && (
        <CitationPopover
          source={source}
          number={number}
          workspaceSlug={workspaceSlug}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}
