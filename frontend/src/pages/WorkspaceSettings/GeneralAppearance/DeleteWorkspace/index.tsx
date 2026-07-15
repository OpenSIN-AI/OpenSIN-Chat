// SPDX-License-Identifier: MIT
// Purpose: Workspace deletion UI with accessible in-app confirmation dialog.
// Docs: Replaces native window.confirm with ConfirmDialog for clear, intentional confirmation.
import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mutate } from "swr";
import Workspace from "@/models/workspace";
import { WORKSPACES_KEY } from "@/hooks/useWorkspaces";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import showToast from "@/utils/toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function DeleteWorkspace({
  workspace,
  visible = true,
}: {
  workspace: { name: string; slug: string };
  visible?: boolean;
}) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { t } = useTranslation();

  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    const success = await Workspace.delete(workspace.slug);
    if (!success) {
      showToast(t("general.delete.deleteFailed"), "error", { clear: true });
      setDeleting(false);
      setShowConfirm(false);
      return;
    }

    mutate(WORKSPACES_KEY);
    if (workspace.slug === slug) {
      navigate(paths.home(), { replace: true });
    } else {
      navigate(paths.workspace.chat(slug || ""), { replace: true });
    }
  }, [workspace.slug, slug, navigate, t]);

  if (!visible) return null;
  return (
    <div className="flex flex-col mt-10">
      <label className="block input-label">{t("general.delete.title")}</label>
      <p className="text-theme-text-secondary text-xs font-medium py-1.5">
        {t("general.delete.description")}
      </p>
      <button
        disabled={deleting}
        onClick={() => setShowConfirm(true)}
        type="button"
        className="w-60 mt-4 transition-all duration-300 border border-transparent rounded-lg whitespace-nowrap text-sm px-5 py-2.5 focus:z-10 bg-red-500/25 text-red-200 light:text-red-500 hover:light:text-[#FFFFFF] hover:text-[#FFFFFF] hover:bg-red-600 disabled:bg-red-600 disabled:text-red-200 disabled:animate-pulse"
      >
        {deleting ? t("general.delete.deleting") : t("general.delete.delete")}
      </button>
      <ConfirmDialog
        open={showConfirm}
        title={t("general.delete.title")}
        description={`${t("general.delete.confirm-start")} ${workspace.name} ${t("general.delete.confirm-end")}`}
        confirmLabel={
          deleting ? t("general.delete.deleting") : t("general.delete.delete")
        }
        destructive
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onOpenChange={setShowConfirm}
      />
    </div>
  );
}
