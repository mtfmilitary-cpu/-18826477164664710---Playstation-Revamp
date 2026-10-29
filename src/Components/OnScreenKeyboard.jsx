import React, { useCallback, useEffect, useRef, useState } from "react";
import { Delete, CornerDownLeft, X, ArrowUp } from "lucide-react";
import "./OnScreenKeyboard.css";

const ROWS = [
  ["1","2","3","4","5","6","7","8","9","0"],
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m","-","_","@"],
  [".",",","/","?","!","'",";",":","(",")"],
];
const FLAT_KEYS = [...ROWS.flat(), "SHIFT", "BACKSPACE", "SPACE", "CLEAR", "DONE"];
const TEXT_TYPES = new Set(["text","search","email","url","tel","password","number"]);

function writeValue(target, nextValue, caret) {
  if (!target || !target.isConnected) return;
  const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(target, nextValue);
  else target.value = nextValue;
  target.dispatchEvent(new Event("input", { bubbles: true }));
  try {
    target.setSelectionRange(caret, caret);
  } catch {}
  target.focus({ preventScroll: true });
}

export default function OnScreenKeyboard() {
  const [visible, setVisible] = useState(false);
  const [shift, setShift] = useState(false);
  const [selected, setSelected] = useState(0);
  const targetRef = useRef(null);
  const selectedRef = useRef(0);
  selectedRef.current = selected;

  const close = useCallback(() => {
    setVisible(false);
    window.__onScreenKeyboardOpen = false;
    const target = targetRef.current;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }, []);

  const activate = useCallback((key) => {
    const target = targetRef.current;
    if (!target?.isConnected) return;
    if (key === "DONE") { close(); return; }
    if (key === "SHIFT") { setShift(value => !value); return; }
    if (key === "CLEAR") { writeValue(target, "", 0); return; }
    const start = Number.isInteger(target.selectionStart) ? target.selectionStart : target.value.length;
    const end = Number.isInteger(target.selectionEnd) ? target.selectionEnd : start;
    const value = String(target.value ?? "");
    if (key === "BACKSPACE") {
      if (start === end && start > 0) writeValue(target, value.slice(0, start - 1) + value.slice(end), start - 1);
      else writeValue(target, value.slice(0, start) + value.slice(end), start);
      return;
    }
    const text = key === "SPACE" ? " " : (shift ? key.toUpperCase() : key);
    writeValue(target, value.slice(0, start) + text + value.slice(end), start + text.length);
    if (shift && key.length === 1) setShift(false);
  }, [close, shift]);

  useEffect(() => {
    const isTextEntry = (element) => {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
      if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
      return !element.disabled && !element.readOnly && TEXT_TYPES.has((element.type || "text").toLowerCase());
    };
    const showForTarget = (target) => {
      if (!isTextEntry(target)) return;
      targetRef.current = target;
      setVisible(true);
      setSelected(0);
      window.__onScreenKeyboardOpen = true;
    };
    const onFocusIn = (event) => showForTarget(event.target);
    const onPointerDown = (event) => {
      if (isTextEntry(event.target) && !window.__onScreenKeyboardOpen) showForTarget(event.target);
    };
    const onFocusOut = (event) => {
      if (event.target !== targetRef.current) return;
      // Let keyboard button interaction run without dropping the text target.
      requestAnimationFrame(() => {
        if (targetRef.current && !targetRef.current.isConnected) close();
      });
    };
    const onOskAction = (event) => {
      if (!window.__onScreenKeyboardOpen) return;
      const action = event.detail?.action;
      if (action === "close") { close(); return; }
      if (action === "select") { activate(FLAT_KEYS[selectedRef.current]); return; }
      const current = selectedRef.current;
      const next = action === "left" ? Math.max(0, current - 1)
        : action === "right" ? Math.min(FLAT_KEYS.length - 1, current + 1)
        : action === "up" ? Math.max(0, current - 10)
        : action === "down" ? Math.min(FLAT_KEYS.length - 1, current + 10) : current;
      setSelected(next);
    };
    const onKeyDown = (event) => {
      if (!window.__onScreenKeyboardOpen) return;
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        const current = selectedRef.current;
        const next = event.key === "ArrowLeft" ? Math.max(0, current - 1)
          : event.key === "ArrowRight" ? Math.min(FLAT_KEYS.length - 1, current + 1)
          : event.key === "ArrowUp" ? Math.max(0, current - 10)
          : Math.min(FLAT_KEYS.length - 1, current + 10);
        setSelected(next);
        return;
      }
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        activate(FLAT_KEYS[selectedRef.current]);
      }
    };
    window.addEventListener("console:osk-action", onOskAction);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("console:osk-action", onOskAction);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [activate, close]);

  useEffect(() => {
    if (!visible) return undefined;
    let frame = 0;
    let lastMove = 0;
    let previous = new Map();
    const poll = (timestamp) => {
      const pad = Array.from(navigator.getGamepads?.() || []).find(item => item?.connected);
      if (pad) {
        const rising = index => {
          const id = String(pad.index) + ":" + index;
          const down = Boolean(pad.buttons[index]?.pressed);
          const wasDown = previous.get(id) || false;
          previous.set(id, down);
          return down && !wasDown;
        };
        let direction = null;
        if (rising(12)) direction = "up";
        else if (rising(13)) direction = "down";
        else if (rising(14)) direction = "left";
        else if (rising(15)) direction = "right";
        else if (timestamp - lastMove > 180) {
          if ((pad.axes?.[1] ?? 0) < -0.78) direction = "up";
          else if ((pad.axes?.[1] ?? 0) > 0.78) direction = "down";
          else if ((pad.axes?.[0] ?? 0) < -0.78) direction = "left";
          else if ((pad.axes?.[0] ?? 0) > 0.78) direction = "right";
        }
        if (direction) {
          lastMove = timestamp;
          const current = selectedRef.current;
          const next = direction === "left" ? Math.max(0,current-1) : direction === "right" ? Math.min(FLAT_KEYS.length-1,current+1)
            : direction === "up" ? Math.max(0,current-10) : Math.min(FLAT_KEYS.length-1,current+10);
          setSelected(next);
        }
        if (rising(0)) activate(FLAT_KEYS[selectedRef.current]);
        if (rising(1) || rising(8)) close();
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [visible, activate, close]);

  if (!visible) return null;
  let index = 0;
  return <section className="onscreen-keyboard" aria-label="On-screen keyboard" role="dialog">
    <header className="onscreen-keyboard-header">
      <div><span className="onscreen-keyboard-kicker">CONSOLE INPUT</span><strong>On-screen keyboard</strong><small>Type with your controller, arrow keys, or mouse</small></div>
      <button className="onscreen-keyboard-close" type="button" aria-label="Close on-screen keyboard" onMouseDown={event=>event.preventDefault()} onClick={close}><X size={18}/></button>
    </header>
    <div className="onscreen-keyboard-rows">
      {ROWS.map((row, rowIndex) => <div className="onscreen-keyboard-row" key={rowIndex}>
        {row.map(key => { const keyIndex = index++; return <button type="button" key={key} className={selected===keyIndex?"osk-key selected":"osk-key"} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setSelected(keyIndex)} onClick={()=>activate(key)}>{shift?key.toUpperCase():key}</button>; })}
      </div>)}
      <div className="onscreen-keyboard-row osk-actions">
        {["SHIFT","BACKSPACE","SPACE","CLEAR","DONE"].map(key => { const keyIndex = index++; const Icon = key==="BACKSPACE"?Delete:key==="DONE"?CornerDownLeft:key==="SHIFT"?ArrowUp:key==="CLEAR"?X:null; return <button type="button" key={key} className={`osk-key osk-${key.toLowerCase()} ${selected===keyIndex?"selected":""}`} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setSelected(keyIndex)} onClick={()=>activate(key)}>{Icon&&<Icon size={15}/>}<span>{key==="SPACE"?"Space":key==="BACKSPACE"?"Delete":key==="DONE"?"Done":key==="SHIFT"?(shift?"Shift on":"Shift"):key==="CLEAR"?"Clear":key}</span></button>; })}
      </div>
    </div>
    <footer><span>Enter / ✕ Select</span><span>Esc / ○ Close</span><span>Letters and symbols insert at the cursor</span></footer>
  </section>;
}
