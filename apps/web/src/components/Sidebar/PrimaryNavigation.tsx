// SPDX-License-Identifier: MIT
// Purpose: Calm primary navigation for the core chat workflow.
import { NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { ChatsCircle } from "@phosphor-icons/react/dist/csr/ChatsCircle";
import { Files } from "@phosphor-icons/react/dist/csr/Files";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";

type PrimaryNavigationItem = {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
  isActive: (pathname: string, search: string) => boolean;
};

const PRIMARY_NAVIGATION: PrimaryNavigationItem[] = [
  {
    id: "chats",
    labelKey: "sidebar.primary.chatsProjects",
    href: "/",
    icon: ChatsCircle,
    isActive: (pathname, search) => pathname === "/" && search === "",
  },
  {
    id: "sources",
    labelKey: "sidebar.primary.sourcesDocuments",
    href: "/?view=sources",
    icon: Files,
    isActive: (pathname, search) =>
      pathname === "/" && new URLSearchParams(search).get("view") === "sources",
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
];

export default function PrimaryNavigation({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="mb-3" aria-label={t("sidebar.primary.label")}>
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
    </nav>
  );
}
