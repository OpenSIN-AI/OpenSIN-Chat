// SPDX-License-Identifier: MIT
// Purpose: Gemini-style source picker next to Deep Research mode.
// Docs: Categories Web / Email / Cloud / Machine; real connectors when ready,
//       otherwise marked "Coming soon". Selection is persisted for the session.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { Envelope } from "@phosphor-icons/react/dist/csr/Envelope";
import { Cloud } from "@phosphor-icons/react/dist/csr/Cloud";
import { Desktop } from "@phosphor-icons/react/dist/csr/Desktop";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Plug } from "@phosphor-icons/react/dist/csr/Plug";

export const DEEP_RESEARCH_SOURCES_EVENT = "deep-research-sources-change";
const STORAGE_KEY = "opensin_deep_research_sources";

export type DeepResearchSourceId =
  | "web"
  | "email"
  | "storage"
  | "machine";

type Connector = {
  id: string;
  labelKey: string;
  ready: boolean;
};

type SourceCategory = {
  id: DeepResearchSourceId;
  icon: typeof Globe;
  labelKey: string;
  /** Category itself is usable (e.g. Web always on) */
  ready: boolean;
  connectors: Connector[];
};

const SOURCE_CATEGORIES: SourceCategory[] = [
  {
    id: "web",
    icon: Globe,
    labelKey: "deepResearchSources.web",
    ready: true,
    connectors: [
      {
        id: "web-search",
        labelKey: "deepResearchSources.connectors.webSearch",
        ready: true,
      },
    ],
  },
  {
    id: "email",
    icon: Envelope,
    labelKey: "deepResearchSources.email",
    ready: false,
    connectors: [
      {
        id: "gmail",
        labelKey: "deepResearchSources.connectors.gmail",
        ready: false,
      },
    ],
  },
  {
    id: "storage",
    icon: Cloud,
    labelKey: "deepResearchSources.storage",
    ready: false,
    connectors: [
      {
        id: "google-drive",
        labelKey: "deepResearchSources.connectors.googleDrive",
        ready: false,
      },
      {
        id: "terrabox",
        labelKey: "deepResearchSources.connectors.terrabox",
        ready: false,
      },
    ],
  },
  {
    id: "machine",
    icon: Desktop,
    labelKey: "deepResearchSources.machine",
    ready: false,
    connectors: [
      {
        id: "oracle-vm",
        labelKey: "deepResearchSources.connectors.oracleVm",
        ready: false,
      },
      {
        id: "lightning-ai",
        labelKey: "deepResearchSources.connectors.lightningAi",
        ready: false,
      },
      {
        id: "local-pc",
        labelKey: "deepResearchSources.connectors.localPc",
        ready: false,
      },
      {
        id: "mobile",
        labelKey: "deepResearchSources.connectors.mobile",
        ready: false,
      },
    ],
  },
];

function loadSelection(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(["web"]);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return new Set(["web"]);
    return new Set(parsed.map(String));
  } catch {
    return new Set(["web"]);
  }
}

function persistSelection(sel: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...sel]));
  } catch {
    /* ignore */
  }
}

export function getDeepResearchSourceIds(): string[] {
  return [...loadSelection()];
}

/**
 * Chip + dropdown shown next to the Deep Research mode button.
 */
export default function DeepResearchSources({
  visible = true,
}: {
  visible?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(loadSelection);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleConnector = useCallback((id: string, ready: boolean) => {
    if (!ready) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Keep at least web-search active
        if (id === "web-search" && next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      persistSelection(next);
      window.dispatchEvent(
        new CustomEvent(DEEP_RESEARCH_SOURCES_EVENT, {
          detail: { sources: [...next] },
        }),
      );
      return next;
    });
  }, []);

  if (!visible) return null;

  const activeCount = selected.size;
  const summary =
    activeCount <= 1
      ? t("deepResearchSources.summaryOne")
      : t("deepResearchSources.summaryMany", { count: activeCount });

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t("deepResearchSources.title")}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group border-none relative flex h-7 items-center gap-1 rounded-lg bg-theme-bg-tertiary/80 px-2 transition-colors hover:bg-theme-bg-tertiary"
      >
        <Plug
          size={13}
          className="shrink-0 text-theme-text-secondary group-hover:text-theme-text-primary"
        />
        <span className="text-xs font-medium text-theme-text-secondary group-hover:text-theme-text-primary whitespace-nowrap">
          {summary}
        </span>
        <CaretDown
          size={11}
          className="text-theme-text-secondary shrink-0"
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={t("deepResearchSources.title")}
            style={(() => {
              if (!buttonRef.current) return { top: 0, left: 0 };
              const r = buttonRef.current.getBoundingClientRect();
              return {
                position: "fixed" as const,
                top: r.bottom + 6,
                left: Math.max(12, Math.min(r.left, window.innerWidth - 300)),
              };
            })()}
            className="z-[1000] w-[min(280px,calc(100vw-24px))] overflow-hidden rounded-xl border border-white/[0.08] bg-theme-bg-secondary shadow-2xl light:border-zinc-200 light:bg-white"
          >
            <div className="px-3 pt-3 pb-1.5">
              <p className="text-xs font-semibold text-theme-text-primary">
                {t("deepResearchSources.title")}
              </p>
              <p className="text-[10px] text-theme-text-secondary mt-0.5 leading-snug">
                {t("deepResearchSources.subtitle")}
              </p>
            </div>
            <div className="py-1 max-h-[min(60vh,420px)] overflow-y-auto no-scroll">
              {SOURCE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="px-1.5 pb-1">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Icon
                        size={14}
                        className="text-theme-text-secondary shrink-0"
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-theme-text-secondary">
                        {t(cat.labelKey)}
                      </span>
                      {!cat.ready && (
                        <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-theme-bg-tertiary text-theme-text-secondary uppercase tracking-wide">
                          {t("deepResearchSources.comingSoon")}
                        </span>
                      )}
                    </div>
                    {cat.connectors.map((c) => {
                      const isOn = selected.has(c.id);
                      const disabled = !c.ready;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={isOn}
                          disabled={disabled}
                          onClick={() => toggleConnector(c.id, c.ready)}
                          className={`mx-1.5 mb-0.5 flex w-[calc(100%-0.75rem)] items-center gap-2 rounded-lg border-none px-2.5 py-2 text-left transition-colors ${
                            disabled
                              ? "cursor-not-allowed opacity-55"
                              : "cursor-pointer hover:bg-theme-sidebar-item-hover"
                          } ${isOn && !disabled ? "bg-theme-accent/10" : ""}`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isOn && !disabled
                                ? "border-theme-accent bg-theme-accent text-white"
                                : "border-theme-modal-border bg-transparent"
                            }`}
                          >
                            {isOn && !disabled && <Check size={10} weight="bold" />}
                          </span>
                          <span className="flex-1 text-sm text-theme-text-primary">
                            {t(c.labelKey)}
                          </span>
                          {!c.ready && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-theme-bg-tertiary text-theme-text-secondary uppercase tracking-wide">
                              {t("deepResearchSources.comingSoon")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
