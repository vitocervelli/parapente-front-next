"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Autoplays the hero clip over the still. Falls back to the still alone when the
 * source errors, and retries playback on the first user gesture for browsers that
 * refuse muted autoplay.
 */
export function HeroVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const tryPlay = () => {
      el.muted = true;
      void el.play().catch(() => {});
    };
    const onError = () => setOk(false);

    el.addEventListener("error", onError);
    el.addEventListener("canplay", tryPlay);
    document.addEventListener("pointerdown", tryPlay);
    document.addEventListener("scroll", tryPlay, { passive: true });
    tryPlay();

    return () => {
      el.removeEventListener("error", onError);
      el.removeEventListener("canplay", tryPlay);
      document.removeEventListener("pointerdown", tryPlay);
      document.removeEventListener("scroll", tryPlay);
    };
  }, []);

  if (!ok || !src) return null;

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/assets/imagery/hero-sky.jpg"
    />
  );
}
