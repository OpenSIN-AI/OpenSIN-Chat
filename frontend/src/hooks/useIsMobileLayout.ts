// SPDX-License-Identifier: MIT
import { useState, useEffect } from "react";
import { isMobile as isMobileDevice } from "react-device-detect";

/**
 * Determines whether the mobile layout should be used.
 *
 * `react-device-detect`'s `isMobile` is a static, user-agent-based check that
 * returns `true` for tablets (iPad) as well as phones. This is too broad for
 * layout decisions: a 768px+ iPad has enough room for the desktop sidebar
 * and shouldn't hide workspace links behind a hamburger drawer.
 *
 * This hook combines the device check with a live viewport-width check:
 * if the viewport is >= 768px, the desktop layout is used regardless of
 * the device type. Below 768px, the device check wins (phones and small
 * tablets get the mobile layout).
 *
 * @returns {boolean} `true` when the mobile layout should be rendered.
 */
export function useIsMobileLayout(): boolean {
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : true,
  );

  useEffect(() => {
    function onResize() {
      setIsMobileViewport(window.innerWidth < 768);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobileDevice && isMobileViewport;
}
