// SPDX-License-Identifier: MIT
//
// Right-hand "On this page" table of contents with scroll-spy. Receives the
// heading outline extracted by DocsMarkdown and highlights the heading nearest
// the top of the viewport as the reader scrolls.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DocHeading } from "./DocsMarkdown";

export default function DocsToc({
  headings,
  scrollRoot,
}: {
  headings: DocHeading[];
  scrollRoot: HTMLElement | null;
}) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (headings.length === 0) return;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    setActiveId(headings[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: scrollRoot ?? null,
        // Trigger when a heading is in the top portion of the viewport.
        rootMargin: "0px 0px -70% 0px",
        threshold: [0, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings, scrollRoot]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  if (headings.length < 2) return null;

  return (
    <nav
      aria-label={t("common.docsOnThisPage")}
      className="text-sm flex flex-col gap-2"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary">
        {t("common.docsOnThisPage")}
      </p>
      <ul className="flex flex-col gap-1 border-l border-theme-sidebar-border">
        {headings.map((heading) => {
          const isActive = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                aria-current={isActive ? "location" : undefined}
                className={`block py-1 -ml-px border-l-2 transition-colors ${
                  heading.level === 3 ? "pl-6" : "pl-3"
                } ${
                  isActive
                    ? "border-primary-button text-theme-text-primary font-medium"
                    : "border-transparent text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-sidebar-border"
                }`}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
