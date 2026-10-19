import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const FILES = {
  hover: "/Hover_Steam.mp3",
  select: "/Select_Stream.mp3",
  background: "/Steam_Background.mp3",
};

function readSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem("console-settings") || "{}");
    return { enabled: settings.soundsEnabled !== false, volume: Math.max(0, Math.min(1, Number(settings.soundVolume ?? 50) / 100)) };
  } catch {
    return { enabled: true, volume: 0.5 };
  }
}

export default function ConsoleSounds() {
  const location = useLocation();
  const audioRefs = useRef({});
  const availableRef = useRef({});
  const lastHoverRef = useRef(null);
  const [checkedFiles, setCheckedFiles] = useState(false);
  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all(Object.entries(FILES).map(async ([key, url]) => {
      try {
        const response = await fetch(url, { method: "HEAD", cache: "no-store" });
        return [key, response.ok];
      } catch {
        return [key, false];
      }
    })).then((results) => {
      if (!cancelled) { availableRef.current = Object.fromEntries(results); setCheckedFiles(true); }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const play = (key) => {
      const settings = readSettings();
      if (!settings.enabled || !availableRef.current[key]) return;
      try {
        let audio = audioRefs.current[key];
        if (!audio) {
          audio = new Audio(FILES[key]);
          audioRefs.current[key] = audio;
        }
        audio.volume = settings.volume;
        audio.loop = false;
        audio.currentTime = 0;
        const promise = audio.play();
        if (promise?.catch) promise.catch(() => {});
      } catch {}
    };

    const interactiveFrom = (target) => target instanceof Element ? target.closest("button, a, [role='button'], [data-focusable], select, input[type='range']") : null;
    const onPointerOver = (event) => {
      const element = interactiveFrom(event.target);
      if (!element || element === lastHoverRef.current) return;
      lastHoverRef.current = element;
      play("hover");
    };
    const onPointerOut = (event) => {
      const next = interactiveFrom(event.relatedTarget);
      if (!next) lastHoverRef.current = null;
    };
    const onFocus = (event) => {
      const element = interactiveFrom(event.target);
      if (!element || element === lastHoverRef.current) return;
      lastHoverRef.current = element;
      play("hover");
    };
    const onClick = (event) => {
      if (interactiveFrom(event.target)) play("select");
    };
    const onControllerHover = () => play("hover");
    const onControllerSelect = () => play("select");
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("console:sound-hover", onControllerHover);
    window.addEventListener("console:sound-select", onControllerSelect);
    return () => {
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("console:sound-hover", onControllerHover);
      window.removeEventListener("console:sound-select", onControllerSelect);
    };
  }, []);

  useEffect(() => {
    const audio = audioRefs.current.background;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    }
    const settings = readSettings();
    if (location.pathname !== "/home" || !settings.enabled || !availableRef.current.background) return undefined;
    let cancelled = false;
    const start = async () => {
      try {
        const background = new Audio(FILES.background);
        background.loop = true;
        background.volume = settings.volume;
        audioRefs.current.background = background;
        if (!cancelled) await background.play();
      } catch {}
    };
    start();
    return () => {
      cancelled = true;
      const background = audioRefs.current.background;
      if (background) {
        background.pause();
        background.currentTime = 0;
      }
    };
  }, [location.pathname, checkedFiles, settingsVersion]);

  useEffect(() => {
    const onSettingsChanged = () => {
      const settings = readSettings();
      setSettingsVersion((version) => version + 1);
      Object.entries(audioRefs.current).forEach(([key, audio]) => {
        audio.volume = settings.volume;
        if (!settings.enabled) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
    window.addEventListener("console-settings-changed", onSettingsChanged);
    return () => window.removeEventListener("console-settings-changed", onSettingsChanged);
  }, []);

  return null;
}
