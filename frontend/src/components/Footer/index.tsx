// SPDX-License-Identifier: MIT
import React from "react";
import paths from "@/utils/paths";
import {
  BookOpen,
  GithubLogo,
  Briefcase,
  Envelope,
  Globe,
  HouseLine,
  Info,
  LinkSimple,
  Moon,
  Sun,
} from "@phosphor-icons/react";
import { isMobile } from "react-device-detect";
import { Tooltip } from "react-tooltip";
import { Link } from "react-router-dom";
import useFooterIcons from "@/hooks/useFooterIcons";
import { useTheme } from "@/hooks/useTheme";
import SettingsButton from "../SettingsButton";

export const MAX_ICONS = 3;
type FooterIconName =
  | "BookOpen"
  | "GithubLogo"
  | "Envelope"
  | "LinkSimple"
  | "HouseLine"
  | "Globe"
  | "Briefcase"
  | "Info";

type IconComponent = React.ComponentType<{
  weight?: string;
  className?: string;
  color?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export const ICON_COMPONENTS: Record<FooterIconName, IconComponent> = {
  BookOpen: BookOpen as IconComponent,
  GithubLogo: GithubLogo as IconComponent,
  Envelope: Envelope as IconComponent,
  LinkSimple: LinkSimple as IconComponent,
  HouseLine: HouseLine as IconComponent,
  Globe: Globe as IconComponent,
  Briefcase: Briefcase as IconComponent,
  Info: Info as IconComponent,
};

type FooterItem = {
  key: string;
  Icon: IconComponent;
  url: string;
  ariaLabel: string;
  tooltip: string;
};

const DEFAULT_FOOTER_ITEMS: FooterItem[] = [
  {
    key: "github",
    Icon: GithubLogo as IconComponent,
    url: paths.github(),
    ariaLabel: "OpenSIN Chat auf GitHub ansehen",
    tooltip: "Quellcode auf GitHub ansehen",
  },
  {
    key: "docs",
    Icon: BookOpen as IconComponent,
    url: paths.docs(),
    ariaLabel: "Dokumentation öffnen",
    tooltip: "OpenSIN Chat Hilfe-Dokumentation öffnen",
  },
];

const ICON_LINK_CLASSES =
  "transition-all duration-300 flex items-center justify-center p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

type CustomFooterItem = {
  icon: string;
  url: string;
};

function ThemeToggleButton() {
  const { isLight, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={ICON_LINK_CLASSES}
      aria-label={
        isLight ? "Zum dunklen Modus wechseln" : "Zum hellen Modus wechseln"
      }
      data-tooltip-id="footer-item"
      data-tooltip-content={
        isLight ? "Dunklen Modus aktivieren" : "Hellen Modus aktivieren"
      }
    >
      {isLight ? (
        <Moon
          weight="fill"
          className="h-5 w-5 text-white light:text-slate-800"
          aria-hidden="true"
        />
      ) : (
        <Sun
          weight="fill"
          className="h-5 w-5 text-white light:text-slate-800"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

export default function Footer() {
  const { footerData, isLoading } = useFooterIcons();

  if (isLoading) return null;

  const hasCustomIcons = Array.isArray(footerData) && footerData.length > 0;

  return (
    <div className="flex justify-center mb-2">
      <nav
        aria-label="Footer-Links"
        className="flex flex-wrap items-center justify-center gap-3"
      >
        {hasCustomIcons
          ? (footerData as CustomFooterItem[]).map((item, index) => {
              const IconComponent =
                ICON_COMPONENTS[item.icon as FooterIconName] ??
                ICON_COMPONENTS.Info;
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
                    aria-hidden="true"
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
                    aria-hidden="true"
                  />
                </Link>
              ),
            )}
        <ThemeToggleButton />
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
