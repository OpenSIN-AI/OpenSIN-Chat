// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import { useState } from "react";

export default function WorkspaceName({
  workspace,
  setHasChanges,
}: {
  workspace?: { name: string };
  setHasChanges: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(workspace?.name ?? "");
  return (
    <div>
      <div className="flex flex-col">
        <label htmlFor="name" className="block input-label">
          {t("common.workspaces-name")}
        </label>
        <p className="text-theme-text-secondary text-xs font-medium py-1.5">
          {t("general.names.description")}
        </p>
      </div>
      <input
        name="name"
        type="text"
        minLength={2}
        maxLength={80}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setHasChanges(true);
        }}
        className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
        placeholder={t("common.workspaceNamePlaceholder")}
        required={true}
        autoComplete="off"
      />
    </div>
  );
}
