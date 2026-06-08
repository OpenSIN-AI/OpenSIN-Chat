// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import useModelRouters from "@/hooks/useModelRouters";

export default function RouterPickerSelection({
  selectedRouterId, setSelectedRouterId, setHasChanges, }: any) {
  const { t } = useTranslation();
  const { routers, isLoading } = useModelRouters();

  if (isLoading) {
    return (
      <select
        disabled
        className="bg-zinc-900 light:bg-white text-white light:text-slate-900 text-sm rounded-lg h-8 w-full px-2.5 outline-none border border-zinc-900 light:border-slate-400 cursor-not-allowed"
      >
        <option>{t("model-router.router-selection.loading-routers")}</option>
      </select>
    );
  }

  if (routers.length === 0) {
    return (
      <p className="text-xs text-zinc-400 light:text-slate-500">
        {t("model-router.router-selection.no-routers-chat")}
      </p>
    );
  }

  return (
    <select
      value={selectedRouterId || ""}
      onChange={(e) => {
        setSelectedRouterId(Number(((e.target as unknown) as any)?.value));
        setHasChanges(true);
      }}
      className="bg-zinc-900 light:bg-white text-white light:text-slate-900 text-sm rounded-lg h-8 w-full px-2.5 outline-none border border-zinc-900 light:border-slate-400 cursor-pointer"
    >
      <option value="">
        {t("model-router.router-selection.select-router")}
      </option>
      {(routers as any).map((router) => (
        <option key={router.id} value={router.id}>
          {router.name}
          {router.ruleCount != null
            ? ` ${t("model-router.router-selection.rule-count", { count: router.ruleCount })}`
            : ""}
        </option>
      ))}
    </select>
  );
}
