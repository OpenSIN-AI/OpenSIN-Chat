// SPDX-License-Identifier: MIT
import { NavLink } from "react-router";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { useTranslation } from "react-i18next";
import paths from "@/utils/paths";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-theme-bg-primary text-theme-text-primary gap-4 p-4 md:p-8 w-full">
      <MagnifyingGlass className="w-16 h-16 text-theme-text-secondary" />
      <h1 className="text-xl md:text-2xl font-bold text-center">
        {t("notFound.title")}
      </h1>
      <p className="text-theme-text-secondary text-center px-4">
        {t("notFound.description")}
      </p>
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mt-4 w-full md:w-auto">
        <NavLink
          to="/"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-bg-secondary text-theme-text-primary rounded-lg hover:bg-theme-sidebar-item-hover transition-all duration-300 w-full md:w-auto"
        >
          <House className="w-4 h-4" />
          {t("notFound.goHome")}
        </NavLink>
        <NavLink
          to={paths.appDocs()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-bg-secondary text-theme-text-primary rounded-lg hover:bg-theme-sidebar-item-hover transition-all duration-300 w-full md:w-auto"
        >
          <BookOpen className="w-4 h-4" />
          {t("notFound.readDocs")}
        </NavLink>
      </div>
    </div>
  );
}
