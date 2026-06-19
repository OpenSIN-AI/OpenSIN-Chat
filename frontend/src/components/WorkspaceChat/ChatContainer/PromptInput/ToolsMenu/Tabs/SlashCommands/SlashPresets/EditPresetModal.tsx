// SPDX-License-Identifier: MIT
import { useState, useEffect } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import ModalWrapper from "@/components/ModalWrapper";
import { CMD_REGEX } from "./constants";
import { useTranslation } from "react-i18next";

export default function EditPresetModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  preset,
}: any) {
  const { t } = useTranslation();
  const [command, setCommand] = useState("");
  const [deleting, setDeleting] = useState(false as any);

  useEffect(() => {
    if (preset && isOpen) {
      setCommand(preset.command?.slice(1) || "");
    }
  }, [preset, isOpen]);

  const handleSubmit: any = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const sanitizedCommand = command.replace(CMD_REGEX, "");
    onSave({
      id: preset.id,
      command: `/${sanitizedCommand}`,
      prompt: form.get("prompt"),
      description: form.get("description"),
    });
  };

  const handleCommandChange: any = (e) => {
    const value = (e.target as unknown as any)?.value.replace(CMD_REGEX, "");
    setCommand(value);
  };

  const handleDelete = async () => {
    if (!window.confirm(t("slashPresets.editPreset.deleteConfirm"))) return;

    setDeleting(true);
    await onDelete(preset.id);
    setDeleting(false);
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen}>
      <div className="w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
              {t("slashPresets.editPreset.title")}
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
          >
            <X size={24} weight="bold" className="text-white" />
          </button>
        </div>
        <div className="h-full w-full overflow-y-auto max-h-[calc(100vh-200px)]">
          <form onSubmit={handleSubmit}>
            <div className="py-7 px-9 space-y-2 flex-col">
              <div className="w-full flex flex-col gap-y-4">
                <div>
                  <label
                    htmlFor="command"
                    className="block mb-2 text-sm font-medium text-white"
                  >
                    {t("slashPresets.editPreset.command")}
                  </label>
                  <div className="flex items-center">
                    <span className="text-white text-sm mr-2 font-bold">/</span>
                    <input
                      type="text"
                      name="command"
                      placeholder={t(
                        "slashPresets.editPreset.commandPlaceholder",
                      )}
                      value={command}
                      onChange={handleCommandChange}
                      required={true}
                      className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="prompt"
                    className="block mb-2 text-sm font-medium text-white"
                  >
                    {t("slashPresets.editPreset.prompt")}
                  </label>
                  <textarea
                    name="prompt"
                    placeholder={t("slashPresets.editPreset.promptPlaceholder")}
                    defaultValue={preset.prompt}
                    required={true}
                    className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  ></textarea>
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block mb-2 text-sm font-medium text-white"
                  >
                    {t("slashPresets.editPreset.description")}
                  </label>
                  <input
                    type="text"
                    name="description"
                    defaultValue={preset.description}
                    placeholder={t(
                      "slashPresets.editPreset.descriptionPlaceholder",
                    )}
                    required={true}
                    className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  />
                </div>
              </div>
            </div>
            <div className="flex w-full justify-between items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
              <button
                disabled={deleting}
                onClick={handleDelete}
                type="button"
                className="border-none transition-all duration-300 bg-transparent text-red-500 hover:bg-red-500/25 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {deleting
                  ? t("slashPresets.editPreset.deleting")
                  : t("slashPresets.editPreset.deletePreset")}
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  type="button"
                  className="border-none transition-all duration-300 bg-transparent text-white hover:opacity-60 px-4 py-2 rounded-lg text-sm"
                >
                  {t("slashPresets.editPreset.cancel")}
                </button>
                <button
                  type="submit"
                  className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
                >
                  {t("slashPresets.editPreset.save")}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalWrapper>
  );
}
