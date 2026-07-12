// SPDX-License-Identifier: MIT
import { useRef } from "react";
import Admin from "@/models/admin";
import paths from "@/utils/paths";
import { LinkSimple } from "@phosphor-icons/react/dist/csr/LinkSimple";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { mutate } from "swr";
import { ADMIN_WORKSPACES_KEY } from "@/hooks/useAdminWorkspaces";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

export default function WorkspaceRow({
  workspace,
  users: _users,
  deletionProtected = false,
}: {
  workspace: {
    id: number;
    name: string;
    slug: string;
    userIds?: number[];
    createdAt: string;
  };
  users?: any;
  deletionProtected?: boolean;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const { t } = useTranslation();
  const handleDelete = async () => {
    if (
      !window.confirm(
        t("admin.workspacesPage.deleteConfirm", { name: workspace.name }),
      )
    )
      return false;
    try {
      const { success, error } = await Admin.deleteWorkspace(
        workspace.id as any,
      );
      if (!success) {
        showToast(error, "error", { clear: true });
        return;
      }
      showToast(t("admin.workspacesPage.deleteSuccess"), "success", {
        clear: true,
      });
      mutate(ADMIN_WORKSPACES_KEY);
    } catch (e) {
      showToast(String(e), "error", { clear: true });
    }
  };

  return (
    <>
      <tr
        ref={rowRef}
        className="bg-transparent text-theme-text-primary text-xs font-medium border-b border-white/10 h-10"
      >
        <th scope="row" className="px-6 whitespace-nowrap">
          {workspace.name}
        </th>
        <td className="px-6">
          <a
            href={paths.workspace.chat(workspace.slug)}
            target="_blank"
            rel="noreferrer"
            className="text-theme-text-primary flex items-center hover:underline"
          >
            <LinkSimple className="mr-2 w-4 h-4" /> {workspace.slug}
          </a>
        </td>
        <td className="px-6">
          <a
            href={paths.workspace.settings.members(workspace.slug)}
            className="text-theme-text-primary flex items-center underline"
          >
            {workspace.userIds?.length}
          </a>
        </td>
        <td className="px-6">{workspace.createdAt}</td>
        <td className="px-6">
          {!deletionProtected && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs font-medium text-theme-text-primary light:text-black/80 hover:light:text-red-500 hover:text-red-300 rounded-lg px-2 py-1 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10"
            >
              <Trash className="h-5 w-5" />
            </button>
          )}
        </td>
      </tr>
    </>
  );
}
