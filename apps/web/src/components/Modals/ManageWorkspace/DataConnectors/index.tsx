// SPDX-License-Identifier: MIT
import ConnectorImages from "@/components/DataConnectorOption/media";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useTranslation } from "react-i18next";
import GithubOptions from "./Connectors/Github";
import GitlabOptions from "./Connectors/Gitlab";
import YoutubeOptions from "./Connectors/Youtube";
import ConfluenceOptions from "./Connectors/Confluence";
import DrupalWikiOptions from "./Connectors/DrupalWiki";
import { useState } from "react";
import ConnectorOption from "./ConnectorOption";
import WebsiteDepthOptions from "./Connectors/WebsiteDepth";
import ObsidianOptions from "./Connectors/Obsidian";
import PaperlessNgxOptions from "./Connectors/PaperlessNgx";

export const getDataConnectors = (t) => ({
  github: {
    name: t("connectors.github.name"),
    image: ConnectorImages.github,
    description: t("connectors.github.description"),
    options: <GithubOptions />,
  },
  gitlab: {
    name: t("connectors.gitlab.name"),
    image: ConnectorImages.gitlab,
    description: t("connectors.gitlab.description"),
    options: <GitlabOptions />,
  },
  "youtube-transcript": {
    name: t("connectors.youtube.name"),
    image: ConnectorImages.youtube,
    description: t("connectors.youtube.description"),
    options: <YoutubeOptions />,
  },
  "website-depth": {
    name: t("connectors.website-depth.name"),
    image: ConnectorImages.websiteDepth,
    description: t("connectors.website-depth.description"),
    options: <WebsiteDepthOptions />,
  },
  confluence: {
    name: t("connectors.confluence.name"),
    image: ConnectorImages.confluence,
    description: t("connectors.confluence.description"),
    options: <ConfluenceOptions />,
  },
  drupalwiki: {
    name: "Drupal Wiki",
    image: ConnectorImages.drupalwiki,
    description: "Import Drupal Wiki spaces in a single click.",
    options: <DrupalWikiOptions />,
  },
  obsidian: {
    name: "Obsidian",
    image: ConnectorImages.obsidian,
    description: "Import Obsidian vault in a single click.",
    options: <ObsidianOptions />,
  },
  "paperless-ngx": {
    name: "Paperless-ngx",
    image: ConnectorImages.paperlessNgx,
    description: "Import documents from your Paperless-ngx instance.",
    options: <PaperlessNgxOptions />,
  },
});

export default function DataConnectors() {
  const { t } = useTranslation();
  const [selectedConnector, setSelectedConnector] = useState("github");
  const [searchQuery, setSearchQuery] = useState("");
  const DATA_CONNECTORS = getDataConnectors(t);

  const filteredConnectors = Object.keys(DATA_CONNECTORS).filter((slug) =>
    DATA_CONNECTORS[slug].name
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="upload-modal grid min-h-0 min-w-0 gap-3 lg:h-[calc(88vh-164px)] lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
      <aside className="flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-xl bg-theme-bg-secondary lg:min-h-0">
        <div className="shrink-0 p-3">
          <label className="relative block">
            <span className="sr-only">
              {t("connectors.search-placeholder")}
            </span>
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder={t("connectors.search-placeholder")}
              className="h-10 w-full rounded-lg border-none bg-theme-settings-input-bg py-2 pl-10 pr-3 text-sm text-theme-text-primary outline-none placeholder:text-theme-settings-input-placeholder focus:bg-theme-bg-hover"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
          {filteredConnectors.length > 0 ? (
            filteredConnectors.map((connectorSlug) => (
              <ConnectorOption
                key={connectorSlug}
                slug={connectorSlug}
                selectedConnector={selectedConnector}
                setSelectedConnector={setSelectedConnector}
                image={DATA_CONNECTORS[connectorSlug].image}
                name={DATA_CONNECTORS[connectorSlug].name}
                description={DATA_CONNECTORS[connectorSlug].description}
              />
            ))
          ) : (
            <p className="p-6 text-center text-sm text-theme-text-secondary">
              {t("connectors.no-connectors")}
            </p>
          )}
        </div>
      </aside>
      <section
        className="min-h-[420px] min-w-0 overflow-auto rounded-xl bg-theme-bg-secondary p-4 text-theme-text-primary sm:p-5 lg:min-h-0"
        aria-live="polite"
      >
        {DATA_CONNECTORS[selectedConnector].options}
      </section>
    </div>
  );
}
