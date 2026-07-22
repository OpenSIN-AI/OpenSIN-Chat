// SPDX-License-Identifier: MIT

import { CaretDown, Check } from "@phosphor-icons/react";
import { useState } from "react";

interface WorkDetailsProps {
  messages?: any[];
  active?: boolean;
}

export default function WorkDetails({ messages = [], active = false }: WorkDetailsProps) {
  const [open, setOpen] = useState(active);

  if (!messages.length) return null;

  return (
    <section className="rounded-xl border border-theme-border bg-theme-bg-secondary/50">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          {active ? (
            <>
              <span className="absolute h-2 w-2 rounded-full bg-theme-text-secondary opacity-20 motion-safe:animate-ping" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-theme-text-secondary" />
            </>
          ) : (
            <Check size={14} weight="bold" className="text-theme-text-secondary" />
          )}
        </span>

        <span className="flex-1 text-xs font-medium text-theme-text-secondary">
          {active ? "Arbeitet an der Aufgabe" : `${messages.length} Arbeitsschritte`}
        </span>

        <CaretDown
          size={13}
          className={["text-theme-text-muted transition-transform", open ? "rotate-180" : ""].join(" ")}
        />
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-200",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="border-t border-theme-border px-3 py-2">
            {messages.map((message, index) => (
              <div key={message.uuid || index} className="flex items-start gap-2 py-1 text-xs text-theme-text-muted">
                <Check size={12} className="mt-0.5 shrink-0" />
                <span>{message.content}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
