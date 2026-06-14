// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import useModelRouters from "@/hooks/useModelRouters";

export default function RouterSelection({ workspace, setHasChanges }) {
  const { t } = useTranslation();
  const { routers, isLoading } = useModelRouters();

  if (isLoading) {
    return (
      <div className="mt-4">
        <p className="text-sm text-white text-opacity-60">
          {t("model-router.router-selection.loading-routers")}
        </p>
      </div>
    );
  }

  if (routers.length === 0) {
    return (
      <div className="mt-4">
        <p className="text-sm text-white text-opacity-60">
          {t("model-router.router-selection.no-routers-prefix-workspace")}{" "}
          <Link
            to={paths.settings.modelRouters()}
            className="underline text-white"
          >
            {t("model-router.router-selection.no-routers-link")}
          </Link>
          {"." /* eslint-disable-line i18next/no-literal-string */}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-y-1">
      <label className="block input-label">
        {t("model-router.router-selection.model-router-label")}
      </label>
      <p className="text-white text-opacity-60 text-xs font-medium py-1.5">
        {t("model-router.router-selection.select-description")}
      </p>
      <select
        name="router_id"
        defaultValue={workspace?.router_id || ""}
        onChange={() => setHasChanges(true)}
        className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full max-w-[640px] p-2.5"
        required
      >
        <option value="">
          {t("model-router.router-selection.select-router")}
        </option>
        {routers.map((router) => (
          <option key={router.id} value={router.id}>
            {router.name}
            {router.description ? ` — ${router.description}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
