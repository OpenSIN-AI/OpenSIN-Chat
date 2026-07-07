// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";

/**
 * Determine the display type (icon + label) for a workspace document.
 * Mirrors the heuristic used in the SourcesSidebar.
 */
function getSourceType(doc: any) {
  let metadata: any = {};
  try {
    metadata = doc.metadata ? JSON.parse(doc.metadata) : {};
  } catch {
    metadata = {};
  }
  const docpath = doc.docpath || "";
  const filename = doc.filename || "";

  if (
    metadata?.url ||
    metadata?.sourceUrl ||
    docpath.includes("link") ||
    filename.startsWith("http")
  ) {
    return { icon: Globe, labelKey: "main-page.workspaceSources.type_url" };
  }

  if (
    docpath.includes("api") ||
    docpath.includes("db") ||
    docpath.includes("connector") ||
    metadata?.connectionString ||
    metadata?.apiEndpoint
  ) {
    return { icon: Database, labelKey: "main-page.workspaceSources.type_db" };
  }

  return {
    icon: FileText,
    labelKey: "main-page.workspaceSources.type_document",
  };
}

function getTitle(doc: any) {
  let metadata: any = {};
  try {
    metadata = doc.metadata ? JSON.parse(doc.metadata) : {};
  } catch {
    metadata = {};
  }
  return metadata?.title || doc.filename || doc.docId || doc.docpath || "—";
}

/**
 * Workspace sources display shown on the home / empty workspace screen.
 * Replaces the old quick-action buttons with a list of the sources that are
 * already part of the active workspace, plus a button to add more.
 *
 * @param {Object} props
 * @param {Array} props.documents - Documents embedded in the active workspace
 * @param {Function} props.onAddSources - Handler to add new sources (opens uploader)
 */
export default function WorkspaceSources({
  documents = [],
  onAddSources,
}: any) {
  const { t } = useTranslation();
  const hasSources = documents.length > 0;

  return (
    <div className="w-full mt-8">
      <div className="rounded-2xl border border-theme-sidebar-border light:border-slate-300 bg-theme-bg-chat-input/40 light:bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-white light:text-slate-900">
            {t("main-page.workspaceSources.title")}
          </p>
          <button
            type="button"
            onClick={onAddSources}
            className="border-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-theme-bg-chat-input text-theme-text-primary light:text-theme-text-primary text-xs font-medium hover:bg-zinc-700 light:hover:bg-black/20 transition-colors cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            {t("main-page.workspaceSources.add")}
          </button>
        </div>

        {hasSources ? (
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto no-scroll">
            {(documents as any).map((doc, idx) => {
              const { icon: Icon, labelKey } = getSourceType(doc);
              return (
                <div
                  key={doc.docId || doc.id || idx}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-theme-bg-chat-input transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <Icon
                      size={13}
                      className="text-white light:text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm text-white light:text-slate-900 truncate leading-tight">
                      {getTitle(doc)}
                    </p>
                    <p className="text-[11px] text-zinc-400 light:text-slate-500 leading-tight">
                      {t(labelKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 light:text-slate-500 text-center py-4 whitespace-pre-line">
            {t("main-page.workspaceSources.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
