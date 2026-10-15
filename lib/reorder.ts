/**
 * Reordering helpers.
 *
 * The previous inline implementation removed the dragged item and then spliced
 * it back at the *original* index of the drop target:
 *
 *     const [moved] = next.splice(sourceIndex, 1);
 *     next.splice(targetIndex, 0, moved);
 *
 * When the item moves forward (`sourceIndex < targetIndex`) the removal shifts
 * every later element down by one, so `targetIndex` is stale and the item lands
 * one slot too far. Dragging A onto C in [A, B, C] produced [B, C, A] instead
 * of [B, A, C]. Backward moves happened to work, which is why the bug survived.
 *
 * `moveItem` corrects for that shift, giving consistent "insert at the drop
 * target's position" semantics in both directions.
 */

export const moveItem = <T,>(list: readonly T[], from: number, to: number): T[] => {
  const next = [...list];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  if (from === to) return next;

  const [moved] = next.splice(from, 1);
  // Removing the item shifts later indices down by one.
  const destination = from < to ? to - 1 : to;
  next.splice(destination, 0, moved);
  return next;
};

export const indexOfId = <T extends { id: string }>(list: readonly T[], id: string): number =>
  list.findIndex((item) => item.id === id);

/**
 * Move a link within one category, or from one category into another.
 * Returns the original list unchanged when the move is a no-op or the
 * referenced categories no longer exist.
 */
export const moveLink = <C extends { id: string; links: L[] }, L extends { id: string }>(
  categories: readonly C[],
  linkId: string,
  fromCategoryId: string,
  toCategoryId: string,
  targetLinkId?: string,
): C[] => {
  const fromIndex = indexOfId(categories, fromCategoryId);
  const toIndex = indexOfId(categories, toCategoryId);
  if (fromIndex === -1 || toIndex === -1) return [...categories];

  const sourceLinks = categories[fromIndex].links;
  const movedAt = indexOfId(sourceLinks, linkId);
  if (movedAt === -1) return [...categories];

  if (fromCategoryId === toCategoryId) {
    const targetAt = targetLinkId ? indexOfId(sourceLinks, targetLinkId) : -1;
    if (targetAt === -1) return [...categories];
    const links = moveItem(sourceLinks, movedAt, targetAt);
    const next = [...categories];
    next[fromIndex] = { ...next[fromIndex], links };
    return next;
  }

  const moved = sourceLinks[movedAt];
  const next = [...categories];

  const remaining = sourceLinks.filter((link) => link.id !== linkId);
  next[fromIndex] = { ...next[fromIndex], links: remaining };

  const destinationLinks = [...categories[toIndex].links];
  const targetAt = targetLinkId ? indexOfId(destinationLinks, targetLinkId) : -1;
  destinationLinks.splice(targetAt === -1 ? destinationLinks.length : targetAt, 0, moved);
  next[toIndex] = { ...next[toIndex], links: destinationLinks };

  return next;
};
