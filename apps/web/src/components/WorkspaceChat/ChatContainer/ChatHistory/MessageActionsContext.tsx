// SPDX-License-Identifier: MIT
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const EDIT_EVENT = "toggle-message-edit";
const DELETE_EVENT = "delete-message";

export interface EditingMessage {
  chatId: string;
  role: string;
}

export interface MessageActionsContextValue {
  editingMessage: EditingMessage | null;
  isEditing: (chatId: string, role: string) => boolean;
  isDeleted: (chatId: string) => boolean;
  clearEditing: () => void;
}

const MessageActionsContext = createContext<MessageActionsContextValue | null>(
  null,
);

/**
 * Provider that centralizes edit/delete event listeners for all messages.
 * Instead of each message registering its own window listener (O(n) listeners),
 * this provider registers just 2 listeners total and dispatches to messages via context.
 */
export function MessageActionsProvider({ children }: any) {
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(
    null,
  );
  const [deletedMessages, setDeletedMessages] = useState(
    () => new Set<string>(),
  );

  useEffect(() => {
    function handleEditEvent(e: any) {
      const { chatId, role } = e.detail;
      if (!chatId || !role) return;

      setEditingMessage((prev) => {
        if (prev?.chatId === chatId && prev?.role === role) {
          return null;
        }
        return { chatId, role };
      });
    }

    function handleDeleteEvent(e: any) {
      const { chatId } = e.detail;
      if (!chatId) return;

      setDeletedMessages((prev) => {
        const next = new Set(prev);
        next.add(chatId);
        return next;
      });
    }

    window.addEventListener(EDIT_EVENT, handleEditEvent);
    window.addEventListener(DELETE_EVENT, handleDeleteEvent);

    return () => {
      window.removeEventListener(EDIT_EVENT, handleEditEvent);
      window.removeEventListener(DELETE_EVENT, handleDeleteEvent);
    };
  }, []);

  const isEditing = useCallback(
    (chatId: string, role: string) => {
      return editingMessage?.chatId === chatId && editingMessage?.role === role;
    },
    [editingMessage],
  );

  const isDeleted = useCallback(
    (chatId: string) => {
      return deletedMessages.has(chatId);
    },
    [deletedMessages],
  );

  const clearEditing = useCallback(() => {
    setEditingMessage(null);
  }, []);

  return (
    <MessageActionsContext.Provider
      value={{ editingMessage, isEditing, isDeleted, clearEditing }}
    >
      {children}
    </MessageActionsContext.Provider>
  );
}

export function useMessageActionsContext() {
  return useContext(MessageActionsContext);
}

export { EDIT_EVENT, DELETE_EVENT };
