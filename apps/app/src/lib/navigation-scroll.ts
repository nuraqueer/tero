export type NavigationScrollState = {
  offset: number;
  anchor: number;
  collapsed: boolean;
};

/** Direction thresholds keep small finger movements and edge bounce from flickering the bar. */
export function navigationScroll(
  previous: NavigationScrollState | null,
  offset: number,
  maxOffset: number,
): NavigationScrollState {
  const nextOffset = Math.max(0, Math.min(offset, Math.max(0, maxOffset)));
  if (!previous || nextOffset < 24)
    return { offset: nextOffset, anchor: nextOffset, collapsed: false };
  const delta = nextOffset - previous.anchor;
  const changed = Math.abs(delta) > 12;
  return {
    offset: nextOffset,
    anchor: changed ? nextOffset : previous.anchor,
    collapsed: changed ? delta > 0 : previous.collapsed,
  };
}
