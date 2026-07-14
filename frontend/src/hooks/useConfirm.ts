// SPDX-License-Identifier: MIT
// Purpose: Access the promise-based confirm() dialog (Issue #635).
import { useContext } from "react";
import { ConfirmContext } from "@/components/ui/ConfirmProvider";

export default function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return confirm;
}
