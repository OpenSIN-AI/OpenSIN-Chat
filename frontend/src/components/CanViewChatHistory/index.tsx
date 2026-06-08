// SPDX-License-Identifier: MIT
import { FullScreenLoader } from "@/components/Preloader";
import useCanViewChatHistory from "@/hooks/useCanViewChatHistory";
import paths from "@/utils/paths";

export function CanViewChatHistory({ children }: any) {
  const { loading, viewable } = useCanViewChatHistory();
  if (loading) return <FullScreenLoader />;
  if (!viewable) {
    window.location.href = paths.home();
    return <FullScreenLoader />;
  }

  return <>{children}</>;
}

export function CanViewChatHistoryProvider({ children }: any) {
  const { loading, viewable } = useCanViewChatHistory();
  if (loading) return null;
  return <>{children({ viewable })}</>;
}

export { useCanViewChatHistory } from "@/hooks/useCanViewChatHistory";
