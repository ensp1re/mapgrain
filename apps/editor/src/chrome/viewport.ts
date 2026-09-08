import { useEffect, useState } from "react";
import { BREAKPOINT, SHELL_LAYOUT, type ShellLayout } from "../constants/layout.ts";

export function shellLayoutForWidth(width: number): ShellLayout {
  if (width >= BREAKPOINT.DESKTOP) return SHELL_LAYOUT.SPLIT;
  if (width >= BREAKPOINT.TABLET) return SHELL_LAYOUT.SINGLE;
  return SHELL_LAYOUT.OVERLAY;
}

export function useViewportWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}
