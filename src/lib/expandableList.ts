export function getExpandableListState<T>(items: readonly T[], maxVisible: number, expanded: boolean) {
  const visibleLimit = Math.max(0, maxVisible);
  const visibleItems = expanded ? [...items] : items.slice(0, visibleLimit);

  return {
    visibleItems,
    hiddenCount: Math.max(0, items.length - visibleItems.length),
    isExpandable: items.length > visibleLimit,
  };
}
