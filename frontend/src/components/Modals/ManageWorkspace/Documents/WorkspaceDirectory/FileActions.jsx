export function FileActions({ hasChanges, handleSaveChanges, t }) {
  if (!hasChanges) return null;

  return (
    <div className="flex items-center justify-end py-6">
      <button
        onClick={(e) => handleSaveChanges(e)}
        className="border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
      >
        {t("connectors.directory.save_embed")}
      </button>
    </div>
  );
}
