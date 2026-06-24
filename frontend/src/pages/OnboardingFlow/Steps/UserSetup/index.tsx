// SPDX-License-Identifier: MIT
// Purpose: Onboarding step to choose single-user or multi-user setup and configure credentials.
// Docs: index.doc.md
import System from "@/models/system";
import showToast from "@/utils/toast";
import React, { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import paths from "@/utils/paths";
import { useNavigate } from "react-router-dom";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { safeSetItem, safeRemoveItem } from "@/utils/safeStorage";
import { useTranslation } from "react-i18next";
import { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from "@/utils/username";
import { PW_REGEX } from "@/pages/GeneralSettings/Security";
import type { NavigateFunction } from "react-router-dom";

interface OnboardingStepProps {
  setHeader: (header: { title: string; description: string }) => void;
  setForwardBtn: (btn: {
    showing: boolean;
    disabled: boolean;
    onClick: () => void;
  }) => void;
  setBackBtn: (btn: {
    showing: boolean;
    disabled: boolean;
    onClick: () => void;
  }) => void;
}

export default function UserSetup({
  setHeader,
  setForwardBtn,
  setBackBtn,
}: OnboardingStepProps) {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState("");
  const [singleUserPasswordValid, setSingleUserPasswordValid] = useState(false);
  const [multiUserLoginValid, setMultiUserLoginValid] = useState(false);
  const [enablePassword, setEnablePassword] = useState(false);
  const myTeamSubmitRef = useRef<HTMLButtonElement>(null);
  const justMeSubmitRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const TITLE = t("onboarding.userSetup.title");
  const DESCRIPTION = t("onboarding.userSetup.description");

  function handleForward() {
    if (selectedOption === "just_me" && enablePassword) {
      justMeSubmitRef.current?.click();
    } else if (selectedOption === "just_me" && !enablePassword) {
      navigate(paths.onboarding.dataHandling());
    } else if (selectedOption === "my_team") {
      myTeamSubmitRef.current?.click();
    }
  }

  function handleBack() {
    navigate(paths.onboarding.llmPreference());
  }

  useEffect(() => {
    let isDisabled = true;
    if (selectedOption === "just_me") {
      isDisabled = !singleUserPasswordValid;
    } else if (selectedOption === "my_team") {
      isDisabled = !multiUserLoginValid;
    }

    setForwardBtn({
      showing: true,
      disabled: isDisabled,
      onClick: handleForward,
    });
  }, [
    selectedOption,
    singleUserPasswordValid,
    multiUserLoginValid,
    enablePassword,
  ]);

  useEffect(() => {
    setHeader({ title: TITLE, description: DESCRIPTION });
    setBackBtn({ showing: true, disabled: false, onClick: handleBack });
  }, []);

  return (
    <div className="w-full flex items-center justify-center flex-col gap-y-6">
      <div className="flex flex-col border rounded-lg border-white/20 light:border-theme-sidebar-border p-8 items-center gap-y-4 w-full max-w-[600px]">
        <div className=" text-white text-sm font-semibold md:-ml-44">
          {t("onboarding.userSetup.howManyUsers")}
        </div>
        <div className="flex flex-col md:flex-row gap-6 w-full justify-center">
          <button
            type="button"
            onClick={() => setSelectedOption("just_me")}
            className={`${
              selectedOption === "just_me"
                ? "text-sky-400 border-sky-400/70"
                : "text-theme-text-primary border-theme-sidebar-border"
            } min-w-[230px] h-11 p-4 rounded-[10px] border-2  justify-center items-center gap-[100px] inline-flex hover:border-sky-400/70 hover:text-sky-400 transition-all duration-300`}
          >
            <div className="text-center text-sm font-bold">
              {t("onboarding.userSetup.justMe")}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSelectedOption("my_team")}
            className={`${
              selectedOption === "my_team"
                ? "text-sky-400 border-sky-400/70"
                : "text-theme-text-primary border-theme-sidebar-border"
            } min-w-[230px] h-11 p-4 rounded-[10px] border-2  justify-center items-center gap-[100px] inline-flex hover:border-sky-400/70 hover:text-sky-400 transition-all duration-300`}
          >
            <div className="text-center text-sm font-bold">
              {t("onboarding.userSetup.myTeam")}
            </div>
          </button>
        </div>
      </div>
      {selectedOption === "just_me" && (
        <JustMe
          setSingleUserPasswordValid={setSingleUserPasswordValid}
          enablePassword={enablePassword}
          setEnablePassword={setEnablePassword}
          justMeSubmitRef={justMeSubmitRef}
          navigate={navigate}
        />
      )}
      {selectedOption === "my_team" && (
        <MyTeam
          setMultiUserLoginValid={setMultiUserLoginValid}
          myTeamSubmitRef={myTeamSubmitRef}
          navigate={navigate}
        />
      )}
    </div>
  );
}

interface JustMeProps {
  setSingleUserPasswordValid: (valid: boolean) => void;
  enablePassword: boolean;
  setEnablePassword: (enabled: boolean) => void;
  justMeSubmitRef: React.RefObject<HTMLButtonElement>;
  navigate: NavigateFunction;
}

const JustMe = ({
  setSingleUserPasswordValid,
  enablePassword,
  setEnablePassword,
  justMeSubmitRef,
  navigate,
}: JustMeProps) => {
  const { t } = useTranslation();
  const [itemSelected, setItemSelected] = useState(false);
  const [password, setPassword] = useState("");
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!PW_REGEX.test(String(formData.get("password")))) {
      showToast(t("onboarding.userSetup.passwordRestricted"), "error");
      return;
    }

    const { error } = await System.updateSystemPassword({
      usePassword: true,
      newPassword: String(formData.get("password")),
    });

    if (error) {
      showToast(
        t("onboarding.userSetup.setPasswordFailed", { error }),
        "error",
      );
      return;
    }

    // Auto-request token with password that was just set so they
    // are not redirected to login after completion.
    const { token } = await System.requestToken({
      password: String(formData.get("password")),
    });
    safeRemoveItem(AUTH_USER);
    safeRemoveItem(AUTH_TIMESTAMP);
    safeSetItem(AUTH_TOKEN, token);

    navigate(paths.onboarding.dataHandling());
  };

  const setNewPassword = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPassword(e.target.value);
  const handlePasswordChange = debounce(setNewPassword, 500);

  function handleYes() {
    setItemSelected(true);
    setEnablePassword(true);
  }

  function handleNo() {
    setItemSelected(true);
    setEnablePassword(false);
  }

  useEffect(() => {
    if (enablePassword && itemSelected && password.length >= 8) {
      setSingleUserPasswordValid(true);
    } else if (!enablePassword && itemSelected) {
      setSingleUserPasswordValid(true);
    } else {
      setSingleUserPasswordValid(false);
    }
  }, [enablePassword, itemSelected, password, setSingleUserPasswordValid]);
  return (
    <div className="w-full flex items-center justify-center flex-col gap-y-6">
      <div className="flex flex-col border rounded-lg border-white/20 light:border-theme-sidebar-border p-8 items-center gap-y-4 w-full max-w-[600px]">
        <div className=" text-white text-sm font-semibold md:-ml-56">
          {t("onboarding.userSetup.setPassword")}
        </div>
        <div className="flex flex-col md:flex-row gap-6 w-full justify-center">
          <button
            type="button"
            onClick={handleYes}
            className={`${
              enablePassword && itemSelected
                ? "text-sky-400 border-sky-400/70"
                : "text-theme-text-primary border-theme-sidebar-border"
            } min-w-[230px] h-11 p-4 rounded-[10px] border-2  justify-center items-center gap-[100px] inline-flex hover:border-sky-400/70 hover:text-sky-400 transition-all duration-300`}
          >
            <div className="text-center text-sm font-bold">
              {t("common.yes")}
            </div>
          </button>
          <button
            type="button"
            onClick={handleNo}
            className={`${
              !enablePassword && itemSelected
                ? "text-sky-400 border-sky-400/70"
                : "text-theme-text-primary border-theme-sidebar-border"
            } min-w-[230px] h-11 p-4 rounded-[10px] border-2  justify-center items-center gap-[100px] inline-flex hover:border-sky-400/70 hover:text-sky-400 transition-all duration-300`}
          >
            <div className="text-center text-sm font-bold">
              {t("common.no")}
            </div>
          </button>
        </div>
        {enablePassword && (
          <form className="w-full mt-4" onSubmit={handleSubmit}>
            <label
              htmlFor="name"
              className="block mb-3 text-sm font-medium text-white"
            >
              {t("onboarding.userSetup.instancePassword")}
            </label>
            <input
              name="password"
              type="password"
              className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2.5 focus:outline-primary-button active:outline-primary-button outline-none placeholder:text-theme-text-secondary"
              placeholder={t("onboarding.userSetup.placeholder.adminPassword")}
              minLength={6}
              required={true}
              autoComplete="off"
              onChange={handlePasswordChange}
            />
            <div className="mt-4 text-white text-opacity-80 text-xs font-base -mb-2">
              {t("onboarding.userSetup.passwordReq")}
              <br />
              <i>{t("onboarding.userSetup.passwordWarn")}</i>{" "}
            </div>
            <button
              type="submit"
              ref={justMeSubmitRef}
              hidden
              aria-hidden="true"
            ></button>
          </form>
        )}
      </div>
    </div>
  );
};

