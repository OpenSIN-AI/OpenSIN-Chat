// SPDX-License-Identifier: MIT
// Purpose: Product-level navigation constrained to the six CEO-audit focus areas.
import { NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { ChatsCircle } from "@phosphor-icons/react/dist/csr/ChatsCircle";
import { Files } from "@phosphor-icons/react/dist/csr/Files";
import { Buildings } from "@phosphor-icons/react/dist/csr/Buildings";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { GearSix } from "@phosphor-icons/react/dist/csr/GearSix";

type PrimaryNavigationItem = {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
  isActive: (pathname: string, search: string) => boolean;
};

const PRIMARY_NAVIGATION: PrimaryNavigationItem[] = [
  {
    id: "chats-projects",
    labelKey: "sidebar.primary.chatsProjects",
    href: "/",
    icon: ChatsCircle,
    isActive: (pathname, search) => pathname === "/" && search === "",
  },
  {
    id: "sources-documents",
    labelKey: "sidebar.primary.sourcesDocuments",
    href: "/?view=sources",
    icon: Files,
    isActive: (pathname, search) =>
      pathname === "/" && new URLSearchParams(search).get("view") === "sources",
  },
  {
    id: "political-data",
    labelKey: "sidebar.primary.politicalData",
    href: "/?view=political",
    icon: Buildings,
    isActive: (pathname, search) =>
      pathname === "/" &&
      new URLSearchParams(search).get("view") === "political",
  },
  {
    id: "research",
    labelKey: "sidebar.primary.research",
    href: "/?mode=deep-research",
    icon: MagnifyingGlass,
    isActive: (pathname, search) =>
      pathname === "/" &&
      new URLSearchParams(search).get("mode") === "deep-research",
  },
  {
    id: "reports",
    labelKey: "sidebar.primary.reports",
    href: "/?mode=report&view=results",
    icon: FileText,
    isActive: (pathname, search) =>
      pathname === "/" && new URLSearchParams(search).get("mode") === "report",
  },
  {
    id: "admin",
    labelKey: "sidebar.primary.admin",
    href: "/settings",
    icon: GearSix,
    isActive: (pathname) => pathname.startsWith("/settings"),
  },
];

export default function PrimaryNavigation({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="mb-3" aria-label={t("sidebar.primary.label")}>
      <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
        {t("sidebar.primary.label")}
      </div>
      <div className="flex flex-col gap-0.5">
        {PRIMARY_NAVIGATION.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(location.pathname, location.search);
          return (
            <NavLink
              key={item.id}
              to={item.href}
              onClick={onNavigate}
              data-primary-navigation={item.id}
              className={`flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-theme-sidebar-item-selected text-theme-sidebar-item-text-active"
                  : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
              }`}
            >
              <Icon size={16} weight={active ? "fill" : "regular"} />
              <span className="truncate">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
