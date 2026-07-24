// SPDX-License-Identifier: MIT
//
// Documentation landing page shown at /docs. Audience-aware hero cards plus
// category overview filtered to the active User / Developer mode.
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Rocket } from "@phosphor-icons/react/dist/csr/Rocket";
import { Code } from "@phosphor-icons/react/dist/csr/Code";
import { Stack } from "@phosphor-icons/react/dist/csr/Stack";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { CloudArrowUp } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { Shield } from "@phosphor-icons/react/dist/csr/Shield";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { User } from "@phosphor-icons/react/dist/csr/User";
import { Terminal } from "@phosphor-icons/react/dist/csr/Terminal";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import {
  docsHref,
  getCategoryLabel,
  getGroupedDocs,
  type DocCategory,
  type DocsAudience,
} from "./docsManifest";

export const CATEGORY_ICONS: Record<DocCategory, Icon> = {
  "getting-started": Rocket,
  api: Code,
  architecture: Stack,
  "data-sources": Database,
  deployment: CloudArrowUp,
  operations: Shield,
};

type DocsLandingProps = {
  audience: DocsAudience;
  onAudienceChange: (audience: DocsAudience) => void;
};

export default function DocsLanding({
  audience,
  onAudienceChange,
}: DocsLandingProps) {
  const { t } = useTranslation();
  const grouped = getGroupedDocs(audience);

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-balance mb-3">
          {t("common.docsTitle")}
        </h1>
        <p className="text-theme-text-secondary text-lg max-w-2xl text-pretty">
          {t("common.docsLandingSubtitle")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <button
          type="button"
          onClick={() => onAudienceChange("user")}
          className={`group text-left flex flex-col gap-3 rounded-xl border p-6 transition-colors ${
            audience === "user"
              ? "border-primary-button bg-theme-bg-secondary ring-1 ring-primary-button/40"
              : "border-theme-sidebar-border bg-theme-bg-secondary hover:border-primary-button"
          }`}
          aria-pressed={audience === "user"}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-button/10 text-primary-button">
              <User className="w-5 h-5" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold text-theme-text-primary">
              {t("common.docsAudienceUserTitle")}
            </h2>
          </div>
          <p className="text-sm text-theme-text-secondary leading-relaxed text-pretty">
            {t("common.docsAudienceUserDesc")}
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-button mt-auto">
            {t("common.docsAudienceUserCta")}
            <CaretRight
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onAudienceChange("developer")}
          className={`group text-left flex flex-col gap-3 rounded-xl border p-6 transition-colors ${
            audience === "developer"
              ? "border-primary-button bg-theme-bg-secondary ring-1 ring-primary-button/40"
              : "border-theme-sidebar-border bg-theme-bg-secondary hover:border-primary-button"
          }`}
          aria-pressed={audience === "developer"}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-button/10 text-primary-button">
              <Terminal className="w-5 h-5" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold text-theme-text-primary">
              {t("common.docsAudienceDeveloperTitle")}
            </h2>
          </div>
          <p className="text-sm text-theme-text-secondary leading-relaxed text-pretty">
            {t("common.docsAudienceDeveloperDesc")}
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-button mt-auto">
            {t("common.docsAudienceDeveloperCta")}
            <CaretRight
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary mb-6">
        {audience === "user"
          ? t("common.docsAudienceUserBrowse")
          : t("common.docsAudienceDeveloperBrowse")}
      </p>

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
                  {getCategoryLabel(group.category, t)}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.entries.map((entry) => (
                  <Link
                    key={entry.slug}
                    to={docsHref(entry.slug, audience)}
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
