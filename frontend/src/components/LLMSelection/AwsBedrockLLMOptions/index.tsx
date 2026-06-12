// SPDX-License-Identifier: MIT
import { ArrowSquareOut, Info } from "@phosphor-icons/react";
import { AWS_REGIONS } from "./regions";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function AwsBedrockLLMOptions({ settings }: any) {
  const { t } = useTranslation();
  const [connectionMethod, setConnectionMethod] = useState(
    settings?.AwsBedrockLLMConnectionMethod ?? "iam",
  );

  return (
    <div className="w-full flex flex-col">
      {!settings?.credentialsOnly && connectionMethod !== "apiKey" && (
        <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-white mb-4 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
          <div className="gap-x-2 flex items-center">
            <Info size={40} />
            <p className="text-base">
              {t("awsBedrock.iamUserInstructions")}
              <br />
              <a
                href="https://docs.opensin.delqhi.com/setup/llm-configuration/cloud/aws-bedrock"
                target="_blank"
                className="underline flex gap-x-1 items-center"
                rel="noreferrer"
              >
                {t("awsBedrock.readMore")}
                <ArrowSquareOut size={14} />
              </a>
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-y-2 mb-2">
        <input
          type="hidden"
          name="AwsBedrockLLMConnectionMethod"
          value={connectionMethod}
        />
        <div className="flex flex-col w-full">
          <label className="text-theme-text-primary text-sm font-semibold block mb-3">
            {t("awsBedrock.authMethod")}
          </label>
          <p className="text-theme-text-secondary text-sm">
            {t("awsBedrock.authMethodDescription")}
          </p>
        </div>
        <select
          name="AwsBedrockLLMConnectionMethod"
          value={connectionMethod}
          required={true}
          onChange={(e) =>
            setConnectionMethod((e.target as unknown as any)?.value)
          }
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-fit p-2.5"
        >
          <option value="iam">{t("awsBedrock.iamExplicit")}</option>
          <option value="sessionToken">
            {t("awsBedrock.sessionTokenOption")}
          </option>
          <option value="iam_role">{t("awsBedrock.iamRole")}</option>
          <option value="apiKey">{t("awsBedrock.apiKeyOption")}</option>
        </select>
      </div>

      <div className="w-full flex items-center gap-[36px] my-1.5">
        {["iam", "sessionToken"].includes(connectionMethod) && (
          <>
            <div className="flex flex-col w-60">
              <label className="text-white text-sm font-semibold block mb-3">
                {t("awsBedrock.iamAccessId")}
              </label>
              <input
                type="password"
                name="AwsBedrockLLMAccessKeyId"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("awsBedrock.iamAccessIdPlaceholder")}
                defaultValue={
                  settings?.AwsBedrockLLMAccessKeyId ? "*".repeat(20) : ""
                }
                required={true}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="flex flex-col w-60">
              <label className="text-white text-sm font-semibold block mb-3">
                {t("awsBedrock.iamAccessKey")}
              </label>
              <input
                type="password"
                name="AwsBedrockLLMAccessKey"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("awsBedrock.iamAccessKeyPlaceholder")}
                defaultValue={
                  settings?.AwsBedrockLLMAccessKey ? "*".repeat(20) : ""
                }
                required={true}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </>
        )}
        {connectionMethod === "sessionToken" && (
          <div className="flex flex-col w-60">
            <label className="text-theme-text-primary text-sm font-semibold block mb-3">
              {t("awsBedrock.sessionTokenLabel")}
            </label>
            <input
              type="password"
              name="AwsBedrockLLMSessionToken"
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("awsBedrock.sessionTokenPlaceholder")}
              defaultValue={
                settings?.AwsBedrockLLMSessionToken ? "*".repeat(20) : ""
              }
              required={true}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
        {connectionMethod === "apiKey" && (
          <div className="flex flex-col w-60">
            <label className="text-theme-text-primary text-sm font-semibold block mb-3">
              {t("awsBedrock.apiKeyLabel")}
            </label>
            <input
              type="password"
              name="AwsBedrockLLMAPIKey"
              className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              placeholder={t("awsBedrock.apiKeyPlaceholder")}
              defaultValue={settings?.AwsBedrockLLMAPIKey ? "*".repeat(20) : ""}
              required={true}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            {t("awsBedrock.regionLabel")}
          </label>
          <select
            name="AwsBedrockLLMRegion"
            defaultValue={settings?.AwsBedrockLLMRegion || "us-west-2"}
            required={true}
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
          >
            {(AWS_REGIONS as any).map((region) => {
              return (
                <option key={region.code} value={region.code}>
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  {region.name} ({region.code})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="w-full flex items-center gap-[36px] my-1.5">
        {!settings?.credentialsOnly && (
          <>
            <div className="flex flex-col w-60">
              <label className="text-white text-sm font-semibold block mb-3">
                {t("awsBedrock.modelId")}
              </label>
              <input
                type="text"
                name="AwsBedrockLLMModel"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("awsBedrock.modelIdPlaceholder")}
                defaultValue={settings?.AwsBedrockLLMModel}
                required={true}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="flex flex-col w-60">
              <label className="text-white text-sm font-semibold block mb-3">
                {t("awsBedrock.modelContextWindow")}
              </label>
              <input
                type="number"
                name="AwsBedrockLLMTokenLimit"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("awsBedrock.contextWindowPlaceholder")}
                min={1}
                onScroll={(e) => (e.target as HTMLElement).blur()}
                defaultValue={settings?.AwsBedrockLLMTokenLimit}
                required={true}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col w-60">
              <label className="text-white text-sm font-semibold block mb-3">
                {t("awsBedrock.modelMaxOutputTokens")}
              </label>
              <input
                type="number"
                name="AwsBedrockLLMMaxOutputTokens"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                placeholder={t("awsBedrock.maxOutputTokensPlaceholder")}
                min={1}
                onScroll={(e) => (e.target as HTMLElement).blur()}
                defaultValue={settings?.AwsBedrockLLMMaxOutputTokens}
                required={true}
                autoComplete="off"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
