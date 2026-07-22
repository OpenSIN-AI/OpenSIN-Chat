// SPDX-License-Identifier: MIT
import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Eye,
  EyeSlash,
  CircleNotch,
  ArrowLeft,
  Key,
} from "@phosphor-icons/react";
import System from "../../../models/system";
import { AUTH_TOKEN, AUTH_USER, RESET_TOKEN } from "../../../utils/constants";
import paths from "../../../utils/paths";
import showToast from "@/utils/toast";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/utils/safeStorage";
import ModalWrapper from "@/components/ModalWrapper";
import { useModal } from "@/hooks/useModal";
import RecoveryCodeModal from "@/components/Modals/DisplayRecoveryCodeModal";
import { useTranslation } from "react-i18next";
import useCustomAppName from "@/hooks/useCustomAppName";
import logger from "@/utils/logger";

/* Shared field styles so every input looks identical */
const FIELD_CLASS =
  "w-full h-10 rounded-lg border border-white/[0.08] light:border-zinc-200 bg-[#1c1c1c] light:bg-zinc-50 pl-10 pr-4 text-sm text-[#fafafa] light:text-zinc-900 placeholder:text-[#3f3f46] light:placeholder:text-zinc-300 transition focus:outline-none focus:border-white/20 light:focus:border-zinc-400 focus:bg-[#222222] light:focus:bg-white";
const LABEL_CLASS =
  "text-xs font-medium text-[#a1a1aa] light:text-zinc-500 uppercase tracking-wider";
const PRIMARY_BTN_CLASS =
  "mt-2 flex h-10 w-full items-center justify-center gap-x-2 rounded-lg bg-[#fafafa] light:bg-zinc-900 text-sm font-semibold text-zinc-900 light:text-white transition hover:bg-[#e4e4e7] light:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40";
const LINK_BTN_CLASS =
  "flex items-center justify-center gap-x-1.5 text-xs text-[#71717a] light:text-zinc-400 hover:text-[#a1a1aa] light:hover:text-zinc-600 transition";

interface RecoveryFormProps {
  onSubmit: (username: string, recoveryCodes: string[]) => Promise<void>;
  setShowRecoveryForm: (show: boolean) => void;
}

