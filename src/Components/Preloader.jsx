import React, { useCallback, useEffect, useRef, useState } from "react";

// The original Steam Big Picture video was converted to this MP4 intentionally.
const STARTUP_VIDEO = "/preloader.mp4";
const FADE_MS = 700;
const FALLBACK_MS = 12000;

const Preloader = ({ onComplete }) => {
  const [fading, setFading] = useState(false);
  const completedRef = useRef(false);
  const fadeTimerRef = useRef(null);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setFading(true);
    fadeTimerRef.current = setTimeout(() => onComplete?.(), FADE_MS);
  }, [onComplete]);

  useEffect(() => {
    const fallback = setTimeout(handleComplete, FALLBACK_MS);
    return () => {
      clearTimeout(fallback);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [handleComplete]);

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#070a12",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        pointerEvents: fading ? "none" : "auto",
        overflow: "hidden",
      }}
    >
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleComplete}
        onError={handleComplete}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        src={STARTUP_VIDEO}
      >
        Your browser does not support the startup video.
      </video>
    </div>
  );
};

export default Preloader;
