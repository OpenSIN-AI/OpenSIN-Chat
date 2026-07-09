// SPDX-License-Identifier: MIT
// Purpose: Workspace-scoped chat container with a stable `loaded` state that
// keeps the previous chat mounted while the next chat's history is being
// fetched. See index.doc.md for the `useEffect` return-value bug history.
// Docs: index.doc.md
import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import LoadingChat from "./LoadingChat";
import ChatContainer from "./ChatContainer";
import paths from "@/utils/paths";
import ModalWrapper from "../ModalWrapper";
import { useParams } from "react-router-dom";
import { DnDFileUploaderProvider } from "./ChatContainer/DnDWrapper";
import { AgentRunsProvider } from "./ChatContainer/AgentSessionsSidebar/AgentRunsContext";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import {
  TTSProvider,
  useWatchForAutoPlayAssistantTTSResponse,
} from "../contexts/TTSProvider";
import { PENDING_HOME_MESSAGE } from "@/utils/constants";
import { copyText } from "@/utils/clipboard";
import useChatHistory from "@/hooks/useChatHistory";
import ErrorBoundaryFallback from "@/components/ErrorBoundaryFallback";

export default function WorkspaceChat({
  loading,
  workspace,
  threadSlug: threadSlugProp = null,
}: any) {
  useWatchForAutoPlayAssistantTTSResponse();
  const { t } = useTranslation();
  const { threadSlug: threadSlugParam = null } = useParams();
  const threadSlug = threadSlugProp ?? threadSlugParam;
  const { history, isLoading: historyLoading } = useChatHistory(
    workspace?.slug,
    threadSlug,
  );

  // Stores { key, workspace, history } currently rendered. Lags the props so
  // the previous chat stays mounted until the next one's history is ready,
  // avoiding a skeleton/loader flash on workspace/thread switches.
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    if (loading || historyLoading) return;
    if (!workspace?.slug) {
      setLoaded({ key: "none", workspace: null, history: [] });
      return;
    }

    setLoaded({
      key: `${workspace.slug}:${threadSlug ?? "default"}`,
      workspace,
      threadSlug,
      history,
    });
  }, [workspace, loading, threadSlug, history, historyLoading]);

  useEffect(() => {
    const cleanupSnippets = setEventDelegatorForCodeSnippets();
    const cleanupImages = setEventDelegatorForMarkdownImages();
    return () => {
      cleanupSnippets?.();
      cleanupImages?.();
    };
  }, []);

  let hasPendingMessage = false;
  try {
    hasPendingMessage = !!sessionStorage.getItem(PENDING_HOME_MESSAGE);
  } catch (e) {
    console.warn("[index] non-fatal error:", e?.message || e);
  }
  if (loaded === null) {
    if (hasPendingMessage) {
      return (
        <div className="transition-all duration-500 relative md:ml-[16px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full" />
      );
    }
    return <LoadingChat />;
  }
  if (!loading && !workspace) {
    return (
      <>
        {loading === false && !workspace && (
          <ModalWrapper isOpen={true}>
            <div className="w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
              <div className="relative p-6 border-b rounded-t border-theme-modal-border">
                <div className="w-full flex gap-x-2 items-center">
                  <WarningCircle
                    className="text-red-500 w-6 h-6"
                    weight="fill"
                  />
                  <h3 className="text-xl font-semibold text-red-500 overflow-hidden overflow-ellipsis whitespace-nowrap">
                    {t("workspaceChat.notFoundTitle")}
                  </h3>
                </div>
              </div>
              <div className="py-7 px-9 space-y-2 flex-col">
                <p className="text-theme-text-primary text-sm">
                  {t("workspaceChat.notFoundDescription")}
                </p>
              </div>
              <div className="flex w-full justify-end items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
                <a
                  href={paths.home()}
                  className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
                >
                  {t("workspaceChat.returnToHomepage")}
                </a>
              </div>
            </div>
          </ModalWrapper>
        )}
        <LoadingChat />
      </>
    );
  }

  return (
    <TTSProvider>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <DnDFileUploaderProvider
          workspace={loaded.workspace}
          threadSlug={loaded.threadSlug}
        >
          <AgentRunsProvider
            workspaceSlug={loaded.workspace?.slug || ""}
            authToken={
              typeof window !== "undefined"
                ? localStorage.getItem("opensin_chat_auth_token") || ""
                : ""
            }
            apiBase="/api"
          >
            <ChatContainer
              key={loaded.key}
              workspace={loaded.workspace}
              threadSlug={loaded.threadSlug}
              knownHistory={loaded.history}
            />
          </AgentRunsProvider>
        </DnDFileUploaderProvider>
      </ErrorBoundary>
    </TTSProvider>
  );
}

// Enables us to safely markdown and sanitize all responses without risk of injection
// but still be able to attach a handler to copy code snippets on all elements
// that are code snippets.
function copyCodeSnippet(uuid: any) {
  const target = document.querySelector(`[data-code="${uuid}"]`);
  if (!target) return false;
  const markdown =
    target.parentElement?.parentElement?.querySelector(
      "pre:first-of-type",
    )?.textContent;
  if (!markdown) return false;

  copyText(markdown).then((ok) => {
    if (!ok) return;
    const savedChildren = Array.from(target.childNodes);
    target.classList.add("text-green-500");
    target.textContent = i18n.t("workspaceChat.copied");
    target.setAttribute("disabled", "true");

    setTimeout(() => {
      target.classList.remove("text-green-500");
      target.innerHTML = "";
      savedChildren.forEach((node) => target.appendChild(node.cloneNode(true)));
      target.removeAttribute("disabled");
    }, 2500);
  });
}

// Listens and hunts for all data-code-snippet clicks.
export function setEventDelegatorForCodeSnippets() {
  const handler = function (e: Event) {
    const target = (e.target as HTMLElement).closest("[data-code-snippet]");
    const uuidCode = (target as HTMLElement | null)?.dataset?.code;
    if (!uuidCode) return false;
    copyCodeSnippet(uuidCode);
  };
  document?.addEventListener("click", handler);
  return () => document?.removeEventListener("click", handler);
}

// Hides markdown image containers when the img fails to load.
// Replaces the former inline onerror handler that violated CSP.
export function setEventDelegatorForMarkdownImages() {
  const handler = function (e: Event) {
    const img = e.target as HTMLElement;
    if (img?.tagName !== "IMG") return;
    const container = img.closest("[data-markdown-image]");
    if (container) (container as HTMLElement).style.display = "none";
  };
  // 'error' events do not bubble — use capture phase to catch them.
  document?.addEventListener("error", handler, true);
  return () => document?.removeEventListener("error", handler, true);
}
