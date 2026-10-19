import React, { useCallback, useEffect, useRef, useState } from "react";

// Keep this filename aligned with the existing Steam Big Picture intro in public/.
const STARTUP_VIDEO = "/bigpicture_startup.webm";
const FADE_MS = 700;
const FALLBACK_MS = 12000;

const Preloader = ({ onComplete }) => {
  const [fading, setFading] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const completedRef = useRef(false);
  const fadeTimerRef = useRef(null);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setFading(true);
    fadeTimerRef.current = setTimeout(() => {
      onComplete?.();
    }, FADE_MS);
  }, [onComplete]);

  useEffect(() => {
    const fallback = setTimeout(() => {
      // Never strand the user on the intro if a codec or video event fails.
      handleComplete();
    }, FALLBACK_MS);

    return () => {
      clearTimeout(fallback);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [handleComplete]);

  const handleVideoError = () => {
    setVideoFailed(true);
    // Avoid an instant flash to a blank renderer on a missing/unplayable asset.
    // Allow a brief graceful transition; the app itself remains mounted behind it.
    setTimeout(handleComplete, 900);
  };

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
      {!videoFailed ? (
        <video
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleComplete}
          onError={handleVideoError}
          onAbort={handleVideoError}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          src={STARTUP_VIDEO}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#070a12" }} />
      )}
    </div>
  );
};

export default Preloader;
