import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines, Gamepad2, Headphones, Moon, Music2, Power, Settings2, Trophy, Users, X } from "lucide-react";
import "./QuickMenu.css";

const items = [
  { id: "sound", label: "Sound / Devices", icon: AudioLines, detail: "Audio and connected devices" },
  { id: "friends", label: "Friends", icon: Users, detail: "Open your Steam friends list", path: "/friends" },
  { id: "party", label: "Party Chat", icon: Headphones, detail: "Voice and text party chat", path: "/party" },
  { id: "music", label: "Music", icon: Music2, detail: "Music controls will appear here" },
  { id: "trophies", label: "Achievements", icon: Trophy, detail: "Steam achievement progress", path: "/library" },
  { id: "customize", label: "Customize Console", icon: Settings2, detail: "Change console appearance", path: "/settings" },
  { id: "sleep", label: "Enter Sleep Mode", icon: Moon, detail: "Put this PC to sleep", action: "sleep" },
  { id: "power", label: "Power", icon: Power, detail: "Restart or shut down this PC", path: "/settings" },
];

export default function QuickMenu() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("sound");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const toggle = () => { setOpen((value) => !value); setNotice(""); };
    window.addEventListener("console:quick-menu-toggle", toggle);
    const keydown = (event) => {
      if (event.code === "ScrollLock" && !window.consoleBridge?.runtime) {
        event.preventDefault();
        toggle();
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("console:quick-menu-toggle", toggle);
      window.removeEventListener("keydown", keydown);
    };
  }, []);

  const active = items.find((item) => item.id === selected) || items[0];
  async function activate(item) {
    setSelected(item.id);
    if (item.action === "sleep") {
      if (!window.consoleBridge?.requestPowerAction) {
        setNotice("Sleep mode is available in the Windows desktop app.");
        return;
      }
      try {
        const result = await window.consoleBridge.requestPowerAction("sleep");
        setNotice(result?.cancelled ? "Sleep cancelled." : result?.message || "Sleep requested.");
      } catch (error) { setNotice(error.message || "Could not enter sleep mode."); }
      return;
    }
    if (item.path) { setOpen(false); navigate(item.path); }
    else setNotice(item.detail + ".");
  }

  if (!open) return null;
  return <div className="quick-menu-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
    <section className="quick-menu-panel" role="dialog" aria-modal="true" aria-label="Quick Menu">
      <header className="quick-menu-header"><span>QUICK MENU</span><button aria-label="Close Quick Menu" onClick={() => setOpen(false)}><X size={18}/></button></header>
      <div className="quick-menu-content">
        <nav className="quick-menu-list" aria-label="Quick Menu options">
          {items.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={selected === item.id ? "quick-menu-item selected" : "quick-menu-item"} onMouseEnter={() => setSelected(item.id)} onFocus={() => setSelected(item.id)} onClick={() => activate(item)}>
              <Icon size={19} strokeWidth={1.7}/><span>{item.label}</span>
            </button>;
          })}
        </nav>
        <div className="quick-menu-detail">
          <div className="quick-menu-detail-icon">{React.createElement(active.icon, { size: 28, strokeWidth: 1.5 })}</div>
          <p className="quick-menu-eyebrow">CONSOLE</p><h2>{active.label}</h2><p>{active.detail}</p>
          {active.id === "power" && <div className="quick-menu-power-actions">
            <button onClick={async () => { try { const result = await window.consoleBridge?.requestPowerAction?.("restart"); setNotice(result?.message || "Restart requested."); } catch (error) { setNotice(error.message); } }}>Restart</button>
            <button className="danger" onClick={async () => { try { const result = await window.consoleBridge?.requestPowerAction?.("shutdown"); setNotice(result?.message || "Shutdown requested."); } catch (error) { setNotice(error.message); } }}>Shut down</button>
          </div>}
          {notice && <p className="quick-menu-notice" role="status">{notice}</p>}
          <div className="quick-menu-footer"><Gamepad2 size={15}/> Scroll Lock to toggle <span>·</span> Esc to close</div>
        </div>
      </div>
    </section>
  </div>;
}
