import { useState } from "react";
import Workspace from "@/models/workspace";

export function useFileTree({ workspace, files, setLoading, setLoadingMessage, fetchKeys, saveChanges }) {
  const [selectedItems, setSelectedItems] = useState({});
  const embeddedDocCount = (files?.items ?? []).reduce(
    (sum, folder) => sum + (folder.items?.length ?? 0),
    0,
  );

  const toggleSelection = (item) => {
    setSelectedItems((prevSelectedItems) => {
      const newSelectedItems = { ...prevSelectedItems };
      if (newSelectedItems[item.id]) {
        delete newSelectedItems[item.id];
      } else {
        newSelectedItems[item.id] = true;
      }
      return newSelectedItems;
    });
  };

  const toggleSelectAll = () => {
    const allItems = files.items.flatMap((folder) => folder.items);
    const allSelected = allItems.every((item) => selectedItems[item.id]);
    if (allSelected) {
      setSelectedItems({});
    } else {
      const newSelectedItems = {};
      allItems.forEach((item) => {
        newSelectedItems[item.id] = true;
      });
      setSelectedItems(newSelectedItems);
    }
  };

  const removeSelectedItems = async () => {
    setLoading(true);
    setLoadingMessage("Removing selected files from workspace");

    const itemsToRemove = Object.keys(selectedItems).map((itemId) => {
      const folder = files.items.find((f) =>
        f.items.some((i) => i.id === itemId),
      );
      const item = folder.items.find((i) => i.id === itemId);
      return `${folder.name}/${item.name}`;
    });

    try {
      await Workspace.modifyEmbeddings(workspace.slug, {
        adds: [],
        deletes: itemsToRemove,
      });
      await fetchKeys(true);
      setSelectedItems({});
    } catch (error) {
      console.error("Failed to remove documents:", error);
    }

    setLoadingMessage("");
    setLoading(false);
  };

  const handleSaveChanges = (e) => {
    setSelectedItems({});
    saveChanges(e);
  };

  return {
    selectedItems,
    setSelectedItems,
    embeddedDocCount,
    toggleSelection,
    toggleSelectAll,
    removeSelectedItems,
    handleSaveChanges,
  };
}
