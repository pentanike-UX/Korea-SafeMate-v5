"use client";

import { useLayoutEffect, useState } from "react";

/** Tailwind `md` 768px */
export function useMdUp(): boolean {
  const [v, setV] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setV(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return v;
}
