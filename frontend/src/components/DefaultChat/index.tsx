// SPDX-License-Identifier: MIT
import React, { useEffect, useState } from "react";
import paths from "@/utils/paths";
import { isMobile } from "react-device-detect";
import useUser from "@/hooks/useUser";
import Appearance from "@/models/appearance";
import useLogo from "@/hooks/useLogo";
import useWorkspaces from "@/hooks/useWorkspaces";
import { NavLink } from "react-router-dom";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { safeJsonParse } from "@/utils/request";
import { safeGetItem, safeRemoveItem } from "@/utils/safeStorage";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";

// Pure punctuation and a right-arrow glyph used in the home greeting.
// These are not translatable; they live in module scope so the linter
// does not flag the JSX as containing literal strings.
const COMMA = ",";
const BANG = "!";
const RIGHT_ARROW = "\u2192";

export default function DefaultChatContainer() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { logo } = useLogo();
  const { workspaces, isLoading: loading } = useWorkspaces();
  const [lastVisitedWorkspace, setLastVisitedWorkspace] = useState(null);

  useEffect(() => {
    const serializedLastVisitedWorkspace = safeGetItem(
      LAST_VISITED_WORKSPACE,
    );
    if (!serializedLastVisitedWorkspace) return;

    try {
      const lastVisitedWorkspace = safeJsonParse(
        serializedLastVisitedWorkspace,
        null,
      );
      if (lastVisitedWorkspace == null) throw new Error("Non-parseable!");
      const isValid = workspaces.some(
        (ws) => ws.slug === lastVisitedWorkspace?.slug,
      );
      if (!isValid) throw new Error("Invalid value!");
      setLastVisitedWorkspace(lastVisitedWorkspace);
    } catch {
      safeRemoveItem(LAST_VISITED_WORKSPACE);
    }
  }, [workspaces]);

  if (loading) {
    return (
      <Layout>
        <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto no-scroll">
          {/* Logo skeleton */}
          <div className="w-[140px] h-[140px] mb-5 rounded-lg bg-theme-bg-primary animate-pulse" />
          {/* Title skeleton */}
          <div className="w-48 h-6 mb-4 rounded bg-theme-bg-primary animate-pulse" />
          {/* Paragraph skeleton */}
          <div className="w-80 h-4 mb-2 rounded bg-theme-bg-primary animate-pulse" />
          <div className="w-64 h-4 rounded bg-theme-bg-primary animate-pulse" />
          {/* Button skeleton */}
          <div className="mt-[29px] w-40 h-[34px] rounded-lg bg-theme-bg-primary animate-pulse" />
        </div>
      </Layout>
    );
  }

  const hasWorkspaces = workspaces.length > 0;
  return (
    <Layout>
      <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto no-scroll">
        <img
          src={logo}
          alt={t("home.logoAlt")}
          className=" w-[200px] h-fit mb-5 rounded-lg"
        />
        <h1 className="text-white text-2xl font-semibold">
          {t("home.welcome")}
          {COMMA} {user.username}
          {BANG}
        </h1>
        <p className="text-theme-home-text-secondary text-base text-center whitespace-pre-line">
          {hasWorkspaces ? t("home.chooseWorkspace") : t("home.notAssigned")}
        </p>
        {hasWorkspaces && (
          <NavLink
            to={paths.workspace.chat(
              lastVisitedWorkspace?.slug || workspaces[0].slug,
            )}
            className="text-sm font-medium mt-[10px] w-fit px-4 h-[34px] flex items-center justify-center rounded-lg cursor-pointer bg-theme-home-button-secondary hover:bg-theme-home-button-secondary-hover text-theme-home-button-secondary-text hover:text-theme-home-button-secondary-hover-text transition-all duration-200"
          >
            {t("home.goToWorkspace", {
              workspace: lastVisitedWorkspace?.name || workspaces[0].name,
            })}{" "}
            {RIGHT_ARROW}
          </NavLink>
        )}
        <NavLink
          to={paths.appDocs()}
          className="text-sm mt-3 flex items-center gap-1.5 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
          aria-label={t("home.readDocs")}
        >
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          {t("home.readDocs")}
        </NavLink>
      </div>
    </Layout>
  );
}

const Layout = ({ children }) => {
  const { showScrollbar } = Appearance.getSettings();
  return (
    <div
      // Dynamic: height depends on runtime device detection (isMobile ternary)
      style={
        {
          "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
        } as React.CSSProperties
      }
      className={`relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary light:border-[1px] light:border-theme-sidebar-border w-full overflow-y-scroll ${showScrollbar ? "show-scrollbar" : "no-scroll"}`}
    >
      {children}
    </div>
  );
};
