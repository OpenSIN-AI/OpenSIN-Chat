// SPDX-License-Identifier: MIT
import React from "react";
import {
  BookOpen,
  GithubLogo,
  Briefcase,
  Envelope,
  Globe,
  HouseLine,
  Info,
  LinkSimple,
} from "@phosphor-icons/react";
import AccountMenu from "./AccountMenu";

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
  return <AccountMenu />;
}
