// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import useUser from "@/hooks/useUser";
import Admin from "@/models/admin";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useSupportEmail from "@/hooks/useSupportEmail";

export default function SupportEmail(): JSX.Element {
  const { user } = useUser();
  const { email: fetchedEmail, isLoading } = useSupportEmail();
  const [hasChanges, setHasChanges] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const { t } = useTranslation();

  // Sync SWR data into local state
  const [synced, setSynced] = useState(false);
  if (!isLoading && !synced) {
    setSupportEmail(fetchedEmail);
    setOriginalEmail(fetchedEmail);
    setSynced(true);
  }

  const updateSupportEmail = async (
    e: React.FormEvent<HTMLFormElement>,
    newValue: string | null = null,
  ) => {
    e.preventDefault();
    let support_email = newValue;
    if (newValue === null) {
      const form = new FormData(e.currentTarget);
      support_email = form.get("supportEmail") as string;
    }

    const { success, error } = await Admin.updateSystemPreferences({
      support_email,
    });

    if (!success) {
      showToast(`Failed to update support email: ${error}`, "error");
      return;
    } else {
      showToast("Successfully updated support email.", "success");
      window.localStorage.removeItem(System.cacheKeys.supportEmail);
      setSupportEmail(support_email as string);
      setOriginalEmail(support_email as string);
      setHasChanges(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSupportEmail(e.target.value);
    setHasChanges(true);
  };

  if (isLoading || !user?.role) return null;
  return (
    <form
      className="flex flex-col gap-y-0.5 mt-4"
      onSubmit={updateSupportEmail}
    >
      <p className="text-sm leading-6 font-semibold text-white">
        {t("customization.items.support-email.title")}
      </p>
      <p className="text-xs text-white/60">
        {t("customization.items.support-email.description")}
      </p>
      <div className="flex items-center gap-x-4">
        <input
          name="supportEmail"
          type="email"
          className="border-none bg-theme-settings-input-bg mt-2 text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-fit py-2 px-4"
          placeholder={t("settings.supportEmail.placeholder")}
          required={true}
          autoComplete="off"
          onChange={handleChange}
          value={supportEmail}
        />
        {originalEmail !== "" && (
          <button
            type="button"
            onClick={(e) => updateSupportEmail(e as any, "")}
            className="text-white text-base font-medium hover:text-opacity-60"
          >
            {t("settings.supportEmail.clear")}
          </button>
        )}
      </div>
      {hasChanges && (
        <button
          type="submit"
          className="transition-all mt-2 w-fit duration-300 border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
        >
          {t("settings.supportEmail.save")}
        </button>
      )}
    </form>
  );
}
