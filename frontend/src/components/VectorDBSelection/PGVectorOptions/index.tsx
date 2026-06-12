// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import { Info } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";

export default function PGVectorOptions({ settings }: any) {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-y-7">
      <div className="w-full flex items-center gap-[36px] mt-1.5">
        <div className="flex flex-col w-96">
          <div className="flex items-center gap-x-1 mb-3">
            <label className="text-white text-sm font-semibold block">
              {t("pgVector.connectionString.label")}
            </label>
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
              data-tooltip-id="pgvector-connection-string-tooltip"
              data-tooltip-place="right"
            />
            <Tooltip
              delayHide={300}
              id="pgvector-connection-string-tooltip"
              className="max-w-md z-99"
              clickable={true}
            >
              <p className="text-md whitespace-pre-line break-words">
                {t("pgVector.connectionString.tooltip.intro")} <br />
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <code>postgresql://username:password@host:port/database</code>
                <br />
                <br />
                {t("pgVector.connectionString.tooltip.permissions")}
                <ul className="list-disc list-inside">
                  <li>{t("pgVector.connectionString.tooltip.perm1")}</li>
                  <li>{t("pgVector.connectionString.tooltip.perm2")}</li>
                  <li>{t("pgVector.connectionString.tooltip.perm3")}</li>
                </ul>
                <br />
                <b>{t("pgVector.connectionString.tooltip.extension")}</b>
              </p>
            </Tooltip>
          </div>
          <input
            type="text"
            name="PGVectorConnectionString"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("pgVector.connectionString.placeholder")}
            defaultValue={
              settings?.PGVectorConnectionString ? "*".repeat(20) : ""
            }
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col w-60">
          <div className="flex items-center gap-x-1 mb-3">
            <label className="text-white text-sm font-semibold block">
              {t("pgVector.tableName.label")}
            </label>
            <Info
              size={16}
              className="text-theme-text-secondary cursor-pointer"
              data-tooltip-id="pgvector-table-name-tooltip"
              data-tooltip-place="right"
            />
            <Tooltip
              delayHide={300}
              id="pgvector-table-name-tooltip"
              className="max-w-md z-99"
              clickable={true}
            >
              <p className="text-md whitespace-pre-line break-words">
                {t("pgVector.tableName.tooltip.intro")}
                <br />
                <br />
                {t("pgVector.tableName.tooltip.default")}{" "}
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <code>openafd_vectors</code>.
                <br />
                <br />
                <b>{t("pgVector.tableName.tooltip.warning")}</b>
              </p>
            </Tooltip>
          </div>
          <input
            type="text"
            name="PGVectorTableName"
            autoComplete="off"
            defaultValue={settings?.PGVectorTableName}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder={t("pgVector.tableName.placeholder")}
          />
        </div>
      </div>
    </div>
  );
}
