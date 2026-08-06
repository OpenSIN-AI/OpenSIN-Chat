// SPDX-License-Identifier: MIT
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useParams,
} from "react-router";
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
const REACTWRAP = isDev ? React.StrictMode : React.Fragment;

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

function AppHydrateFallback() {
  return <div className="min-h-screen bg-theme-bg-primary" aria-busy="true" />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    HydrateFallback: AppHydrateFallback,
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
        path: "/settings/event-logs",
        lazy: async () => {
          const { default: AdminLogs } = await import("@/pages/Admin/Logging");
          return { element: <AdminRoute Component={AdminLogs} /> };
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <REACTWRAP>
    <RouterProvider router={router} />
  </REACTWRAP>,
);
