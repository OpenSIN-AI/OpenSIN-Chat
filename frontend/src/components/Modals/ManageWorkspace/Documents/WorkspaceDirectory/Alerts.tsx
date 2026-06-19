// SPDX-License-Identifier: MIT
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PushPin, Eye } from "@phosphor-icons/react";
import { SEEN_DOC_PIN_ALERT, SEEN_WATCH_ALERT } from "@/utils/constants";
import paths from "@/utils/paths";
import { Link } from "react-router-dom";
import ModalWrapper from "@/components/ModalWrapper";
import DOMPurify from "@/utils/chat/purify";
import { safeGetItem, safeSetItem } from "@/utils/safeStorage";

export const PinAlert = memo(() => {
  const { t } = useTranslation();
  const [showAlert, setShowAlert] = useState(false);
  function dismissAlert() {
    setShowAlert(false);
    safeSetItem(SEEN_DOC_PIN_ALERT, "1");
    window.removeEventListener("pinned_document", handlePinEvent);
  }

  function handlePinEvent() {
    if (!!safeGetItem(SEEN_DOC_PIN_ALERT)) return;
    setShowAlert(true);
  }

  useEffect(() => {
    if (!window || !!safeGetItem(SEEN_DOC_PIN_ALERT)) return;
    window?.addEventListener("pinned_document", handlePinEvent);
    return () => window.removeEventListener("pinned_document", handlePinEvent);
  }, []);

  return (
    <ModalWrapper isOpen={showAlert} noPortal={true}>
      <div className="w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="flex items-center gap-2">
            <PushPin
              className="text-theme-text-primary text-lg w-6 h-6"
              weight="regular"
            />
            <h3 className="text-xl font-semibold text-white">
              {t("connectors.pinning.what_pinning")}
            </h3>
          </div>
        </div>
        <div className="py-7 px-9 space-y-2 flex-col">
          <div className="w-full text-white text-md flex flex-col gap-y-2">
            <p>
              <span
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    t("connectors.pinning.pin_explained_block1"),
                  ),
                }}
              />
            </p>
            <p>
              <span
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    t("connectors.pinning.pin_explained_block2"),
                  ),
                }}
              />
            </p>
            <p>{t("connectors.pinning.pin_explained_block3")}</p>
          </div>
        </div>
        <div className="flex w-full justify-end items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
          <button
            type="button"
            onClick={dismissAlert}
            className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
          >
            {t("connectors.pinning.accept")}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
});

export const DocumentWatchAlert = memo(() => {
  const { t } = useTranslation();
  const [showAlert, setShowAlert] = useState(false);
  function dismissAlert() {
    setShowAlert(false);
    safeSetItem(SEEN_WATCH_ALERT, "1");
    window.removeEventListener("watch_document_for_changes", handlePinEvent);
  }

  function handlePinEvent() {
    if (!!safeGetItem(SEEN_WATCH_ALERT)) return;
    setShowAlert(true);
  }

  useEffect(() => {
    if (!window || !!safeGetItem(SEEN_WATCH_ALERT)) return;
    window?.addEventListener("watch_document_for_changes", handlePinEvent);
    return () =>
      window.removeEventListener("watch_document_for_changes", handlePinEvent);
  }, []);

  return (
    <ModalWrapper isOpen={showAlert} noPortal={true}>
      <div className="w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border">
          <div className="flex items-center gap-2">
            <Eye
              className="text-theme-text-primary text-lg w-6 h-6"
              weight="regular"
            />
            <h3 className="text-xl font-semibold text-white">
              {t("connectors.watching.what_watching")}
            </h3>
          </div>
        </div>
        <div className="py-7 px-9 space-y-2 flex-col">
          <div className="w-full text-white text-md flex flex-col gap-y-2">
            <p>
              <span
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    t("connectors.watching.watch_explained_block1"),
                  ),
                }}
              />
            </p>
            <p>{t("connectors.watching.watch_explained_block2")}</p>
            <p>
              {t("connectors.watching.watch_explained_block3_start")}
              <Link
                to={paths.experimental.liveDocumentSync.manage()}
                className="text-blue-600 underline"
              >
                {t("connectors.watching.watch_explained_block3_link")}
              </Link>
              {t("connectors.watching.watch_explained_block3_end")}
            </p>
          </div>
        </div>
        <div className="flex w-full justify-end items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
          <button
            type="button"
            onClick={dismissAlert}
            className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
          >
            {t("connectors.watching.accept")}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
});
