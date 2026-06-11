// SPDX-License-Identifier: MIT
export const toggleSelection = (item, selectedItems) => {
  const newSelectedItems = { ...selectedItems };
  if (newSelectedItems[item.id]) {
    delete newSelectedItems[item.id];
  } else {
    newSelectedItems[item.id] = true;
  }
  return newSelectedItems;
};

export const toggleSelectAll = (allItems, selectedItems) => {
  const allSelected = allItems.every((item) => selectedItems[item.id]);
  if (allSelected) {
    return {};
  }
  const newSelectedItems = {};
  allItems.forEach((item) => {
    newSelectedItems[item.id] = true;
  });
  return newSelectedItems;
};

export const buildItemsToRemove = (selectedItems, files) => {
  return Object.keys(selectedItems)
    .map((itemId) => {
      const folder = files.items.find((f) =>
        f.items.some((i) => i.id === itemId),
      );
      if (!folder) return null;
      const item = folder.items.find((i) => i.id === itemId);
      if (!item) return null;
      return `${folder.name}/${item.name}`;
    })
    .filter(Boolean);
};

export const getEmbeddedDocCount = (files) => {
  return (files?.items ?? []).reduce(
    (sum, folder) => sum + (folder.items?.length ?? 0),
    0,
  );
};

export const isAllItemsSelected = (selectedItems, files) => {
  const allItems = files.items.flatMap((folder) => folder.items);
  return (
    Object.keys(selectedItems).length === allItems.length && allItems.length > 0
  );
};
