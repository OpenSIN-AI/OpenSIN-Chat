// SPDX-License-Identifier: MIT
import { useState } from "react";

export function useModal() {
  const [isOpen, setIsOpen] = useState(false as any);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return { isOpen, openModal, closeModal };
}
