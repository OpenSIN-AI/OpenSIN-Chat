// SPDX-License-Identifier: MIT
import { useState, useEffect } from "react";

/**
 * Determines whether the mobile layout should be used.
 *
 * Layout decisions must be based on the available viewport width, not on
 * user-agent sniffing. A desktop browser resized to a narrow width, or a
 * mobile device emulator with a desktop user-agent, should still get the
 * mobile layout. Conversely, a tablet in landscape with plenty of width
 * should use the desktop layout even if `isMobile` is true.
 *
 * @returns {boolean} `true` when the viewport width is below 768px.
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

  return isMobileViewport;
}
