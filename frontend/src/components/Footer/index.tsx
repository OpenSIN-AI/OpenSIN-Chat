// SPDX-License-Identifier: MIT
import React from "react";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { GithubLogo } from "@phosphor-icons/react/dist/csr/GithubLogo";
import { Briefcase } from "@phosphor-icons/react/dist/csr/Briefcase";
import { Envelope } from "@phosphor-icons/react/dist/csr/Envelope";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { HouseLine } from "@phosphor-icons/react/dist/csr/HouseLine";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { LinkSimple } from "@phosphor-icons/react/dist/csr/LinkSimple";
import AccountMenu from "./AccountMenu";
import useFooterSettings from "@/hooks/useFooterSettings";

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

/**
 * Icon map retained for the Footer customization settings page
 * (see pages/GeneralSettings/Settings/components/FooterCustomization).
 */
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

/**
 * Bottom of the sidebar. Renders a v0-style account menu: an identity
 * trigger (avatar + name + subtitle) that opens an upward popup with
 * Profile, Settings, Documentation, Feedback, theme + language
 * preferences and sign in / sign out.
 */
export default function Footer() {
  const { footerIcons } = useFooterSettings();
  const configuredIcons = footerIcons.filter(
    (item): item is { icon: FooterIconName; url: string } =>
      Boolean(item?.icon && item?.url),
  );

  return (
    <>
      {configuredIcons.length > 0 && (
        <nav
          aria-label="Footer links"
          className="flex items-center gap-1 px-3 pb-1.5"
        >
          {configuredIcons.map((item, index) => {
            const IconComponent =
              ICON_COMPONENTS[item.icon] ?? ICON_COMPONENTS.Info;
            return (
              <a
                key={`${item.url}-${index}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={item.url}
                title={item.url}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03] text-theme-text-secondary transition-colors hover:bg-white/[0.08] hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary light:border-zinc-200 light:bg-zinc-50 light:hover:bg-zinc-100 light:hover:text-zinc-900"
              >
                <IconComponent
                  weight="fill"
                  className="h-4 w-4"
                  color="var(--theme-sidebar-footer-icon-fill)"
                  aria-hidden="true"
                />
              </a>
            );
          })}
        </nav>
      )}
      <AccountMenu />
    </>
  );
}
