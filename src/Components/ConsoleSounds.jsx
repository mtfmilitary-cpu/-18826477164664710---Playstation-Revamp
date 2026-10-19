import { useEffect, useRef, useState } from "react";

const FILES = {
  hover: "/Hover_Steam.mp3",
  select: "/Select_Stream.mp3",
  background: "/Steam_Background.mp3",
  quickOpen: "/QuickMenu_Open.mp3",
  quickClose: "/QuickMenu_Close.mp3",
  back: "/Navigation_Back.mp3",
  typing: "/Keyboard_Typing.mp3",
  achievement: "/Achievement_Unlock.mp3",
  partyJoin: "/Party_Join.mp3",
  partyLeave: "/Party_Leave.mp3",
  callJoin: "/Call_Connected.mp3",
  callLeave: "/Call_Disconnected.mp3",
  notification: "/Console_Notification.mp3",
  error: "/Console_Error.mp3",
  gameLaunch: "/Game_Launch.mp3",
};

function readSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem("console-settings") || "{}");
    return {
      enabled: settings.soundsEnabled !== false,
      volume: Math.max(0, Math.min(1, Number(settings.soundVolume ?? 50) / 100)),
      backgroundEnabled: settings.backgroundMusicEnabled !== false,
    };
  } catch {
    return { enabled: true, volume: 0.5, backgroundEnabled: true };
  }
}

export default function ConsoleSounds() {
  const audioRefs = useRef({});
  const availableRef = useRef({});
  const lastHoverRef = useRef(null);
  const focusedRef = useRef(typeof document === "undefined" ? true : document.hasFocus());
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
      if (!cancelled) {
        availableRef.current = Object.fromEntries(results);
        setCheckedFiles(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const stopAll = () => {
      Object.entries(audioRefs.current).forEach(([key, audio]) => {
        audio.pause();
        if (key !== "background") audio.currentTime = 0;
      });
    };
    const onFocus = () => {
      focusedRef.current = true;
      setSettingsVersion((version) => version + 1);
    };
    const onBlur = () => {
      focusedRef.current = false;
      stopAll();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onBlur();
      else if (document.hasFocus()) onFocus();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      stopAll();
    };
  }, []);

  useEffect(() => {
    const play = (key) => {
      if (!focusedRef.current || document.visibilityState === "hidden") return;
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
    const interactiveFrom = (target) => target instanceof Element
      ? target.closest("button, a, [role='button'], [data-focusable], select, input[type='range']")
      : null;
    const onPointerOver = (event) => {
      const element = interactiveFrom(event.target);
      if (!element || element === lastHoverRef.current) return;
      lastHoverRef.current = element;
      play("hover");
    };
    const onPointerOut = (event) => {
      if (!interactiveFrom(event.relatedTarget)) lastHoverRef.current = null;
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
    const eventMap = {
      "console:sound-hover": "hover",
      "console:sound-select": "select",
      "console:sound-quick-open": "quickOpen",
      "console:sound-quick-close": "quickClose",
      "console:sound-back": "back",
      "console:sound-typing": "typing",
      "console:sound-achievement": "achievement",
      "console:sound-party-join": "partyJoin",
      "console:sound-party-leave": "partyLeave",
      "console:sound-call-join": "callJoin",
      "console:sound-call-leave": "callLeave",
      "console:sound-notification": "notification",
      "console:sound-error": "error",
      "console:sound-game-launch": "gameLaunch",
    };
    const listeners = Object.entries(eventMap).map(([eventName, key]) => {
      const listener = () => play(key);
      window.addEventListener(eventName, listener);
      return [eventName, listener];
    });
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("click", onClick, true);
      listeners.forEach(([eventName, listener]) => window.removeEventListener(eventName, listener));
    };
  }, []);

  useEffect(() => {
    const background = audioRefs.current.background;
    if (background) background.pause();
    const settings = readSettings();
    if (!focusedRef.current || !settings.enabled || !settings.backgroundEnabled || !availableRef.current.background) return undefined;
    let cancelled = false;
    const start = async () => {
      try {
        const music = background || new Audio(FILES.background);
        music.loop = true;
        music.volume = settings.volume;
        audioRefs.current.background = music;
        if (!cancelled && focusedRef.current) await music.play();
      } catch {}
    };
    start();
    return () => {
      cancelled = true;
      if (audioRefs.current.background) audioRefs.current.background.pause();
    };
  }, [checkedFiles, settingsVersion]);

  useEffect(() => {
    const onSettingsChanged = () => {
      const settings = readSettings();
      setSettingsVersion((version) => version + 1);
      Object.entries(audioRefs.current).forEach(([key, audio]) => {
        audio.volume = settings.volume;
        if (!settings.enabled || !focusedRef.current || (key === "background" && !settings.backgroundEnabled)) {
          audio.pause();
          if (key !== "background") audio.currentTime = 0;
        }
      });
    };
    window.addEventListener("console-settings-changed", onSettingsChanged);
    return () => window.removeEventListener("console-settings-changed", onSettingsChanged);
  }, []);

  return null;
}