interface MyTeamProps {
  setMultiUserLoginValid: (valid: boolean) => void;
  myTeamSubmitRef: React.RefObject<HTMLButtonElement>;
  navigate: NavigateFunction;
}

const MyTeam = ({
  setMultiUserLoginValid,
  myTeamSubmitRef,
  navigate,
}: MyTeamProps) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      username: String(formData.get("username")),
      password: String(formData.get("password")),
    };
    const { success, error } = await System.setupMultiUser(data);
    if (!success) {
      showToast(t("onboarding.userSetup.error", { error }), "error");
      return;
    }

    // Auto-request token with credentials that were just set so they
    // are not redirected to login after completion. Must set the token
    // BEFORE navigating so the next page has auth context.
    const { user, token } = await System.requestToken(data);
    safeSetItem(AUTH_USER, JSON.stringify(user));
    safeSetItem(AUTH_TOKEN, token);
    safeRemoveItem(AUTH_TIMESTAMP);
    navigate(paths.onboarding.dataHandling());
  };

  const setNewUsername = (e: React.ChangeEvent<HTMLInputElement>) =>
    setUsername(e.target.value);
  const setNewPassword = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPassword(e.target.value);
  const handleUsernameChange = debounce(setNewUsername, 500);
  const handlePasswordChange = debounce(setNewPassword, 500);

  useEffect(() => {
    // Enable button if there's any input, allowing users to attempt submission
    // Validation errors will be shown via toast in handleSubmit
    if (username.trim().length > 0 && password.length > 0) {
      setMultiUserLoginValid(true);
    } else {
      setMultiUserLoginValid(false);
    }
  }, [username, password]);
  return (
    <div className="w-full flex items-center justify-center border max-w-[600px] rounded-lg border-white/20 light:border-theme-sidebar-border">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col w-full md:px-8 px-2 py-4">
          <div className="space-y-6 flex h-full w-full">
            <div className="w-full flex flex-col gap-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block mb-3 text-sm font-medium text-white"
                >
                  {t("onboarding.userSetup.adminUsername")}
                </label>
                <input
                  name="username"
                  type="text"
                  className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2.5 focus:outline-primary-button active:outline-primary-button placeholder:text-theme-text-secondary outline-none"
                  placeholder={t(
                    "onboarding.userSetup.placeholder.adminUsername",
                  )}
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  required={true}
                  autoComplete="off"
                  onChange={handleUsernameChange}
                />
              </div>
              <p className=" text-white text-opacity-80 text-xs font-base">
                {t("common.username_requirements")}
              </p>
              <div className="mt-4">
                <label
                  htmlFor="name"
                  className="block mb-3 text-sm font-medium text-white"
                >
                  {t("onboarding.userSetup.adminPassword")}
                </label>
                <input
                  name="password"
                  type="password"
                  className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2.5 focus:outline-primary-button active:outline-primary-button placeholder:text-theme-text-secondary outline-none"
                  placeholder={t(
                    "onboarding.userSetup.placeholder.adminPassword",
                  )}
                  minLength={8}
                  required={true}
                  autoComplete="off"
                  onChange={handlePasswordChange}
                />
              </div>
              <p className=" text-white text-opacity-80 text-xs font-base">
                {t("onboarding.userSetup.adminPasswordReq")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex w-full justify-between items-center px-6 py-4 space-x-6 border-t rounded-b border-theme-sidebar-border">
          <div className="text-theme-text-secondary text-opacity-80 text-xs font-base">
            {t("onboarding.userSetup.teamHint")}
          </div>
        </div>
        <button
          type="submit"
          ref={myTeamSubmitRef}
          hidden
          aria-hidden="true"
        ></button>
      </form>
    </div>
  );
};
