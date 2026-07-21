// SPDX-License-Identifier: MIT
import { memo, useEffect, useRef, useState } from "react";
import paths from "@/utils/paths";
import useLogo from "@/hooks/useLogo";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { Flask } from "@phosphor-icons/react/dist/csr/Flask";
import { Gear } from "@phosphor-icons/react/dist/csr/Gear";
import { UserCircleGear } from "@phosphor-icons/react/dist/csr/UserCircleGear";
import { PencilSimpleLine } from "@phosphor-icons/react/dist/csr/PencilSimpleLine";
import { Nut } from "@phosphor-icons/react/dist/csr/Nut";
import { Toolbox } from "@phosphor-icons/react/dist/csr/Toolbox";
import { Plugs } from "@phosphor-icons/react/dist/csr/Plugs";
import AgentIcon from "@/media/animations/agent-static.png";
import useUser from "@/hooks/useUser";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import Footer from "../Footer";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import showToast from "@/utils/toast";
import { safeGetItem, safeSetItem } from "@/utils/safeStorage";
import Option from "./MenuOption";
import { CanViewChatHistoryProvider } from "../CanViewChatHistory";
import useAppVersion from "@/hooks/useAppVersion";
import useSupportEmail from "@/hooks/useSupportEmail";

/**
 * Prominent "Back to Chat" link shown at the top of the settings sidebar
 * options list. Gives users a clear, labeled way back to the workspace chat
 * (previously only the logo/house icon linked home, which was not discoverable).
 * Visible to every role since anyone in settings may need to return.
 */
function BackToChatButton({ t, onClick }: any) {
  return (
    <Link
      to={paths.home()}
      onClick={onClick}
      className="flex items-center gap-x-2 mx-3 mb-1 px-3 py-2 rounded-[6px] bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover text-theme-text-primary text-sm font-medium transition-all duration-300 border border-transparent hover:border-slate-100 hover:border-opacity-50"
    >
      <CaretLeft className="h-4 w-4 shrink-0" />
      {t("settings.backToChat")}
    </Link>
  );
}

