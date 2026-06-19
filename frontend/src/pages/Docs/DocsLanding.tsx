// SPDX-License-Identifier: MIT
//
// Documentation landing page shown at /docs. Presents an overview of every
// category with its pages as cards, instead of redirecting straight into a
// single document.
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Rocket } from "@phosphor-icons/react/dist/csr/Rocket";
import { Code } from "@phosphor-icons/react/dist/csr/Code";
import { Stack } from "@phosphor-icons/react/dist/csr/Stack";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { CloudArrowUp } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import paths from "@/utils/paths";
import {
  CATEGORY_LABELS,
  getGroupedDocs,
  type DocCategory,
} from "./docsManifest";

const CATEGORY_ICONS: Record<DocCategory, Icon> = {
  "getting-started": Rocket,
  api: Code,
  architecture: Stack,
  "data-sources": Database,
  deployment: CloudArrowUp,
};

export default function DocsLanding() {
  const { t } = useTranslation();
  const grouped = getGroupedDocs();

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-balance mb-3">
          {t("common.developerDocs")}
        </h1>
        <p className="text-theme-text-secondary text-lg max-w-2xl text-pretty">
          {t("common.docsLandingSubtitle")}
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {grouped.map((group) => {
          const CategoryIcon = CATEGORY_ICONS[group.category];
          return (
            <section key={group.category}>
              <div className="flex items-center gap-2 mb-4">
                <CategoryIcon
                  className="w-5 h-5 text-primary-button"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-theme-text-secondary">
                  {CATEGORY_LABELS[group.category]}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.entries.map((entry) => (
                  <Link
                    key={entry.slug}
                    to={paths.appDocs(`/${entry.slug}`)}
                    className="group flex flex-col gap-2 rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary p-5 transition-colors hover:border-primary-button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-theme-text-primary text-balance">
                        {entry.title}
                      </h3>
                      <CaretRight
                        className="w-4 h-4 shrink-0 mt-0.5 text-theme-text-secondary transition-transform group-hover:translate-x-0.5 group-hover:text-primary-button"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-sm text-theme-text-secondary leading-relaxed text-pretty">
                      {entry.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
