// SPDX-License-Identifier: MIT
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import VectorDBIdentifier from "./VectorDBIdentifier";
import MaxContextSnippets from "./MaxContextSnippets";
import DocumentSimilarityThreshold from "./DocumentSimilarityThreshold";
import ResetDatabase from "./ResetDatabase";
import VectorCount from "./VectorCount";
import VectorSearchMode from "./VectorSearchMode";
import CTAButton from "@/components/lib/CTAButton";

export default function VectorDatabase({ workspace }: { workspace: any }) {
  const { t } = useTranslation();
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const formEl = useRef<HTMLFormElement>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    setSaving(true);
    e.preventDefault();
    const data: Record<string, any> = {};
    const form = new FormData(formEl.current!);
    for (const [key, value] of form.entries())
      data[key] = castToType(key, value);
    const { workspace: updatedWorkspace, message } = await Workspace.update(
      workspace.slug,
      data,
    );
    if (!!updatedWorkspace) {
      showToast(t("common.workspaceUpdated"), "success", { clear: true });
    } else {
      showToast(t("common.error", { error: message }), "error", {
        clear: true,
      });
    }
    setSaving(false);
    setHasChanges(false);
  };

  if (!workspace) return null;
  return (
    <div className="w-full relative">
      <form
        ref={formEl}
        onSubmit={handleUpdate}
        className="w-1/2 flex flex-col gap-y-6"
      >
        {hasChanges && (
          <div className="absolute top-0 right-0">
            <CTAButton type="submit">
              {saving ? t("common.updating") : t("common.updateWorkspace")}
            </CTAButton>
          </div>
        )}
        <div className="flex items-start gap-x-5">
          <VectorDBIdentifier workspace={workspace} />
          <VectorCount reload={true} workspace={workspace} />
        </div>
        <VectorSearchMode workspace={workspace} setHasChanges={setHasChanges} />
        <MaxContextSnippets
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <DocumentSimilarityThreshold
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <ResetDatabase workspace={workspace} />
      </form>
    </div>
  );
}
