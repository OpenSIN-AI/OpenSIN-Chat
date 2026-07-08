// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import System from "@/models/system";
import showToast from "@/utils/toast";
import logger from "@/utils/logger";

export default function ObsidianOptions() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [vaultPath, setVaultPath] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleFolderPick = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Filter for .md files only
    const markdownFiles = (files as any).filter((file) =>
      file.name.endsWith(".md"),
    );
    setSelectedFiles(markdownFiles);

    // Set the folder path from the first file
    if (markdownFiles.length > 0) {
      const path = markdownFiles[0].webkitRelativePath.split("/")[0];
      setVaultPath(path);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    try {
      setLoading(true);
      showToast(t("connectors.obsidian.importing_vault"), "info", {
        clear: true,
        autoClose: false,
      });

      // Read all files and prepare them for submission
      const fileContents = await Promise.all(
        (selectedFiles as any).map(async (file) => {
          const content = await file.text();
          return {
            name: file.name,
            path: file.webkitRelativePath,
            content: content,
          };
        }),
      );

      const { data, error } = await System.dataConnectors.obsidian.collect({
        files: fileContents,
      });

      if (!!error) {
        showToast(error, "error", { clear: true });
        setLoading(false);
        setSelectedFiles([]);
        setVaultPath("");
        return;
      }

      // Show results
      const successCount = data.processed;
      const failCount = data.failed;
      const totalCount = data.total;

      if (successCount === totalCount) {
        showToast(
          t("connectors.obsidian.import_success", {
            count: successCount,
          }),
          "success",
          { clear: true },
        );
      } else {
        showToast(
          t("connectors.obsidian.import_partial", {
            successCount,
            failCount,
          }),
          "warning",
          { clear: true },
        );
      }

      setLoading(false);
    } catch (e) {
      logger.error(e);
      showToast(e.message, "error", { clear: true });
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full">
      <div className="flex flex-col w-full px-1 md:pb-6 pb-16">
        <form className="w-full" onSubmit={handleSubmit}>
          <div className="w-full flex flex-col py-2">
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-x-2 text-white mb-4 bg-blue-800/30 w-fit rounded-lg px-4 py-2">
                <div className="gap-x-2 flex items-center">
                  <Info className="shrink-0" size={25} aria-hidden="true" />
                  <p className="text-sm">
                    {t("connectors.obsidian.vault_warning")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex flex-col gap-y-1 mb-4">
                  <label className="text-theme-text-primary text-sm font-bold">
                    {t("connectors.obsidian.vault_location")}
                  </label>
                  <p className="text-xs font-normal text-theme-text-secondary">
                    {t("connectors.obsidian.vault_description")}
                  </p>
                </div>
                <div className="flex gap-x-2">
                  <input
                    type="text"
                    value={vaultPath}
                    onChange={(e) => setVaultPath(e.target.value)}
                    placeholder="/path/to/your/vault" // eslint-disable-line i18next/no-literal-string
                    className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                    required={true}
                    autoComplete="off"
                    spellCheck={false}
                    readOnly
                  />
                  <label className="px-3 py-2 bg-theme-settings-input-bg border border-none rounded-lg text-theme-text-primary hover:bg-theme-settings-input-bg/80 cursor-pointer">
                    <FolderOpen size={20} />
                    <input
                      type="file"
                      {...({ webkitdirectory: "" } as any)}
                      onChange={handleFolderPick}
                      className="hidden"
                    />
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <>
                    <p className="text-xs text-theme-text-primary mt-2 font-bold">
                      {t("connectors.obsidian.selected_files", {
                        count: selectedFiles.length,
                      })}
                    </p>

                    {(selectedFiles as any).map((file, i) => (
                      <p
                        key={file.webkitRelativePath}
                        className="text-xs text-theme-text-primary mt-2"
                      >
                        {file.webkitRelativePath}
                      </p>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-y-2 w-full pr-10">
            <button
              type="submit"
              disabled={loading || selectedFiles.length === 0}
              className="border-none mt-2 w-full justify-center px-4 py-2 rounded-lg text-dark-text light:text-white text-sm font-bold items-center flex gap-x-2 bg-theme-home-button-primary hover:bg-theme-home-button-primary-hover disabled:bg-theme-home-button-primary-hover disabled:cursor-not-allowed"
            >
              {loading
                ? t("connectors.obsidian.importing")
                : t("connectors.obsidian.import_vault")}
            </button>
            {loading && (
              <p className="text-xs text-theme-text-secondary">
                {t("connectors.obsidian.processing_time")}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
