// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { PlusCircle } from "@phosphor-icons/react/dist/csr/PlusCircle";
import ApiKeyRow from "./ApiKeyRow";
import NewApiKeyModal from "./NewApiKeyModal";
import paths from "@/utils/paths";
import ModalWrapper from "@/components/ModalWrapper";
import { useModal } from "@/hooks/useModal";
import CTAButton from "@/components/lib/CTAButton";
import { useTranslation } from "react-i18next";
import useApiKeys from "@/hooks/useApiKeys";

export default function AdminApiKeys(): JSX.Element {
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();
  const { apiKeys, isLoading, refresh } = useApiKeys();

  const removeApiKey = (_id: any) => {
    refresh();
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("api.title")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              {t("api.description")}
            </p>
            <a
              href={paths.apiDocs()}
              target="_blank"
              rel="noreferrer"
              className="text-xs leading-[18px] font-base text-blue-300 light:text-blue-500 hover:underline mt-1"
            >
              {t("api.link")}{" "}
              {
                // eslint-disable-next-line i18next/no-literal-string
              }
              &rarr;
            </a>
          </div>
          <div className="w-full justify-end flex">
            <CTAButton
              onClick={openModal}
              className="mt-3 mr-0 mb-4 md:-mb-14 z-10"
            >
              <PlusCircle className="h-4 w-4" weight="bold" />{" "}
              {t("api.generate")}
            </CTAButton>
          </div>
          <div className="overflow-x-auto mt-6">
            {isLoading ? (
              <Skeleton
                height="80vh"
                width="100%"
                highlightColor="var(--theme-bg-primary)"
                baseColor="var(--theme-bg-secondary)"
                count={1}
                className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
                containerClassName="flex w-full"
              />
            ) : (
              <table className="w-full text-xs text-left rounded-lg min-w-[720px] border-spacing-0 md:mt-6 mt-0">
                <thead className="text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-tl-lg">
                      {t("api.table.name")}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {t("api.table.key")}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {t("api.table.by")}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {t("api.table.created")}
                    </th>
                    <th scope="col" className="px-6 py-3 rounded-tr-lg">
                      {t("api.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.length === 0 ? (
                    <tr className="bg-transparent text-theme-text-secondary text-sm font-medium">
                      <td colSpan={5} className="px-6 py-4 text-center">
                        {t("api.empty")}
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((apiKey: any) => (
                      <ApiKeyRow
                        key={apiKey.id}
                        apiKey={apiKey}
                        removeApiKey={removeApiKey}
                      />
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <ModalWrapper isOpen={isOpen} closeModal={closeModal}>
          <NewApiKeyModal closeModal={closeModal} onSuccess={refresh} />
        </ModalWrapper>
      </div>
    </div>
  );
}
