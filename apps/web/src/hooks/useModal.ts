// SPDX-License-Identifier: MIT
import { useCallback, useMemo, useState } from "react";

export function useModal() {
  const [isOpen, setIsOpen] = useState(false as any);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  return useMemo(
    () => ({ isOpen, openModal, closeModal }),
    [isOpen, openModal, closeModal],
  );
}
