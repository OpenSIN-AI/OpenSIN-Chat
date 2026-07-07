// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";

interface LLMDescriptionFieldProps {
  existingRule?: { description?: string };
}

export default function LLMDescriptionField({
  existingRule,
}: LLMDescriptionFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-1.5">
      <label className="text-sm font-medium leading-5 text-theme-text-primary light:text-theme-text-primary">
        {t("model-router.rule-form.match-description-label")}
      </label>
      <textarea
        name="description"
        defaultValue={existingRule?.description || ""}
        placeholder={t("model-router.rule-form.match-description-placeholder")}
        rows={2}
        className="bg-zinc-800 light:bg-white light:border light:border-slate-300 text-theme-text-primary light:text-theme-text-primary placeholder:text-zinc-400 light:placeholder:text-slate-400 text-sm rounded-[8px] outline-none block w-full px-3.5 py-2.5 resize-none"
        required
      />
      <p className="text-xs leading-4 text-zinc-400 light:text-slate-600">
        {t("model-router.rule-form.match-description-help")}
      </p>
    </div>
  );
}
