// SPDX-License-Identifier: MIT
import { useState, useMemo, useCallback } from "react";
import { Plus } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useModal } from "@/hooks/useModal";
import useSlashCommandPresets from "@/hooks/useSlashCommandPresets";
import AddPresetModal from "./SlashPresets/AddPresetModal";
import EditPresetModal from "./SlashPresets/EditPresetModal";
import PublishEntityModal from "@/components/CommunityHub/PublishEntityModal";
import showToast from "@/utils/toast";
import { PROMPT_INPUT_EVENT } from "@/components/WorkspaceChat/ChatContainer/PromptInput";
import useToolsMenuItems from "../../useToolsMenuItems";
import SlashCommandRow from "./SlashCommandRow";
import System from "@/models/system";

export default function SlashCommandsTab({
  sendCommand,
  setShowing,
  promptRef,
  highlightedIndex = -1,
  registerItemCount,
}: any) {
  const { t } = useTranslation();
  const {
    isOpen: isAddModalOpen,
    openModal: openAddModal,
    closeModal: closeAddModal,
  } = useModal();
  const {
    isOpen: isEditModalOpen,
    openModal: openEditModal,
    closeModal: closeEditModal,
  } = useModal();
  const {
    isOpen: isPublishModalOpen,
    openModal: openPublishModal,
    closeModal: closePublishModal,
  } = useModal();
  const { presets, refresh: refreshPresets } = useSlashCommandPresets();
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [presetToPublish, setPresetToPublish] = useState(null);

  const items = useMemo(
    () => [
      {
        command: "/reset",
        description: t("chat_window.preset_reset_description"),
        autoSubmit: true,
      },
      ...(presets as any).map((preset) => ({
        command: preset.command,
        description: preset.description,
        autoSubmit: false,
        preset,
      })),
    ],
    [presets, t],
  );

  const handleUseCommand = useCallback(
    (command, autoSubmit = false) => {
      setShowing(false);

      if (autoSubmit) {
        sendCommand({ text: command, autoSubmit: true });
        promptRef?.current?.focus();
        return;
      }

      const textarea = promptRef?.current;
      if (!textarea) return;
      const cursor = textarea.selectionStart;
      const value = textarea.value;
      const charBefore = cursor > 0 ? value[cursor - 1] : "";
      const insertStart = charBefore === "/" ? cursor - 1 : cursor;
      const newValue =
        value.slice(0, insertStart) + command + value.slice(cursor);

      window.dispatchEvent(
        new CustomEvent(PROMPT_INPUT_EVENT, {
          detail: { messageContent: newValue },
        }),
      );
      textarea.focus();
      const newCursor = insertStart + command.length;
      setTimeout(() => textarea.setSelectionRange(newCursor, newCursor), 0);
    },
    [sendCommand, setShowing, promptRef],
  );

  useToolsMenuItems({
    items,
    highlightedIndex,
    onSelect: (item) => {
      const text = item.preset ? `${item.command} ` : item.command;
      handleUseCommand(text, item.autoSubmit);
    },
    registerItemCount,
  });

  const handleSavePreset = async (preset) => {
    const { error } = await System.createSlashCommandPreset(preset);
    if (error) {
      showToast(error, "error");
      return false;
    }
    refreshPresets();
    closeAddModal();
    return true;
  };

  const handleEditPreset: any = (preset) => {
    setSelectedPreset(preset);
    openEditModal();
  };

  const handleUpdatePreset = async (updatedPreset) => {
    const { error } = await System.updateSlashCommandPreset(
      updatedPreset.id,
      updatedPreset,
    );
    if (error) {
      showToast(error, "error");
      return;
    }
    refreshPresets();
    closeEditModal();
    setSelectedPreset(null);
  };

  const handleDeletePreset = async (presetId) => {
    await System.deleteSlashCommandPreset(presetId);
    refreshPresets();
    closeEditModal();
    setSelectedPreset(null);
  };

  const handlePublishPreset: any = (preset) => {
    setPresetToPublish({
      name: preset.command.slice(1),
      description: preset.description,
      command: preset.command,
      prompt: preset.prompt,
    });
    openPublishModal();
  };

  return (
    <>
      {(items as any).map((item, index) => (
        <SlashCommandRow
          key={item.preset?.id ?? item.command}
          command={item.command}
          description={item.description}
          onClick={() =>
            handleUseCommand(
              item.preset ? `${item.command} ` : item.command,
              item.autoSubmit,
            )
          }
          onEdit={item.preset ? () => handleEditPreset(item.preset) : undefined}
          onPublish={
            item.preset ? () => handlePublishPreset(item.preset) : undefined
          }
          showMenu={!!item.preset}
          highlighted={highlightedIndex === index}
        />
      ))}

      <div
        onClick={openAddModal}
        className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-zinc-700/50 light:hover:bg-slate-100"
      >
        <Plus
          size={12}
          weight="bold"
          className="text-white light:text-slate-900"
        />
        <span className="text-xs text-white light:text-slate-900">
          {t("chat_window.add_new")}
        </span>
      </div>

      <AddPresetModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSave={handleSavePreset}
      />
      {selectedPreset && (
        <EditPresetModal
          isOpen={isEditModalOpen}
          onClose={() => {
            closeEditModal();
            setSelectedPreset(null);
          }}
          onSave={handleUpdatePreset}
          onDelete={handleDeletePreset}
          preset={selectedPreset}
        />
      )}
      <PublishEntityModal
        show={isPublishModalOpen}
        onClose={closePublishModal}
        entityType="slash-command"
        entity={presetToPublish}
      />
    </>
  );
}
