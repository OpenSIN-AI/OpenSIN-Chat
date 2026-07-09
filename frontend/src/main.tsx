// SPDX-License-Identifier: MIT
// react-speech-recognition (split into the "vendor-speech" chunk) is a
// babel-compiled CJS library that references the global `regeneratorRuntime`
// at module-evaluation time. Vite 8/Rolldown no longer injects that polyfill
// automatically, so the production build crashed with
// "regeneratorRuntime is not defined" the moment the workspace chat chunk
// loaded — taking down the whole app with an "Unexpected Application Error!".
// Importing the runtime as the very first entry-chunk statement guarantees the
// global is defined before any lazy vendor chunk that depends on it evaluates.
import "regenerator-runtime/runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useParams,
} from "react-router-dom";
import App from "@/App";
import PrivateRoute, {
  AdminRoute,
  ManagerRoute,
} from "@/components/PrivateRoute";
import Login from "@/pages/Login";
import SimpleSSOPassthrough from "@/pages/Login/SSO/simple";
import OnboardingFlow from "@/pages/OnboardingFlow";
import "@/index.css";
import "@/i18n";
import { safeGetItem } from "@/utils/safeStorage";
import { installAuthInterceptor } from "@/utils/authInterceptor";

installAuthInterceptor();

const isDev = import.meta.env.DEV;
const REACTWRAP = isDev ? React.Fragment : React.StrictMode;

// DEV-ONLY: Start the MSW mock worker when the PDF mock flag is set.
// This intercepts /pdf-analysis/* requests so the PDF-Analyse page
// can be fully tested without a running backend.
if (
  isDev &&
  (safeGetItem("opensin_pdf_mock") === "true" ||
    safeGetItem("opensin_ws_mock") === "true")
) {
  const { startMockWorker } = await import("@/mocks/browser");
  await startMockWorker();
}

