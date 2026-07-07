// SPDX-License-Identifier: MIT
import React, { useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import PreLoader from "@/components/Preloader";
import CTAButton from "@/components/lib/CTAButton";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { numberWithCommas } from "@/utils/numbers";
import { useTranslation } from "react-i18next";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import ChangeWarningModal from "@/components/ChangeWarning";
import useEmbeddingTextSplitterPreference from "@/hooks/useEmbeddingTextSplitterPreference";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";

function isNullOrNaN(value: any) {
  if (value === null) return true;
  return isNaN(value);
}

export default function EmbeddingTextSplitterPreference() {
  const { settings, isLoading } = useEmbeddingTextSplitterPreference();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const blocker = useUnsavedChanges(hasChanges);
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    if (
      Number(form.get("text_splitter_chunk_overlap")) >=
      Number(form.get("text_splitter_chunk_size"))
    ) {
      showToast(
        "Chunk overlap cannot be larger or equal to chunk size.",
        "error",
      );
      return;
    }

    openModal();
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const form = new FormData(
        document.getElementById(
          "text-splitter-chunking-form",
        ) as HTMLFormElement,
      );
      const { success, error } = await Admin.updateSystemPreferences({
        text_splitter_chunk_size: isNullOrNaN(
          form.get("text_splitter_chunk_size"),
        )
          ? 1000
          : Number(form.get("text_splitter_chunk_size")),
        text_splitter_chunk_overlap: isNullOrNaN(
          form.get("text_splitter_chunk_overlap"),
        )
          ? 1000
          : Number(form.get("text_splitter_chunk_overlap")),
      });
      if (!success) {
        showToast(
          `Failed to save text chunking strategy settings: ${error}`,
          "error",
        );
        closeModal();
        return;
      }
      setHasChanges(false);
      closeModal();
      showToast("Text chunking strategy settings saved.", "success");
    } catch {
      showToast("Failed to save text chunking strategy settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      {isLoading ? (
        <div
          style={{
            "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
          }}
          className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
        >
          <div className="w-full h-full flex justify-center items-center">
            <PreLoader />
          </div>
        </div>
      ) : (
        <div
          style={{
            "--content-height": isMobile ? "100%" : "calc(100% - 32px)",
          }}
          className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
        >
          <form
            onSubmit={handleSubmit}
            onChange={() => setHasChanges(true)}
            className="flex w-full"
            id="text-splitter-chunking-form"
          >
            <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
              <div className="w-full flex flex-col gap-y-1 pb-4 border-white light:border-theme-sidebar-border border-b-2 border-opacity-10">
                <div className="flex gap-x-4 items-center">
                  <p className="text-lg leading-6 font-bold text-white">
                    {t("text.title")}
                  </p>
                </div>
                <p className="text-xs leading-[18px] font-base text-white text-opacity-60">
                  {t("text.desc-start")} <br />
                  {t("text.desc-end")}
                </p>
              </div>
              <div className="w-full justify-end flex">
                {hasChanges && (
                  <CTAButton type="submit" className="mt-3 mr-0 -mb-14 z-10">
                    {saving ? t("common.saving") : t("common.save")}
                  </CTAButton>
                )}
              </div>

              <div className="flex flex-col gap-y-4 mt-8">
                <div className="flex flex-col max-w-[300px]">
                  <div className="flex flex-col gap-y-2 mb-4">
                    <label className="text-white text-sm font-semibold block">
                      {t("text.size.title")}
                    </label>
                    <p className="text-xs text-theme-text-secondary">
                      {t("text.size.description")}
                    </p>
                  </div>
                  <input
                    type="number"
                    name="text_splitter_chunk_size"
                    min={1}
                    max={settings?.max_embed_chunk_size || 1000}
                    onWheel={(e) => e?.currentTarget?.blur()}
                    className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                    placeholder={t(
                      "embeddingTextSplitter.placeholder.chunkSize",
                    )}
                    defaultValue={
                      isNullOrNaN(settings?.text_splitter_chunk_size)
                        ? 1000
                        : Number(settings?.text_splitter_chunk_size)
                    }
                    required={true}
                    autoComplete="off"
                  />
                  <p className="text-xs text-theme-placeholder mt-2">
                    {`${t("text.size.recommend")} ${numberWithCommas(settings?.max_embed_chunk_size || 1000)}.`}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-y-4 mt-8">
                <div className="flex flex-col max-w-[300px]">
                  <div className="flex flex-col gap-y-2 mb-4">
                    <label className="text-white text-sm font-semibold block">
                      {t("text.overlap.title")}
                    </label>
                    <p className="text-xs text-theme-text-secondary">
                      {t("text.overlap.description")}
                    </p>
                  </div>
                  <input
                    type="number"
                    name="text_splitter_chunk_overlap"
                    min={0}
                    onWheel={(e) => e?.currentTarget?.blur()}
                    className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                    placeholder={t(
                      "embeddingTextSplitter.placeholder.chunkOverlap",
                    )}
                    defaultValue={
                      isNullOrNaN(settings?.text_splitter_chunk_overlap)
                        ? 20
                        : Number(settings?.text_splitter_chunk_overlap)
                    }
                    required={true}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      <ModalWrapper isOpen={isOpen} closeModal={closeModal}>
        <ChangeWarningModal
          warningText="Changing text splitter settings will clear any previously cached documents.\n\nThese new settings will be applied to all documents when embedding them into a workspace."
          onClose={closeModal}
          onConfirm={handleSaveSettings}
        />
      </ModalWrapper>
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
