// SPDX-License-Identifier: MIT
import SettingsSidebar from "@/components/SettingsSidebar";
import { useState, Fragment, useEffect } from "react";
import { isMobile } from "react-device-detect";
import System from "@/models/system";
import showToast from "@/utils/toast";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Highlighter from "react-highlight-words";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import useDefaultSystemPrompt from "@/hooks/useDefaultSystemPrompt";
import useSystemPromptVariables from "@/hooks/useSystemPromptVariables";
import { useTranslation } from "react-i18next";

const VARIABLE_SEPARATOR = ", ";

interface SystemPromptForm {
  value: string;
  default: string;
  isDirty: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
}

export default function DefaultSystemPrompt() {
  const { t } = useTranslation();
  const { prompt, isLoading: promptLoading } = useDefaultSystemPrompt();
  const { variables: availableVariables } = useSystemPromptVariables();
  const [systemPromptForm, setSystemPromptForm] = useState<SystemPromptForm>({
    value: "",
    default: "",
    isDirty: false,
    isSubmitting: false,
    isEditing: false,
  });

  useEffect(() => {
    if (promptLoading) return;
    setSystemPromptForm((prev) => ({
      ...prev,
      default: prompt.defaultSystemPrompt || "",
      value: prompt.defaultSystemPrompt || prev.value,
    }));
  }, [promptLoading, prompt.defaultSystemPrompt]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const isDirty = value !== systemPromptForm.default;

    setSystemPromptForm((prev) => ({
      ...prev,
      value,
      isDirty,
      isSubmitting: false,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSystemPromptForm((prev) => ({
      ...prev,
      isSubmitting: true,
    }));
    const newSystemPrompt = systemPromptForm.value.trim();
    await System.updateDefaultSystemPrompt(newSystemPrompt)
      .then(({ success, message }: any) => {
        if (!success) throw new Error(message);

        if (
          !newSystemPrompt ||
          newSystemPrompt.trim() === prompt.saneDefaultSystemPrompt
        ) {
          return setSystemPromptForm((prev) => ({
            ...prev,
            value: prompt.saneDefaultSystemPrompt,
          }));
        }

        showToast(t("defaultSystemPrompt.toast.success"), "success");
        setSystemPromptForm((prev) => ({
          ...prev,
          default: newSystemPrompt,
          isDirty: false,
          isSubmitting: false,
        }));
      })
      .catch((error: any) => {
        showToast(
          t("defaultSystemPrompt.toast.failure", { message: error.message }),
          "error",
        );
        setSystemPromptForm((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
      });
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <SettingsSidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("defaultSystemPrompt.title")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              {t("defaultSystemPrompt.subtitle")}
            </p>
          </div>
          <div>
            {promptLoading ? (
              <div className="mt-8 flex flex-col gap-y-4">
                <Skeleton.default
                  height={20}
                  width={160}
                  highlightColor="var(--theme-bg-primary)"
                  baseColor="var(--theme-bg-secondary)"
                />
                <Skeleton.default
                  height={120}
                  width="100%"
                  highlightColor="var(--theme-bg-primary)"
                  baseColor="var(--theme-bg-secondary)"
                  className="rounded-lg"
                />
                <Skeleton.default
                  height={36}
                  width={140}
                  highlightColor="var(--theme-bg-primary)"
                  baseColor="var(--theme-bg-secondary)"
                />
              </div>
            ) : (
              <div className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <label
                    htmlFor="default-system-prompt"
                    className=" text-base font-bold text-white"
                  >
                    {t("defaultSystemPrompt.label")}
                  </label>
                  <div className="space-y-1">
                    <p className="text-white text-opacity-60 text-xs font-medium">
                      {t("defaultSystemPrompt.description.part1")}{" "}
                      <span className="font-bold">
                        {t("defaultSystemPrompt.description.specificWorkspace")}
                      </span>
                      {t("defaultSystemPrompt.description.part2")}{" "}
                      <span className="font-bold">
                        {t("defaultSystemPrompt.description.workspaceSettings")}
                      </span>
                      {t("defaultSystemPrompt.description.part3")}
                    </p>
                    <p className="text-white text-opacity-60 text-xs font-medium mb-2">
                      {t("defaultSystemPrompt.variables.intro")}{" "}
                      <Link
                        to={paths.settings.systemPromptVariables()}
                        className="text-primary-button"
                      >
                        {t("defaultSystemPrompt.variables.linkText")}
                      </Link>{" "}
                      {t("defaultSystemPrompt.variables.like")}{" "}
                      {availableVariables
                        .slice(0, 3)
                        .map((v: any, i: number) => (
                          <Fragment key={v.key}>
                            <span className="bg-theme-settings-input-bg px-1 py-0.5 rounded">
                              {`{${v.key}}`}
                            </span>
                            {i < availableVariables.length - 1 &&
                              VARIABLE_SEPARATOR}
                          </Fragment>
                        ))}
                      {availableVariables.length > 3 && (
                        <Link
                          to={paths.settings.systemPromptVariables()}
                          className="text-primary-button"
                        >
                          {t("defaultSystemPrompt.variables.more", {
                            count: availableVariables.length - 3,
                          })}
                        </Link>
                      )}
                    </p>
                  </div>

                  {systemPromptForm.isEditing ? (
                    <textarea
                      autoFocus={true}
                      value={systemPromptForm.value}
                      onChange={handleChange}
                      onBlur={() =>
                        setSystemPromptForm((prev) => ({
                          ...prev,
                          isEditing: false,
                        }))
                      }
                      placeholder={t("defaultSystemPrompt.placeholder")}
                      rows={5}
                      className="w-full border-none bg-theme-settings-input-bg placeholder:text-theme-settings-input-placeholder text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block p-2.5 resize-y overflow-y-scroll min-h-[150px]"
                    />
                  ) : (
                    <div
                      onClick={() =>
                        setSystemPromptForm((prev) => ({
                          ...prev,
                          isEditing: true,
                        }))
                      }
                      className="w-full border-none bg-theme-settings-input-bg text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block p-2.5 cursor-text resize-y overflow-y-scroll min-h-[150px]"
                    >
                      <Highlighter
                        className="whitespace-pre-wrap"
                        highlightClassName="bg-cta-button p-0.5 rounded-md"
                        searchWords={availableVariables.map(
                          (v: any) => `{${v.key}}`,
                        )}
                        autoEscape={true}
                        caseSensitive={true}
                        textToHighlight={systemPromptForm.value || ""}
                      />
                    </div>
                  )}
                  <button
                    disabled={
                      !systemPromptForm.isDirty || systemPromptForm.isSubmitting
                    }
                    className={`enabled:hover:bg-secondary enabled:hover:text-white rounded-lg bg-primary-button w-fit py-2 px-4 font-semibold text-xs disabled:opacity-20 disabled:cursor-not-allowed`}
                    type="submit"
                  >
                    {t("common.saveChanges")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
