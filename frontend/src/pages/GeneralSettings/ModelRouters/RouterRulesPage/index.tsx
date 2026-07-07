// SPDX-License-Identifier: MIT
import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import RuleBuilder from "../RuleBuilder";
import useModelRouter from "@/hooks/useModelRouter";

export default function RouterRulesPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { router, isLoading, error, refresh } = useModelRouter(id);
  const redirected = useRef(false);

  // Side-effectful redirect must run in an effect, not during render.
  // The ref guard prevents duplicate toasts / navigate calls on re-render.
  useEffect(() => {
    if (redirected.current) return;
    if (error || (!isLoading && !router)) {
      redirected.current = true;
      showToast(error || "Router not found", "error");
      navigate(paths.settings.modelRouters(), { replace: true });
    }
  }, [error, isLoading, router, navigate]);

  if (isLoading || error || !router)
    return (
      <Layout t={t}>
        <div className="flex items-center justify-center py-20">
          <CircleNotch className="h-8 w-8 text-zinc-400 light:text-slate-400 animate-spin" />
        </div>
      </Layout>
    );

  return (
    <Layout t={t}>
      <RuleBuilder
        routerId={router.id}
        routerName={router.name}
        rules={router.rules || []}
        onRulesChanged={refresh}
      />
    </Layout>
  );
}

function Layout({
  t,
  children,
}: {
  t: (key: string) => string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex md:mt-0 mt-6">
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-2xl bg-zinc-900 light:bg-white light:border light:border-slate-300 w-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <button
            type="button"
            onClick={() => navigate(paths.settings.modelRouters())}
            className="border-none flex items-center gap-x-2 text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("model-router.edit-router.back-to-routers")}
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
