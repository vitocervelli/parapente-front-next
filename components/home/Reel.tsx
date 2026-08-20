"use client";

import { useEffect, useRef } from "react";

export function Reel({ src, poster }: { src: string; poster?: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const tryPlay = () => {
      el.muted = true;
      void el.play().catch(() => {});
    };

    el.addEventListener("canplay", tryPlay);
    document.addEventListener("pointerdown", tryPlay);
    document.addEventListener("scroll", tryPlay, { passive: true });
    tryPlay();

    return () => {
      el.removeEventListener("canplay", tryPlay);
      document.removeEventListener("pointerdown", tryPlay);
      document.removeEventListener("scroll", tryPlay);
    };
  }, []);

  return (
    <div className="reel">
      <video
        ref={ref}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
      />
    </div>
  );
}
