// SPDX-License-Identifier: MIT
import { useEffect, useState, useCallback } from "react";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { X } from "@phosphor-icons/react/dist/csr/X";
import Transformations, { Transformation } from "@/models/transformation";
import showToast from "@/utils/toast";

const EMPTY_FORM: Partial<Transformation> = {
  name: "",
  title: "",
  description: "",
  prompt: "",
  applyDefault: false,
};

export default function AdminTransformations() {
  const [items, setItems] = useState<Transformation[]>([]);
  const [editing, setEditing] = useState<Partial<Transformation> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setItems(await Transformations.all());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing?.name?.trim() || !editing?.prompt?.trim()) {
      showToast("Name and Prompt are required fields.", "error", {
        clear: true,
      });
      return;
    }
    setSaving(true);
    const result = editing.id
      ? await Transformations.update(editing.id, editing)
      : await Transformations.create(editing);
    setSaving(false);
    if ((result as any)?.error) {
      showToast((result as any).error, "error", { clear: true });
      return;
    }
    showToast("Transformation saved.", "success", { clear: true });
    setEditing(null);
    load();
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this transformation?")) return;
    const ok = await Transformations.delete(id);
    if (!ok) {
      showToast("Delete failed.", "error", { clear: true });
      return;
    }
    load();
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-theme-text-primary">
            Transformations
          </h1>
          <p className="text-xs text-theme-text-secondary leading-relaxed">
            Reusable prompts that generate Insights from documents with one
            click.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_FORM })}
          className="flex items-center gap-x-1.5 rounded-lg bg-theme-sidebar-item-selected px-3 py-2 text-xs font-semibold text-theme-text-primary hover:opacity-90 transition-opacity"
        >
          <Plus size={14} weight="bold" aria-hidden="true" />
          New
        </button>
      </header>

      {/* List */}
      <ul className="flex flex-col gap-y-2">
        {items.map((t) => (
          <li
            key={t.id}
            className="flex items-start justify-between gap-x-4 rounded-lg border border-theme-modal-border p-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-theme-text-primary">
                {t.name}
                {t.applyDefault && (
                  <span className="ml-2 rounded-full bg-theme-sidebar-item-hover px-2 py-0.5 text-[10px] font-medium text-theme-text-secondary align-middle">
                    Auto on upload
                  </span>
                )}
              </p>
              {t.description && (
                <p className="text-xs text-theme-text-secondary">
                  {t.description}
                </p>
              )}
              <p className="mt-1 text-[11px] text-theme-text-secondary line-clamp-2 leading-relaxed">
                {t.prompt}
              </p>
            </div>
            <div className="flex items-center gap-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditing(t)}
                aria-label={`Edit ${t.name}`}
                className="text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                <PencilSimple size={16} />
              </button>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label={`Delete ${t.name}`}
                className="text-theme-text-secondary hover:text-red-500 transition-colors"
              >
                <Trash size={16} />
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-theme-text-secondary">
            No transformations yet. Default ones will be seeded on first use.
          </p>
        )}
      </ul>

      {/* Editor Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setEditing(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing.id ? "Edit Transformation" : "New Transformation"}
            className="w-full max-w-lg rounded-lg border border-theme-modal-border bg-theme-bg-secondary p-6 flex flex-col gap-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-theme-text-primary">
                {editing.id ? "Edit Transformation" : "New Transformation"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <label className="flex flex-col gap-y-1 text-xs text-theme-text-secondary">
              Name *
              <input
                type="text"
                value={editing.name ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                className="rounded-lg border border-theme-modal-border bg-theme-bg-primary px-3 py-2 text-sm text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-theme-sidebar-item-selected"
              />
            </label>

            <label className="flex flex-col gap-y-1 text-xs text-theme-text-secondary">
              Insight title (optional, falls back to Name)
              <input
                type="text"
                value={editing.title ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                className="rounded-lg border border-theme-modal-border bg-theme-bg-primary px-3 py-2 text-sm text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-theme-sidebar-item-selected"
              />
            </label>

            <label className="flex flex-col gap-y-1 text-xs text-theme-text-secondary">
              Description (optional)
              <input
                type="text"
                value={editing.description ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                className="rounded-lg border border-theme-modal-border bg-theme-bg-primary px-3 py-2 text-sm text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-theme-sidebar-item-selected"
              />
            </label>

            <label className="flex flex-col gap-y-1 text-xs text-theme-text-secondary">
              Prompt *
              <textarea
                rows={5}
                value={editing.prompt ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, prompt: e.target.value })
                }
                className="resize-none rounded-lg border border-theme-modal-border bg-theme-bg-primary px-3 py-2 text-sm text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-theme-sidebar-item-selected"
              />
            </label>

            <label className="flex items-center gap-x-2 text-xs text-theme-text-primary">
              <input
                type="checkbox"
                checked={!!editing.applyDefault}
                onChange={(e) =>
                  setEditing({ ...editing, applyDefault: e.target.checked })
                }
              />
              Automatically apply to newly uploaded documents
            </label>

            <div className="flex justify-end gap-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-theme-modal-border px-4 py-2 text-xs text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-theme-sidebar-item-selected px-4 py-2 text-xs font-semibold text-theme-text-primary disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
