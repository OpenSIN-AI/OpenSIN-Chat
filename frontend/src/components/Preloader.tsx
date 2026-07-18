// SPDX-License-Identifier: MIT
// Purpose: Shared loading indicators for inline and full-screen application states.
// Docs: Keep the full-screen state branded, calm, and accessible while the app boots.
import OpenSINIcon from "@/media/logo/opensin-icon.svg";

export default function PreLoader({ size = "16" }: any) {
  const dimension =
    size.startsWith("[") && size.endsWith("]")
      ? size.slice(1, -1)
      : `${size * 4}px`;
  return (
    <div
      style={{ width: dimension, height: dimension }}
      className="animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"
    ></div>
  );
}

export function FullScreenLoader() {
  return (
    <div
      id="preloader"
      className="fixed left-0 top-0 z-[999999] flex h-screen w-screen items-center justify-center overflow-hidden bg-theme-bg-primary"
      role="status"
      aria-label="OpenSIN wird geladen"
      aria-busy="true"
    >
      <div className="preloader-content">
        <div className="preloader-mark" aria-hidden="true">
          <div className="preloader-glow" />
          <div className="preloader-ring" />
          <div className="preloader-logo">
            <img src={OpenSINIcon} alt="" />
          </div>
        </div>
        <div className="preloader-caption" aria-hidden="true">
          <span>OpenSIN Intelligence</span>
          <span className="preloader-dots">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    </div>
  );
}
