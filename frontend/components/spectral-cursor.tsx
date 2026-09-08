"use client";

import { useEffect, useRef } from "react";

export function SpectralCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      cursor.classList.add("is-visible");
    };
    const hide = () => cursor.classList.remove("is-visible");
    const leave = (event: MouseEvent) => {
      if (!event.relatedTarget) hide();
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("blur", hide);
    document.addEventListener("mouseout", leave);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", hide);
      document.removeEventListener("mouseout", leave);
    };
  }, []);

  return (
    <div ref={cursorRef} className="spectral-cursor" aria-hidden="true">
      <span />
    </div>
  );
}
