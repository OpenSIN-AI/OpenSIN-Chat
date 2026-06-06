import System from "@/models/system";
import paths from "@/utils/paths";
import {
  BookOpen,
  DiscordLogo,
  GithubLogo,
  Briefcase,
  Envelope,
  Globe,
  HouseLine,
  Info,
  LinkSimple,
} from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import SettingsButton from "../SettingsButton";
import { isMobile } from "react-device-detect";
import { Tooltip } from "react-tooltip";
import { Link } from "react-router-dom";

export const MAX_ICONS = 3;
export const ICON_COMPONENTS = {
  BookOpen: BookOpen,
  DiscordLogo: DiscordLogo,
  GithubLogo: GithubLogo,
  Envelope: Envelope,
  LinkSimple: LinkSimple,
  HouseLine: HouseLine,
  Globe: Globe,
  Briefcase: Briefcase,
  Info: Info,
};

// Standard-Icons des Footers. Zentral definiert, damit Links, Tooltips und
// Accessibility-Labels nur an einer Stelle gepflegt werden müssen.
const DEFAULT_FOOTER_ITEMS = [
  {
    key: "github",
    Icon: GithubLogo,
    url: paths.github(),
    ariaLabel: "OpenAfD Chat auf GitHub ansehen",
    tooltip: "Quellcode auf GitHub ansehen",
  },
  {
    key: "docs",
    Icon: BookOpen,
    url: paths.docs(),
    ariaLabel: "Dokumentation öffnen",
    tooltip: "OpenAfD Chat Hilfe-Dokumentation öffnen",
  },
  {
    key: "discord",
    Icon: DiscordLogo,
    url: paths.discord(),
    ariaLabel: "Dem Discord-Server beitreten",
    tooltip: "Dem OpenAfD Chat Discord beitreten",
  },
];

const ICON_LINK_CLASSES =
  "transition-all duration-300 flex items-center justify-center p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

export default function Footer() {
  const [footerData, setFooterData] = useState(false);

  useEffect(() => {
    async function fetchFooterData() {
      try {
        const { footerData } = await System.fetchCustomFooterIcons();
        setFooterData(Array.isArray(footerData) ? footerData : []);
      } catch (error) {
        console.error("Footer-Icons konnten nicht geladen werden:", error);
        setFooterData([]);
      }
    }
    fetchFooterData();
  }, []);

  // Warten auf eine erste Antwort (nicht `false`), um ein Aufpoppen zu vermeiden.
  if (footerData === false) return null;

  const hasCustomIcons = Array.isArray(footerData) && footerData.length > 0;

  return (
    <div className="flex justify-center mb-2">
      <nav
        aria-label="Footer-Links"
        className="flex flex-wrap items-center justify-center gap-3"
      >
        {hasCustomIcons
          ? footerData.map((item, index) => {
              const IconComponent =
                ICON_COMPONENTS?.[item.icon] ?? ICON_COMPONENTS.Info;
              return (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={ICON_LINK_CLASSES}
                  aria-label={item.url}
                  data-tooltip-id="footer-item"
                  data-tooltip-content={item.url}
                >
                  <IconComponent
                    weight="fill"
                    className="h-5 w-5"
                    color="var(--theme-sidebar-footer-icon-fill)"
                  />
                </a>
              );
            })
          : DEFAULT_FOOTER_ITEMS.map(
              ({ key, Icon, url, ariaLabel, tooltip }) => (
                <Link
                  key={key}
                  to={url}
                  target="_blank"
                  rel="noreferrer"
                  className={ICON_LINK_CLASSES}
                  aria-label={ariaLabel}
                  data-tooltip-id="footer-item"
                  data-tooltip-content={tooltip}
                >
                  <Icon
                    weight="fill"
                    className="h-5 w-5 text-white light:text-slate-800"
                  />
                </Link>
              )
            )}
        {!isMobile && <SettingsButton />}
      </nav>
      <Tooltip
        id="footer-item"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </div>
  );
}