function WorkspaceSettingsRedirect() {
  const { slug } = useParams();
  return (
    <Navigate to={`/workspace/${slug}/settings/general-appearance`} replace />
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        lazy: async () => {
          const { default: Main } = await import("@/pages/Main");
          return { element: <PrivateRoute Component={Main} /> };
        },
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/sso/simple",
        element: <SimpleSSOPassthrough />,
      },
      // Developer documentation (public)
      {
        path: "/docs",
        lazy: async () => {
          const { default: Docs } = await import("@/pages/Docs");
          return { element: <Docs /> };
        },
      },
      {
        path: "/docs/:slug",
        lazy: async () => {
          const { default: Docs } = await import("@/pages/Docs");
          return { element: <Docs /> };
        },
      },
      {
        path: "/workspace/:slug/settings",
        element: <WorkspaceSettingsRedirect />,
      },
      {
        path: "/workspace/:slug/settings/:tab",
        lazy: async () => {
          const { default: WorkspaceSettings } =
            await import("@/pages/WorkspaceSettings");
          return { element: <ManagerRoute Component={WorkspaceSettings} /> };
        },
      },
      {
        path: "/workspace/:slug",
        lazy: async () => {
          const { default: WorkspaceChat } =
            await import("@/pages/WorkspaceChat");
          return { element: <PrivateRoute Component={WorkspaceChat} /> };
        },
      },
      {
        path: "/workspace/:slug/t/:threadSlug",
        lazy: async () => {
          const { default: WorkspaceChat } =
            await import("@/pages/WorkspaceChat");
          return { element: <PrivateRoute Component={WorkspaceChat} /> };
        },
      },
      {
        path: "/accept-invite/:code",
        lazy: async () => {
          const { default: InvitePage } = await import("@/pages/Invite");
          return { element: <InvitePage /> };
        },
      },
      // Admin routes
      {
        path: "/settings",
        element: <Navigate to="/settings/llm-preference" replace />,
      },
      {
        path: "/politicians",
        element: <Navigate to="/settings/politician-sync" replace />,
      },
      {
        path: "/settings/llm-preference",
        lazy: async () => {
          const { default: GeneralLLMPreference } =
            await import("@/pages/GeneralSettings/LLMPreference");
          return { element: <AdminRoute Component={GeneralLLMPreference} /> };
        },
      },
      {
        path: "/settings/system-health",
        lazy: async () => {
          const { default: SystemHealth } =
            await import("@/pages/GeneralSettings/SystemHealth");
          return { element: <AdminRoute Component={SystemHealth} /> };
        },
      },
      {
        path: "/settings/transcription-preference",
        lazy: async () => {
          const { default: GeneralTranscriptionPreference } =
            await import("@/pages/GeneralSettings/TranscriptionPreference");
          return {
            element: <AdminRoute Component={GeneralTranscriptionPreference} />,
          };
        },
      },
      {
        path: "/settings/audio-preference",
        lazy: async () => {
          const { default: GeneralAudioPreference } =
            await import("@/pages/GeneralSettings/AudioPreference");
          return {
            element: <AdminRoute Component={GeneralAudioPreference} />,
          };
        },
      },
      {
        path: "/settings/embedding-preference",
        lazy: async () => {
          const { default: GeneralEmbeddingPreference } =
            await import("@/pages/GeneralSettings/EmbeddingPreference");
          return {
            element: <AdminRoute Component={GeneralEmbeddingPreference} />,
          };
        },
      },
      {
        path: "/settings/text-splitter-preference",
        lazy: async () => {
          const { default: EmbeddingTextSplitterPreference } =
            await import("@/pages/GeneralSettings/EmbeddingTextSplitterPreference");
          return {
            element: <AdminRoute Component={EmbeddingTextSplitterPreference} />,
          };
        },
      },
      {
        path: "/settings/vector-database",
        lazy: async () => {
          const { default: GeneralVectorDatabase } =
            await import("@/pages/GeneralSettings/VectorDatabase");
          return {
            element: <AdminRoute Component={GeneralVectorDatabase} />,
          };
        },
      },
      {
        path: "/settings/agents",
        lazy: async () => {
          const { default: AdminAgents } = await import("@/pages/Admin/Agents");
          return { element: <AdminRoute Component={AdminAgents} /> };
        },
      },
      {
        path: "/settings/agents/builder",
        lazy: async () => {
          const { default: AgentBuilder } =
            await import("@/pages/Admin/AgentBuilder");
          return {
            element: <AdminRoute Component={AgentBuilder} />,
          };
        },
      },
      {
        path: "/settings/agents/builder/:flowId",
        lazy: async () => {
          const { default: AgentBuilder } =
            await import("@/pages/Admin/AgentBuilder");
          return {
            element: <AdminRoute Component={AgentBuilder} />,
          };
        },
      },
      {
        path: "/settings/event-logs",
        lazy: async () => {
          const { default: AdminLogs } = await import("@/pages/Admin/Logging");
          return { element: <AdminRoute Component={AdminLogs} /> };
        },
      },
      {
        path: "/settings/embed-chat-widgets",
        lazy: async () => {
          const { default: ChatEmbedWidgets } =
            await import("@/pages/GeneralSettings/ChatEmbedWidgets");
          return { element: <AdminRoute Component={ChatEmbedWidgets} /> };
        },
      },
      // Manager routes
      {
        path: "/settings/security",
        lazy: async () => {
          const { default: GeneralSecurity } =
            await import("@/pages/GeneralSettings/Security");
          return { element: <ManagerRoute Component={GeneralSecurity} /> };
        },
      },
      {
        path: "/settings/privacy",
        lazy: async () => {
          const { default: PrivacyAndData } =
            await import("@/pages/GeneralSettings/PrivacyAndData");
          return { element: <AdminRoute Component={PrivacyAndData} /> };
        },
      },
      {
        path: "/settings/interface",
        lazy: async () => {
          const { default: InterfaceSettings } =
            await import("@/pages/GeneralSettings/Settings/Interface");
          return { element: <ManagerRoute Component={InterfaceSettings} /> };
        },
      },
      {
        path: "/settings/branding",
        lazy: async () => {
          const { default: BrandingSettings } =
            await import("@/pages/GeneralSettings/Settings/Branding");
          return { element: <ManagerRoute Component={BrandingSettings} /> };
        },
      },
      {
        path: "/settings/default-system-prompt",
        lazy: async () => {
          const { default: DefaultSystemPrompt } =
            await import("@/pages/Admin/DefaultSystemPrompt");
          return { element: <AdminRoute Component={DefaultSystemPrompt} /> };
        },
      },
      {
        path: "/settings/chat",
        lazy: async () => {
          const { default: ChatSettings } =
            await import("@/pages/GeneralSettings/Settings/Chat");
          return { element: <ManagerRoute Component={ChatSettings} /> };
        },
      },
      {
        path: "/settings/beta-features",
        lazy: async () => {
          const { default: ExperimentalFeatures } =
            await import("@/pages/Admin/ExperimentalFeatures");
          return { element: <AdminRoute Component={ExperimentalFeatures} /> };
        },
      },
      {
        path: "/settings/api-keys",
        lazy: async () => {
          const { default: GeneralApiKeys } =
            await import("@/pages/GeneralSettings/ApiKeys");
          return { element: <AdminRoute Component={GeneralApiKeys} /> };
        },
      },
      {
        path: "/settings/model-routers",
        lazy: async () => {
          const { default: ModelRouters } =
            await import("@/pages/GeneralSettings/ModelRouters");
          return { element: <AdminRoute Component={ModelRouters} /> };
        },
      },
      {
        path: "/settings/model-routers/:id",
        lazy: async () => {
          const { default: RouterRulesPage } =
            await import("@/pages/GeneralSettings/ModelRouters/RouterRulesPage");
          return { element: <AdminRoute Component={RouterRulesPage} /> };
        },
      },
      {
        path: "/settings/system-prompt-variables",
        lazy: async () => {
          const { default: SystemPromptVariables } =
            await import("@/pages/Admin/SystemPromptVariables");
          return {
            element: <AdminRoute Component={SystemPromptVariables} />,
          };
        },
      },
      {
        path: "/settings/transformations",
        lazy: async () => {
          const { default: AdminTransformations } =
            await import("@/pages/Admin/Transformations");
          return {
            element: <AdminRoute Component={AdminTransformations} />,
          };
        },
      },
      {
        path: "/settings/politician-sync",
        lazy: async () => {
          const { default: PoliticianSync } =
            await import("@/pages/Admin/PoliticianSync");
          return {
            element: <AdminRoute Component={PoliticianSync} />,
          };
        },
      },
      {
        path: "/settings/terminal",
        lazy: async () => {
          const { default: AdminTerminal } =
            await import("@/pages/Admin/Terminal");
          return {
            element: <AdminRoute Component={AdminTerminal} />,
          };
        },
      },
      {
        path: "/settings/workspace-chats",
        lazy: async () => {
          const { default: GeneralChats } =
            await import("@/pages/GeneralSettings/Chats");
          return { element: <ManagerRoute Component={GeneralChats} /> };
        },
      },
      {
        path: "/settings/invites",
        lazy: async () => {
          const { default: AdminInvites } =
            await import("@/pages/Admin/Invitations");
          return { element: <ManagerRoute Component={AdminInvites} /> };
        },
      },
      {
        path: "/settings/users",
        lazy: async () => {
          const { default: AdminUsers } = await import("@/pages/Admin/Users");
          return { element: <ManagerRoute Component={AdminUsers} /> };
        },
      },
      {
        path: "/settings/workspaces",
        lazy: async () => {
          const { default: AdminWorkspaces } =
            await import("@/pages/Admin/Workspaces");
          return { element: <ManagerRoute Component={AdminWorkspaces} /> };
        },
      },
      // Onboarding Flow
      {
        path: "/onboarding",
        element: <OnboardingFlow />,
      },
      {
        path: "/onboarding/:step",
        element: <OnboardingFlow />,
      },
      // Experimental feature pages
      {
        path: "/settings/beta-features/live-document-sync/manage",
        lazy: async () => {
          const { default: LiveDocumentSyncManage } =
            await import("@/pages/Admin/ExperimentalFeatures/Features/LiveSync/manage");
          return {
            element: <AdminRoute Component={LiveDocumentSyncManage} />,
          };
        },
      },
      {
        path: "/settings/external-connections/telegram",
        lazy: async () => {
          const { default: TelegramBotSettings } =
            await import("@/pages/GeneralSettings/Connections/TelegramBot");
          return { element: <AdminRoute Component={TelegramBotSettings} /> };
        },
      },
      {
        path: "/settings/scheduled-jobs",
        lazy: async () => {
          const { default: ScheduledJobs } =
            await import("@/pages/GeneralSettings/ScheduledJobs");
          return { element: <AdminRoute Component={ScheduledJobs} /> };
        },
      },
      {
        path: "/settings/scheduled-jobs/:id/runs",
        lazy: async () => {
          const { default: ScheduledJobRuns } =
            await import("@/pages/GeneralSettings/ScheduledJobs/RunHistoryPage");
          return { element: <AdminRoute Component={ScheduledJobRuns} /> };
        },
      },
      {
        path: "/settings/scheduled-jobs/:id/runs/:runId",
        lazy: async () => {
          const { default: ScheduledJobRunDetail } =
            await import("@/pages/GeneralSettings/ScheduledJobs/RunDetailPage");
          return {
            element: <AdminRoute Component={ScheduledJobRunDetail} />,
          };
        },
      },
      {
        path: "/pdf-analysis",
        lazy: async () => {
          const { default: PdfAnalysisPage } =
            await import("@/pages/PdfAnalysis");
          return { element: <AdminRoute Component={PdfAnalysisPage} /> };
        },
      },
      // Embed widget preview (public, no auth required)
      {
        path: "/embed/:uuid",
        lazy: async () => {
          const { default: EmbedPreview } =
            await import("@/pages/EmbedPreview");
          return { element: <EmbedPreview /> };
        },
      },
      // Catch-all route for 404s
      {
        path: "*",
        lazy: async () => {
          const { default: NotFound } = await import("@/pages/404");
          return { element: <NotFound /> };
        },
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <REACTWRAP>
    <RouterProvider router={router} />
  </REACTWRAP>,
);
