// SPDX-License-Identifier: MIT
import { useState, useEffect } from "react";
import {
  ATTACHMENTS_PROCESSED_EVENT,
  ATTACHMENTS_PROCESSING_EVENT,
} from "../DnDWrapper";

/**
 * Handle event listeners to prevent the send button from being used
 * for whatever reason that may we may want to prevent the user from sending a message.
 */
export default function useIsDisabled() {
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    if (!window) return;
    let timeout = null;
    const onProcessing = () => {
      setIsDisabled(true);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setIsDisabled(false), 30_000);
    };
    const onProcessed = () => {
      setIsDisabled(false);
      if (timeout) clearTimeout(timeout);
    };

    window.addEventListener(ATTACHMENTS_PROCESSING_EVENT, onProcessing);
    window.addEventListener(ATTACHMENTS_PROCESSED_EVENT, onProcessed);

    return () => {
      window.removeEventListener(ATTACHMENTS_PROCESSING_EVENT, onProcessing);
      window.removeEventListener(ATTACHMENTS_PROCESSED_EVENT, onProcessed);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return { isDisabled };
}
