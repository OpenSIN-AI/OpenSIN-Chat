// SPDX-License-Identifier: MIT
import Admin from "@/models/admin";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { userFromStorage } from "@/utils/request";
import System from "@/models/system";
import { useTranslation } from "react-i18next";

export default function ApiKeyRow({
  apiKey,
  removeApiKey,
}: {
  apiKey: {
    id: number;
    name?: string;
    secret?: string;
    createdBy?: { username?: string };
    createdAt: string;
  };
  removeApiKey: (id: number) => void;
}) {
  const { t } = useTranslation();
  const handleDelete = async () => {
    if (!window.confirm(t("api.row.deleteConfirm"))) return false;

    const user = userFromStorage();
    const Model = !!user ? Admin : System;
    await Model.deleteApiKey(apiKey.id as any);
    removeApiKey(apiKey.id);
  };

  return (
    <>
      <tr className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10">
        <td scope="row" className="px-6 py-3 whitespace-nowrap align-middle">
          {apiKey.name || t("api.row.unnamed")}
        </td>
        <td scope="row" className="px-6 py-3 align-middle">
          <code className="font-mono text-[11px] break-all text-theme-text-primary">
            {/* The secret is stripped server-side for security; only shown
                once at creation time in NewApiKeyModal. */}
            ••••••••••••••••
          </code>
        </td>
        <td className="px-6 py-3 text-left align-middle">
          {
            // eslint-disable-next-line i18next/no-literal-string
            apiKey.createdBy?.username || "--"
          }
        </td>
        <td className="px-6 py-3 whitespace-nowrap align-middle">
          {apiKey.createdAt ? new Date(apiKey.createdAt).toLocaleString() : "—"}
        </td>
        <td className="px-6 py-3 align-middle">
          <div className="flex items-center gap-x-6">
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs font-medium text-white/80 light:text-black/80 hover:light:text-red-500 hover:text-red-300 rounded-lg px-2 py-1 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10"
            >
              <Trash className="h-5 w-5" />
            </button>
          </div>
        </td>
      </tr>
    </>
  );
}
