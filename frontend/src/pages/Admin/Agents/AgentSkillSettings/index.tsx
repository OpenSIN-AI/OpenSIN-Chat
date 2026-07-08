// SPDX-License-Identifier: MIT
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useTranslation } from "react-i18next";
import MaxToolCallStack from "./MaxToolCallStack";
import AgentClarifyingQuestions from "./AgentClarifyingQuestions";
import AgentSkillReranker from "./AgentSkillReranker";

export default function AgentSkillSettings() {
  const { isOpen, openModal, closeModal } = useModal();
  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`w-10 h-10 flex items-center justify-center light:border-black/10 light:border-solid border-none light:!border rounded-lg transition-colors outline-none bg-transparent hover:bg-theme-bg-secondary`}
      >
        <SlidersHorizontal size={24} className={`text-theme-text-secondary`} />
      </button>
      <AgentSkillSettingsModal isOpen={isOpen} closeModal={closeModal} />
    </>
  );
}

function AgentSkillSettingsModal({
  isOpen,
  closeModal,
}: {
  isOpen: boolean;
  closeModal: () => void;
}) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} closeModal={closeModal}>
      <div className="w-[500px] bg-theme-bg-sidebar px-6 py-4 rounded-lg flex flex-col items-center justify-between relative shadow-lg border border-white/10">
        <div className="w-full flex items-center justify-between">
          <div className="text-theme-text-primary text-left font-medium text-lg">
            {t("agent.settings.title")}
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="text-white opacity-60 hover:text-theme-text-primary light:hover:text-theme-text-primary hover:opacity-100 border-none outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col w-full">
          <div className="flex flex-col gap-y-5 w-full">
            <MaxToolCallStack />
            <div className="border-b border-white/10 h-[1px] w-full" />
            <AgentSkillReranker />
            <div className="border-b border-white/10 h-[1px] w-full" />
            <AgentClarifyingQuestions />
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
