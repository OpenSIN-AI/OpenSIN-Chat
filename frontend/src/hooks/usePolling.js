// SPDX-License-Identifier: MIT
import { useEffect, useRef } from "react";

/**
 * Calls `callback` every `interval` milliseconds while the document is visible
 * and `enabled` is true.  Automatically pauses on tab hide and resumes on show.
 *
 * @param {() => void} callback - Function to call on each tick.
 * @param {number} interval - Polling interval in milliseconds.
 * @param {boolean} [enabled=true] - Set to false to disable polling.
 */
export default function usePolling(callback, interval, enabled = true) {
  const callbackRef = useRef(callback);
  const timerRef = useRef(null);

  // Keep the ref current so interval closures always call the latest callback.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const isVisible = () => document.visibilityState !== "hidden";

    const start = () => {
      if (timerRef.current !== null) return;
      timerRef.current = setInterval(() => {
        if (isVisible()) callbackRef.current();
      }, interval);
    };

    const stop = () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        // Call immediately on becoming visible, then restart the interval.
        callbackRef.current();
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [interval, enabled]);
}
