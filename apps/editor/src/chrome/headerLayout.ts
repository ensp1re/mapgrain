export const HEADER_LAYOUT = {
  PHONE: "phone",
  COMPACT: "compact",
  REGULAR: "regular",
  FULL: "full",
} as const;

export type HeaderLayout = (typeof HEADER_LAYOUT)[keyof typeof HEADER_LAYOUT];

export const HEADER_BREAKPOINT = {
  COMPACT: 560,
  REGULAR: 800,
  FULL: 1080,
} as const;

export function headerLayoutFor(width: number): HeaderLayout {
  if (width < HEADER_BREAKPOINT.COMPACT) return HEADER_LAYOUT.PHONE;
  if (width < HEADER_BREAKPOINT.REGULAR) return HEADER_LAYOUT.COMPACT;
  if (width < HEADER_BREAKPOINT.FULL) return HEADER_LAYOUT.REGULAR;
  return HEADER_LAYOUT.FULL;
}

export function stabilizeHeaderLayout(
  width: number,
  current: HeaderLayout,
  slack = 16,
): HeaderLayout {
  const low = headerLayoutFor(width - slack);
  const high = headerLayoutFor(width + slack);
  if (low === high) return low;
  return current;
}

export function headerShowsArrange(layout: HeaderLayout): boolean {
  return layout !== HEADER_LAYOUT.PHONE;
}

export function headerShowsPresent(layout: HeaderLayout): boolean {
  return layout === HEADER_LAYOUT.REGULAR || layout === HEADER_LAYOUT.FULL;
}

export function headerShowsHistory(layout: HeaderLayout): boolean {
  return layout === HEADER_LAYOUT.FULL;
}
