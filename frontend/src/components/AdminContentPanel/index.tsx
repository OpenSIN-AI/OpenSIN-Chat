// SPDX-License-Identifier: MIT
// Issue #6: Shared wrapper that owns the --content-height CSS variable
// injection, replacing 28 identical inline style={{ "--content-height": ... }}
// occurrences across Admin and GeneralSettings pages.
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";

interface AdminContentPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Drop-in replacement for the repeated pattern:
 *
 *   <div
 *     style={{ "--content-height": isMobileLayout ? "100%" : "calc(100% - 32px)" }}
 *     className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px]
 *                md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full
 *                overflow-y-scroll p-4 md:p-0"
 *   >
 *
 * Usage:
 *   <AdminContentPanel>...</AdminContentPanel>
 *
 * Additional className props are merged so callers can still extend styles.
 */
export default function AdminContentPanel({
  children,
  className = "",
}: AdminContentPanelProps) {
  const isMobileLayout = useIsMobileLayout();
  return (
    <div
      style={
        {
          "--content-height": isMobileLayout ? "100%" : "calc(100% - 32px)",
        } as React.CSSProperties
      }
      className={`h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll p-4 md:p-0 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
