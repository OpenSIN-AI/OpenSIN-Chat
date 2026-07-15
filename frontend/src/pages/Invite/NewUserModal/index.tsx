// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import React, { useState } from "react";

import Invite from "@/models/invite";
import paths from "@/utils/paths";
import { useParams } from "react-router";
import { AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { safeSetItem } from "@/utils/safeStorage";
import System from "@/models/system";
import { useTranslation } from "react-i18next";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/utils/username";

export default function NewUserModal(): JSX.Element {
  const { code } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    setError(null);
    e.preventDefault();
    setLoading(true);
    try {
      const data: Record<string, any> = {};
      const form = new FormData(e.currentTarget);
      for (const [key, value] of form.entries()) data[key] = value;

      if (data.password !== data.password_confirmation) {
        setError("Passwords do not match. Please confirm your password.");
        setLoading(false);
        return;
      }

      const { success, error } = await Invite.acceptInvite(code, data);
      if (success) {
        const { valid, user, token, message } = (await System.requestToken(
          data as any,
        )) as any;
        if (valid && !!token && !!user) {
          safeSetItem(AUTH_USER, JSON.stringify(user));
          safeSetItem(AUTH_TOKEN, token);
          window.location.href = paths.home();
        } else {
          setError(
            message ||
              "Your account was created successfully, but we could not sign you in automatically. Please log in with your credentials.",
          );
        }
        return;
      }
      setError(error);
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl max-h-full">
      <div className="relative w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border">
        <div className="flex items-start justify-between p-4 border-b rounded-t border-theme-modal-border">
          <h3 className="text-xl font-semibold text-theme-text-primary">
            {t("invite.newUser.createAccount")}
          </h3>
        </div>
        <form onSubmit={handleCreate}>
          <div className="p-6 space-y-6 flex h-full w-full">
            <div className="w-full flex flex-col gap-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block mb-2 text-sm font-medium text-theme-text-primary"
                >
                  {t("invite.newUser.username")}
                </label>
                <input
                  name="username"
                  type="text"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t("invite.newUser.usernamePlaceholder")}
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  pattern={USERNAME_PATTERN}
                  required={true}
                  autoComplete="username"
                />
                <p className="mt-2 text-xs text-theme-text-secondary">
                  {t("common.username_requirements")}
                </p>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-theme-text-primary"
                >
                  {t("invite.newUser.password")}
                </label>
                <input
                  name="password"
                  type="password"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t("invite.newUser.passwordPlaceholder")}
                  required={true}
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label
                  htmlFor="password_confirmation"
                  className="block mb-2 text-sm font-medium text-theme-text-primary"
                >
                  {t("invite.newUser.passwordConfirmation")}
                </label>
                <input
                  name="password_confirmation"
                  type="password"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                  placeholder={t(
                    "invite.newUser.passwordConfirmationPlaceholder",
                  )}
                  required={true}
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm">
                  {t("invite.newUser.error", { error })}
                </p>
              )}
              <p className="text-theme-text-secondary text-xs md:text-sm">
                {t("invite.newUser.afterCreateHint")}
              </p>
            </div>
          </div>
          <div className="flex w-full justify-between items-center p-6 space-x-2 border-t rounded-b border-theme-modal-border">
            <button
              type="submit"
              disabled={loading}
              className="w-full transition-all duration-300 border border-theme-text-primary px-4 py-2 rounded-lg text-theme-text-primary text-sm items-center flex gap-x-2 hover:bg-theme-text-primary hover:text-theme-bg-primary focus:ring-gray-800 text-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? t("login.multi-user.validating")
                : t("invite.newUser.acceptInvitation")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
