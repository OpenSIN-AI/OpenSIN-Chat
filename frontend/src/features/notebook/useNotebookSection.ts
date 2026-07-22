// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useState } from "react";
import { isNotebookSectionId, type NotebookSectionId } from "./sections";

export const NOTEBOOK_SECTION_EVENT = "opensin:notebook-section-change";

export default function useNotebookSection() {
  const [section, setSectionState] = useState<NotebookSectionId>("chat");

  useEffect(() => {
    function handleSectionChange(event: Event) {
      const detail = (event as CustomEvent<{ section?: unknown }>).detail;
      if (isNotebookSectionId(detail?.section)) {
        setSectionState(detail.section);
      }
    }
    window.addEventListener(NOTEBOOK_SECTION_EVENT, handleSectionChange);
    return () => window.removeEventListener(NOTEBOOK_SECTION_EVENT, handleSectionChange);
  }, []);

  const setSection = useCallback((nextSection: NotebookSectionId) => {
    setSectionState(nextSection);
    window.dispatchEvent(new CustomEvent(NOTEBOOK_SECTION_EVENT, { detail: { section: nextSection } }));
  }, []);

  return { section, setSection };
}