const RecoveryForm = ({ onSubmit, setShowRecoveryForm }: RecoveryFormProps) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryCodeInputs, setRecoveryCodeInputs] = useState(
    Array(2).fill(""),
  );

  const handleRecoveryCodeChange = (index: number, value: string) => {
    const updatedCodes = [...recoveryCodeInputs];
    updatedCodes[index] = value;
    setRecoveryCodeInputs(updatedCodes);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const recoveryCodes = recoveryCodeInputs.filter(
        (code) => code.trim() !== "",
      );
      await onSubmit(username, recoveryCodes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      <div className="flex flex-col gap-y-1.5 mb-7">
        <h2 className="text-xl font-semibold tracking-tight text-[#fafafa] light:text-zinc-900">
          {t("login.password-reset.title")}
        </h2>
        <p className="text-sm text-[#71717a] light:text-zinc-500 leading-relaxed">
          {t("login.password-reset.description")}
        </p>
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          <label htmlFor="recovery-username" className={LABEL_CLASS}>
            {t("login.multi-user.placeholder-username")}
          </label>
          <div className="relative">
            <User
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              id="recovery-username"
              name="username"
              type="text"
              aria-label={t("auth.username")}
              className={FIELD_CLASS}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
        </div>

        <div className="flex flex-col gap-y-2">
          <label className={LABEL_CLASS}>
            {t("login.password-reset.recovery-codes")}
          </label>
          {/* index key OK: static list */}
          {recoveryCodeInputs.map((code, index) => (
            <div key={index} className="relative">
              <Key
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                name={`recoveryCode${index + 1}`}
                aria-label={`${t("login.password-reset.recovery-codes")} ${
                  index + 1
                }`}
                className={FIELD_CLASS}
                value={code}
                onChange={(e) =>
                  handleRecoveryCodeChange(index, e.target.value)
                }
                required
                autoComplete="one-time-code"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-y-4">
        <button type="submit" disabled={loading} className={PRIMARY_BTN_CLASS}>
          {loading ? (
            <>
              <CircleNotch size={18} className="animate-spin" />
              {t("login.multi-user.validating")}
            </>
          ) : (
            t("login.password-reset.title")
          )}
        </button>
        <button
          type="button"
          className={LINK_BTN_CLASS}
          onClick={() => setShowRecoveryForm(false)}
        >
          <ArrowLeft size={16} />
          {t("login.password-reset.back-to-login")}
        </button>
      </div>
    </form>
  );
};

interface ResetPasswordFormProps {
  onSubmit: (newPassword: string, confirmPassword: string) => Promise<void>;
}

const ResetPasswordForm = ({ onSubmit }: ResetPasswordFormProps) => {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(newPassword, confirmPassword);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      <div className="flex flex-col gap-y-1.5 mb-7">
        <h2 className="text-xl font-semibold tracking-tight text-[#fafafa] light:text-zinc-900">
          {t("multiUserAuth.resetPassword.title")}
        </h2>
        <p className="text-sm text-[#71717a] light:text-zinc-500 leading-relaxed">
          {t("multiUserAuth.resetPassword.description")}
        </p>
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          <label htmlFor="reset-newPassword" className={LABEL_CLASS}>
            {t("multiUserAuth.resetPassword.newPassword")}
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              id="reset-newPassword"
              type="password"
              name="newPassword"
              aria-label={t("auth.newPassword")}
              className={FIELD_CLASS}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex flex-col gap-y-2">
          <label htmlFor="reset-confirmPassword" className={LABEL_CLASS}>
            {t("multiUserAuth.resetPassword.confirmPassword")}
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              id="reset-confirmPassword"
              type="password"
              name="confirmPassword"
              aria-label={t("multiUserAuth.resetPassword.confirmPassword")}
              className={FIELD_CLASS}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={PRIMARY_BTN_CLASS}
        >
          {loading ? (
            <>
              <CircleNotch size={18} className="animate-spin" />
              {t("login.multi-user.validating")}
            </>
          ) : (
            t("multiUserAuth.resetPassword.title")
          )}
        </button>
      </div>
    </form>
  );
};

export default function MultiUserAuth() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<any[]>([]);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<any>(null);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const { appName, isLoading: appNameLoading } = useCustomAppName();

  const {
    isOpen: isRecoveryCodeModalOpen,
    openModal: openRecoveryCodeModal,
    closeModal: closeRecoveryCodeModal,
  } = useModal();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    setError(null);
    setLoading(true);
    e.preventDefault();
    try {
      const data = {} as any;
      const form = new FormData(e.currentTarget);
      for (const [key, value] of form.entries()) data[key] = value;
      const { valid, user, token, message, recoveryCodes } =
        (await System.requestToken(data)) as any;
      if (valid && !!token && !!user) {
        setUser(user);
        setToken(token);

        if (recoveryCodes) {
          setRecoveryCodes(recoveryCodes);
          openRecoveryCodeModal();
        } else {
          safeSetItem(AUTH_USER, JSON.stringify(user));
          safeSetItem(AUTH_TOKEN, token);
          window.location.href = paths.home();
        }
      } else {
        setError(message);
      }
    } catch (err: unknown) {
      logger.error(err);
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadComplete = () => setDownloadComplete(true);
  const handleResetPassword = () => setShowRecoveryForm(true);
  const handleRecoverySubmit = async (username: string, recoveryCodes: string[]) => {
    try {
      const { success, resetToken, error } = await (
        System.recoverAccount as any
      )(username, recoveryCodes);

      if (success && resetToken) {
        safeSetItem(RESET_TOKEN, resetToken);
        setShowRecoveryForm(false);
        setShowResetPasswordForm(true);
      } else {
        showToast(error, "error", { clear: true });
      }
    } catch (err) {
      logger.error(err);
    }
  };

  const handleResetSubmit = async (newPassword: string, confirmPassword: string) => {
    try {
      const resetToken = safeGetItem(RESET_TOKEN);

      if (resetToken) {
        const { success, error } = await System.resetPassword(
          resetToken,
          newPassword,
          confirmPassword,
        );

        if (success) {
          safeRemoveItem(RESET_TOKEN);
          setShowResetPasswordForm(false);
          showToast(t("multiUserAuth.resetPassword.success"), "success", {
            clear: true,
          });
        } else {
          showToast(error, "error", { clear: true });
        }
      } else {
        showToast(t("multiUserAuth.resetPassword.invalidToken"), "error", {
          clear: true,
        });
      }
    } catch (err) {
      logger.error(err);
    }
  };

  useEffect(() => {
    if (downloadComplete && user && token) {
      safeSetItem(AUTH_USER, JSON.stringify(user));
      safeSetItem(AUTH_TOKEN, token);
      window.location.href = paths.home();
    }
  }, [downloadComplete, user, token]);

  if (showRecoveryForm) {
    return (
      <RecoveryForm
        onSubmit={handleRecoverySubmit}
        setShowRecoveryForm={setShowRecoveryForm}
      />
    );
  }

  if (showResetPasswordForm)
    return <ResetPasswordForm onSubmit={handleResetSubmit} />;

  return (
    <>
      <form onSubmit={handleLogin} className="flex flex-col w-full">
        <div className="flex flex-col gap-y-1.5 mb-7">
          <h2 className="text-xl font-semibold tracking-tight text-[#fafafa] light:text-zinc-900">
            {t("login.multi-user.welcome")}
          </h2>
          <p className="text-sm text-[#71717a] light:text-zinc-500 leading-relaxed">
            {t("login.sign-in", { appName: appName || "OpenSIN Chat" })}
          </p>
        </div>

        <div className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-2">
            <label htmlFor="login-username" className={LABEL_CLASS}>
              {t("login.multi-user.placeholder-username")}
            </label>
            <div className="relative">
              <User
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                id="login-username"
                name="username"
                type="text"
                aria-label={t("auth.username")}
                className={FIELD_CLASS}
                required={true}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-2">
            <label htmlFor="login-password" className={LABEL_CLASS}>
              {t("login.multi-user.placeholder-password")}
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                aria-label={t("auth.password")}
                className={`${FIELD_CLASS} pr-11`}
                required={true}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition"
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs text-red-400"
            >
              {t("login.multi-user.errorPrefix", { error })}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-y-4">
          <button
            disabled={loading || appNameLoading}
            aria-busy={loading || appNameLoading}
            aria-label={t("common.save", "Save")}
            type="submit"
            className={PRIMARY_BTN_CLASS}
          >
            {loading ? (
              <>
                <CircleNotch size={18} className="animate-spin" />
                {t("login.multi-user.validating")}
              </>
            ) : (
              t("login.multi-user.login")
            )}
          </button>
          <button
            type="button"
            className={LINK_BTN_CLASS}
            onClick={handleResetPassword}
          >
            {t("login.multi-user.forgot-pass")}?
            <b className="font-semibold text-[#009ee0]">
              {t("login.multi-user.reset")}
            </b>
          </button>
        </div>
      </form>

      <ModalWrapper isOpen={isRecoveryCodeModalOpen} noPortal={true}>
        <RecoveryCodeModal
          recoveryCodes={recoveryCodes}
          onDownloadComplete={handleDownloadComplete}
          onClose={closeRecoveryCodeModal}
        />
      </ModalWrapper>
    </>
  );
}