function SettingsSidebar() {
  const { t } = useTranslation();
  const { logo } = useLogo();
  const { user } = useUser();
  const isMobile = useIsMobileLayout();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const [showSidebar, setShowSidebar] = useState(false as any);
  const [showBgOverlay, setShowBgOverlay] = useState(false as any);

  useEffect(() => {
    if (showSidebar) {
      const timer = setTimeout(() => {
        setShowBgOverlay(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowBgOverlay(false);
    }
  }, [showSidebar]);

  // Focus trap and Escape handling for mobile sidebar overlay
  useEffect(() => {
    if (!isMobile || !showSidebar) {
      // Return focus to trigger when sidebar closes
      if (!showSidebar && triggerButtonRef.current) {
        triggerButtonRef.current.focus();
      }
      return;
    }

    // Focus the close button when the sidebar opens
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSidebar(false);
        return;
      }
      if (e.key !== "Tab" || !sidebarRef.current) return;
      const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, showSidebar]);

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-2 bg-theme-bg-sidebar light:bg-white text-theme-text-secondary shadow-lg h-16">
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => setShowSidebar(true)}
            aria-label={t("common.showSidebar")}
            className="rounded-md p-2 flex items-center justify-center text-theme-text-secondary"
          >
            <List className="h-6 w-6" />
          </button>
          <div className="flex items-center justify-center flex-grow gap-x-2">
            <img
              src={logo}
              alt={t("common.logo")}
              className="h-6 w-6 max-h-6 max-w-6 object-contain"
            />
            <span className="text-theme-text-primary font-bold text-base">
              OpenSIN
            </span>
          </div>
          <div className="w-12"></div>
        </div>
        <div
          className={`z-[99] fixed top-0 left-0 transition-all duration-500 w-[100vw] h-[100vh] ${
            showSidebar ? "translate-x-0" : "-translate-x-[100vw]"
          }`}
        >
          <div
            className={`${
              showBgOverlay
                ? "transition-all opacity-1"
                : "transition-none opacity-0"
            }  duration-500 fixed top-0 left-0 bg-theme-bg-secondary bg-opacity-75 w-screen h-screen`}
            onClick={() => setShowSidebar(false)}
          />
          <div
            ref={sidebarRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("settings.title")}
            className="h-[100vh] fixed top-0 left-0 rounded-r-[26px] bg-theme-bg-sidebar w-[80%] p-[18px]"
          >
            <div className="w-full h-full flex flex-col overflow-x-hidden justify-between">
              <div className="flex w-full items-center justify-between gap-x-4">
                <div className="flex shrink-0 w-fit items-center justify-start gap-x-2">
                  <img
                    src={logo}
                    alt={t("common.logo")}
                    className="w-8 h-8 max-h-[32px] max-w-[32px] object-contain"
                  />
                  <span className="text-theme-text-primary font-bold text-base">
                    OpenSIN
                  </span>
                </div>
                <div className="flex gap-x-2 items-center text-slate-500 shrink-0">
                  <a
                    href={paths.home()}
                    className="transition-all duration-300 p-2 rounded-full text-theme-text-primary bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover hover:border-slate-100 hover:border-opacity-50 border-transparent border"
                  >
                    <House className="h-4 w-4" />
                  </a>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => setShowSidebar(false)}
                    aria-label={t("common.close")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="h-full flex flex-col w-full justify-between pt-4 overflow-y-scroll no-scroll">
                <div className="h-auto md:sidebar-items">
                  <div className="flex flex-col gap-y-4 pb-[60px] overflow-y-scroll no-scroll">
                    <BackToChatButton
                      t={t}
                      onClick={() => setShowSidebar(false)}
                    />
                    <SidebarOptions user={user} t={t} />
                    <div className="h-[1.5px] bg-[#3D4147] mx-3 mt-[14px]" />
                    <SupportEmail />
                    <Link
                      hidden={
                        user?.hasOwnProperty("role") && user.role !== "admin"
                      }
                      to={paths.settings.privacy()}
                      className="text-theme-text-secondary hover:text-theme-text-primary light:hover:text-theme-text-primary text-xs leading-[18px] mx-3"
                    >
                      {t("settings.privacy")}
                    </Link>
                    <AppVersion />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-2 left-0 right-0 pt-2 bg-theme-bg-sidebar bg-opacity-80 backdrop-filter backdrop-blur-md">
                <Footer />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <Link
          to={paths.home()}
          className="flex shrink-0 max-w-[55%] items-center justify-start mx-[20.5px] my-[18px] gap-x-2"
        >
          <img
            src={logo}
            alt={t("common.logo")}
            className="h-6 w-6 max-h-[24px] max-w-[24px] object-contain"
          />
          <span className="text-theme-text-primary font-bold text-sm">
            OpenSIN
          </span>
        </Link>
        <div
          ref={sidebarRef}
          className="transition-all duration-500 relative m-[16px] rounded-[16px] bg-theme-bg-sidebar border-[2px] border-theme-sidebar-border light:border-none min-w-[250px] p-[10px] h-[calc(100%-76px)]"
        >
          <div className="w-full h-full flex flex-col overflow-x-hidden items-stretch min-w-[235px]">
            <div className="text-theme-text-secondary text-sm font-medium uppercase mt-[4px] mb-0 ml-2">
              {t("settings.title")}
            </div>
            <div className="relative h-[calc(100%-60px)] flex flex-col w-full justify-between pt-[10px] overflow-y-scroll no-scroll">
              <div className="h-auto sidebar-items">
                <div className="flex flex-col gap-y-2 pb-[60px] overflow-y-scroll no-scroll">
                  <BackToChatButton t={t} />
                  <SidebarOptions user={user} t={t} />
                  <div className="h-[1.5px] bg-[#3D4147] mx-3 mt-[14px]" />
                  <SupportEmail />
                  <Link
                    hidden={
                      user?.hasOwnProperty("role") && user.role !== "admin"
                    }
                    to={paths.settings.privacy()}
                    className="text-theme-text-secondary hover:text-theme-text-primary light:hover:text-theme-text-primary hover:light:text-theme-text-primary text-xs leading-[18px] mx-3"
                  >
                    {t("settings.privacy")}
                  </Link>
                  <AppVersion />
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 pt-4 pb-3 rounded-b-[16px] bg-theme-bg-sidebar bg-opacity-80 backdrop-filter backdrop-blur-md z-10">
              <Footer />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SupportEmail() {
  const { email } = useSupportEmail();
  const { t } = useTranslation();
  const supportLink = email ? `mailto:${email}` : paths.mailToSupport();

  return (
    <Link
      to={supportLink}
      className="text-theme-text-secondary hover:text-theme-text-primary light:hover:text-theme-text-primary hover:light:text-theme-text-primary text-xs leading-[18px] mx-3 mt-1"
    >
      {t("settings.contact")}
    </Link>
  );
}

const SidebarOptions = ({ user = null, t }: any) => (
  <CanViewChatHistoryProvider>
    {({ viewable: canViewChatHistory }: any) => (
      <>
        <Option
          btnText={t("settings.ai-providers")}
          icon={<Gear className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.llm"),
              href: paths.settings.llmPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settingsSidebar.systemHealth"),
              href: paths.settings.systemHealth(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.vector-database"),
              href: paths.settings.vectorDatabase(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.embedder"),
              href: paths.settings.embedder.modelPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.text-splitting"),
              href: paths.settings.embedder.chunkingPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.voice-speech"),
              href: paths.settings.audioPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.transcription"),
              href: paths.settings.transcriptionPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.model-router"),
              href: paths.settings.modelRouters(),
              flex: true,
              roles: ["admin"],
            },
          ]}
        />
        <Option
          btnText={t("settings.admin")}
          icon={<UserCircleGear className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.users"),
              href: paths.settings.users(),
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settings.workspaces"),
              href: paths.settings.workspaces(),
              roles: ["admin", "manager"],
            },
            {
              hidden: !canViewChatHistory,
              btnText: t("settings.workspace-chats"),
              href: paths.settings.chats(),
              flex: true,
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settings.invites"),
              href: paths.settings.invites(),
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settingsSidebar.defaultSystemPrompt"),
              href: paths.settings.defaultSystemPrompt(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settingsSidebar.politicianSync"),
              href: paths.settings.politicianSync(),
              flex: true,
              roles: ["admin"],
            },
          ]}
        />
        <Option
          btnText={t("settings.agent-skills")}
          icon={
            <img
              src={AgentIcon}
              alt={t("common.agent")}
              className="h-5 w-5 flex-shrink-0 light:invert"
            />
          }
          href={paths.settings.agentSkills()}
          user={user}
          flex={true}
          roles={["admin"]}
        />
        <Option
          btnText={t("settings.customization")}
          icon={<PencilSimpleLine className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.interface"),
              href: paths.settings.interface(),
              flex: true,
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settings.branding"),
              href: paths.settings.branding(),
              flex: true,
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settings.chat"),
              href: paths.settings.chat(),
              flex: true,
              roles: ["admin", "manager"],
            },
          ]}
        />
        <Option
          btnText={t("settings.channels")}
          icon={<Plugs className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.available-channels.telegram"),
              href: paths.settings.telegram(),
              flex: true,
              hidden: !!user,
            },
          ]}
        />
        <Option
          btnText={t("settings.tools")}
          icon={<Toolbox className="h-5 w-5 flex-shrink-0" />}
          user={user}
          childOptions={[
            {
              hidden: !canViewChatHistory,
              btnText: t("settings.embeds"),
              href: paths.settings.embedChatWidgets(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.event-logs"),
              href: paths.settings.logs(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.scheduled-jobs"),
              href: paths.settings.scheduledJobs(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.api-keys"),
              href: paths.settings.apiKeys(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.terminal"),
              href: paths.settings.terminal(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.system-prompt-variables"),
              href: paths.settings.systemPromptVariables(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: "Transformations",
              href: paths.settings.transformations(),
              flex: true,
              roles: ["admin"],
            },
          ]}
        />
        <Option
          btnText={t("settings.security")}
          icon={<Nut className="h-5 w-5 flex-shrink-0" />}
          href={paths.settings.security()}
          user={user}
          flex={true}
          roles={["admin", "manager"]}
          hidden={user?.role}
        />
        <HoldToReveal key="exp_features">
          <Option
            btnText={t("settings.experimental-features")}
            icon={<Flask className="h-5 w-5 flex-shrink-0" />}
            href={paths.settings.experimental()}
            user={user}
            flex={true}
            roles={["admin"]}
          />
        </HoldToReveal>
      </>
    )}
  </CanViewChatHistoryProvider>
);

function HoldToReveal({ children, holdForMs = 3_000 }: any) {
  const { t } = useTranslation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showing, setShowing] = useState(() =>
    safeGetItem("opensin_experimental_feature_preview_unlocked"),
  );

  useEffect(() => {
    const onPress: any = (e) => {
      if (!["Control", "Meta"].includes(e.key) || timeoutRef.current !== null)
        return;
      timeoutRef.current = setTimeout(() => {
        setShowing("enabled");
        showToast(t("settingsSidebar.experimentalFeaturesUnlocked"));
        safeSetItem("opensin_experimental_feature_preview_unlocked", "enabled");
        window.removeEventListener("keydown", onPress);
        window.removeEventListener("keyup", onRelease);
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }, holdForMs);
    };
    const onRelease: any = (e) => {
      if (!["Control", "Meta"].includes(e.key)) return;
      if (showing) {
        window.removeEventListener("keydown", onPress);
        window.removeEventListener("keyup", onRelease);
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (!showing) {
      window.addEventListener("keydown", onPress);
      window.addEventListener("keyup", onRelease);
    }
    return () => {
      window.removeEventListener("keydown", onPress);
      window.removeEventListener("keyup", onRelease);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [showing, t]);

  if (!showing) return null;
  return children;
}

function AppVersion() {
  const { version, isLoading } = useAppVersion();
  if (isLoading || !version) return null;
  return (
    <>
      <Link
        to={`https://github.com/OpenSIN-AI/OpenSIN-Chat/releases/tag/v${version}`}
        target="_blank"
        rel="noreferrer"
        className="text-theme-text-secondary light:opacity-80 opacity-50 text-xs mx-3"
      >
        v{version}
      </Link>
      {}
    </>
  );
}

export default memo(SettingsSidebar);
