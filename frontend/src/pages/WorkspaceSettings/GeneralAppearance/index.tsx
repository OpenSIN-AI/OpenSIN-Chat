// SPDX-License-Identifier: MIT
import Workspace from "@/models/workspace";
import { castToType } from "@/utils/types";
import showToast from "@/utils/toast";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";
import WorkspaceName from "./WorkspaceName";
import SuggestedChatMessages from "./SuggestedChatMessages";
import DeleteWorkspace from "./DeleteWorkspace";
import CTAButton from "@/components/lib/CTAButton";
import useWorkspaceBySlug from "@/hooks/useWorkspaceBySlug";
import { WORKSPACES_KEY } from "@/hooks/useWorkspaces";
import logger from "@/utils/logger";

export default function GeneralInfo({
  slug,
  deletionProtected = false,
}: {
  slug: string;
  deletionProtected?: boolean;
}) {
  const { t } = useTranslation();
  const { workspace, isLoading: loading, refresh } = useWorkspaceBySlug(slug);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const formEl = useRef<HTMLFormElement>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
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
        setHasChanges(false);
        refresh();
        mutate(WORKSPACES_KEY);
      } else {
        showToast(t("common.error", { error: message }), "error", {
          clear: true,
        });
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!workspace || loading) return null;
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
        <WorkspaceName
          key={workspace.slug}
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
      </form>
      <SuggestedChatMessages slug={workspace.slug} />
      <DeleteWorkspace workspace={workspace} visible={!deletionProtected} />
    </div>
  );
}
