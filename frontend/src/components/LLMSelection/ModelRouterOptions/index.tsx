// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import useModelRouters from "@/hooks/useModelRouters";

export default function ModelRouterOptions({ settings }: any) {
  const { t } = useTranslation();
  const { routers, isLoading: loading } = useModelRouters();

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-y-4">
        <p className="text-sm text-white text-opacity-60">
          {t("model-router.router-selection.loading-routers")}
        </p>
      </div>
    );
  }

  if (routers.length === 0) {
    return (
      <div className="w-full flex flex-col gap-y-4">
        <p className="text-sm text-white text-opacity-60">
          {t("model-router.router-selection.no-routers-prefix-settings")}{" "}
          <Link
            to={paths.settings.modelRouters()}
            className="underline text-white"
          >
            {t("model-router.router-selection.no-routers-link")}
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-y-4">
      <div className="w-full flex items-center gap-[36px]">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("model-router.router-selection.model-router-label")}
          </label>
          <select
            name="ModelRouterId"
            defaultValue={settings?.ModelRouterId || ""}
            className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2.5"
            required
          >
            <option value="">
              {t("model-router.router-selection.select-router")}
            </option>
            {(routers as any).map((router) => (
              <option key={router.id} value={router.id}>
                {router.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
