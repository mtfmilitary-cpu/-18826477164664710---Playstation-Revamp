import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useDualSenseWS } from './Anikator/useDualSenseWS';
import { useNavigate, useLocation } from 'react-router-dom';

const ControllerNavContext = createContext(null);
export const useControllerNav = () => useContext(ControllerNavContext);

// Auto-detect native interactive elements + manually tagged ones
const FOCUSABLE_SELECTOR = [
    'a[href]:not([data-no-focus])',
    'button:not([disabled]):not([data-no-focus])',
    '[role="button"]:not([data-no-focus])',
    '[data-focusable]',
].join(', ');

export default function ControllerNavigationProvider({ children }) {
    const { action } = useDualSenseWS();
    const navigate = useNavigate();
    const location = useLocation();
    const focusedRef = useRef(null);
    const [focusedEl, setFocusedEl] = useState(null);
    const [focusIndicatorEnabled, setFocusIndicatorEnabled] = useState(false);
    const isActiveRef = useRef(false);
    const actionTimestampRef = useRef(0);

    // ── Helpers ──────────────────────────────────────────────────────

    /** Collect all visible, focusable elements on the page */
    const getFocusables = useCallback(() => {
        return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;

            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            if (parseFloat(style.opacity) < 0.05) return false;

            return true;
        });
    }, []);

    /** Spatial navigation — find the closest focusable in a compass direction */
    const findNearest = useCallback((current, direction) => {
        const all = getFocusables();
        if (!all.length) return null;

        // No focus yet — pick the element nearest to top-centre of screen
        if (!current) {
            return all.sort((a, b) => {
                const ar = a.getBoundingClientRect();
                const br = b.getBoundingClientRect();
                const aS = ar.top + Math.abs(ar.left + ar.width / 2 - window.innerWidth / 2) * 0.3;
                const bS = br.top + Math.abs(br.left + br.width / 2 - window.innerWidth / 2) * 0.3;
                return aS - bS;
            })[0];
        }

        const cr = current.getBoundingClientRect();
        const cx = cr.left + cr.width / 2;
        const cy = cr.top + cr.height / 2;

        let best = null;
        let bestScore = Infinity;

        for (const el of all) {
            if (el === current) continue;
            // Skip nested/containing elements to avoid focus getting stuck
            if (el.contains(current) || current.contains(el)) continue;

            const er = el.getBoundingClientRect();
            const ex = er.left + er.width / 2;
            const ey = er.top + er.height / 2;

            const dx = ex - cx;
            const dy = ey - cy;

            let isCandidate = false;
            let primaryDist, crossDist;
            const MIN_MOVE = 3;

            switch (direction) {
                case 'up':
                    isCandidate = dy < -MIN_MOVE;
                    primaryDist = Math.abs(dy);
                    crossDist = Math.abs(dx);
                    break;
                case 'down':
                    isCandidate = dy > MIN_MOVE;
                    primaryDist = Math.abs(dy);
                    crossDist = Math.abs(dx);
                    break;
                case 'left':
                    isCandidate = dx < -MIN_MOVE;
                    primaryDist = Math.abs(dx);
                    crossDist = Math.abs(dy);
                    break;
                case 'right':
                    isCandidate = dx > MIN_MOVE;
                    primaryDist = Math.abs(dx);
                    crossDist = Math.abs(dy);
                    break;
            }

            if (!isCandidate) continue;

            // Score: prefer items along the movement axis (penalise cross-axis distance)
            const score = primaryDist + crossDist * 3;
            if (score < bestScore) {
                bestScore = score;
                best = el;
            }
        }

        return best;
    }, [getFocusables]);

    // ── Focus management ────────────────────────────────────────────

    const setFocus = useCallback((el) => {
        if (focusedRef.current) {
            focusedRef.current.classList.remove('ps-focused');
        }

        focusedRef.current = el;
        setFocusedEl(el);

        if (el) {
            setFocusIndicatorEnabled(true);
            el.classList.add('ps-focused');
            isActiveRef.current = true;
            window.__focusNavActive = true;

            // Scroll the element into view
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

            // Tell VirtualCursor where we are so the dot follows
            const r = el.getBoundingClientRect();
            window.dispatchEvent(new CustomEvent('controller-focus-move', {
                detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            }));
        }
    }, []);

    /** Try to move in `direction`; if the boundary is hit, scroll and retry. */
    const processDirection = useCallback((direction) => {
        // Validate current focus is still in the DOM
        if (focusedRef.current && !document.contains(focusedRef.current)) {
            focusedRef.current = null;
            setFocusedEl(null);
        }

        let next = findNearest(focusedRef.current, direction);

        if (next) {
            setFocus(next);
        } else if (!focusedRef.current) {
            // Nothing focused yet — pick the first element
            const first = findNearest(null, direction);
            if (first) setFocus(first);
        } else {
            // At border — scroll and retry
            const scrollAmt = direction === 'down' || direction === 'up' ? 250 : 0;
            if (scrollAmt) {
                window.scrollBy({ top: direction === 'down' ? scrollAmt : -scrollAmt, behavior: 'smooth' });
                setTimeout(() => {
                    const retry = findNearest(focusedRef.current, direction);
                    if (retry) setFocus(retry);
                }, 350);
            }
        }
    }, [findNearest, setFocus]);

    // ── Controller action handling ──────────────────────────────────

    useEffect(() => {
        if (!action || action === 'RELEASE') return;

        // On /showcase, let all buttons pass through to the 3D controller
        if (location.pathname === '/showcase') return;

        // Simple debounce
        const now = Date.now();
        if (now - actionTimestampRef.current < 100) return;
        actionTimestampRef.current = now;

        switch (action) {
            case 'DPAD_UP':
                processDirection('up');
                break;
            case 'DPAD_DOWN':
                processDirection('down');
                break;
            case 'DPAD_LEFT':
                processDirection('left');
                break;
            case 'DPAD_RIGHT':
                processDirection('right');
                break;

            case 'CROSS':
                if (focusedRef.current && isActiveRef.current) {
                    // Flag for VirtualCursor to skip its own click
                    window.__controllerFocusHandled = true;
                    focusedRef.current.click();
                    // Press animation
                    const el = focusedRef.current;
                    const prev = el.style.transform || '';
                    el.style.transform = prev + ' scale(0.93)';
                    setTimeout(() => { el.style.transform = prev; }, 150);
                }
                break;

            case 'CIRCLE':
                navigate(-1);
                break;

            case 'TRIANGLE':
                // Jump to navbar
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                    const navLink = document.querySelector('nav a[href]');
                    if (navLink) setFocus(navLink);
                }, 300);
                break;

            case 'L_TRIGGER':
                window.scrollBy({ top: -window.innerHeight * 0.6, behavior: 'smooth' });
                setTimeout(() => {
                    const up = findNearest(focusedRef.current, 'up');
                    if (up) setFocus(up);
                }, 400);
                break;

            case 'R_TRIGGER':
                window.scrollBy({ top: window.innerHeight * 0.6, behavior: 'smooth' });
                setTimeout(() => {
                    const down = findNearest(focusedRef.current, 'down');
                    if (down) setFocus(down);
                }, 400);
                break;

            default:
                break;
        }
    }, [action, processDirection, navigate, setFocus, findNearest]);

    // Native USB/Bluetooth gamepads (including DualShock 4) via Chromium's Gamepad API.
    // Button mappings follow the standard layout when Windows exposes a standard-mapped pad.
    useEffect(() => {
        let frameId;
        let lastDirectionAt = 0;
        const previousButtons = new Map();
        let initializedPad = false;
        const poll = (timestamp) => {
            if (document.hasFocus()) {
                const pads = navigator.getGamepads?.() || [];
                const pad = Array.from(pads).find(candidate => candidate?.connected);
                if (pad) {
                    const rising = (index) => {
                        const key = String(pad.index) + ":" + String(index);
                        const down = Boolean(pad.buttons[index]?.pressed);
                        const wasDown = previousButtons.get(key);
                        previousButtons.set(key, down);
                        return initializedPad && down && wasDown === false;
                    };
                    if (!initializedPad) {
                        pad.buttons.forEach((button, index) => previousButtons.set(String(pad.index) + ":" + String(index), Boolean(button?.pressed)));
                        initializedPad = true;
                    }
                    let direction = null;
                    if (rising(12) || (pad.axes[1] < -0.65 && timestamp - lastDirectionAt > 190)) direction = "up";
                    else if (rising(13) || (pad.axes[1] > 0.65 && timestamp - lastDirectionAt > 190)) direction = "down";
                    else if (rising(14) || (pad.axes[0] < -0.65 && timestamp - lastDirectionAt > 190)) direction = "left";
                    else if (rising(15) || (pad.axes[0] > 0.65 && timestamp - lastDirectionAt > 190)) direction = "right";
                    if (direction && timestamp - lastDirectionAt > 120) {
                        lastDirectionAt = timestamp;
                        processDirection(direction);
                    }
                    if (rising(9)) {
                        window.consoleBridge?.toggleQuickMenu?.().catch(() => {});
                    }
                    if (rising(0)) {
                        if (focusedRef.current && isActiveRef.current) focusedRef.current.click();
                        else {
                            const first = findNearest(null, "down");
                            if (first) setFocus(first);
                        }
                    }
                    if (rising(1) && location.pathname !== "/home") navigate(-1);
                }
            }
            frameId = requestAnimationFrame(poll);
        };
        frameId = requestAnimationFrame(poll);
        return () => cancelAnimationFrame(frameId);
    }, [processDirection, navigate, location.pathname, findNearest, setFocus]);

    // ── Keyboard fallback (testing without a controller) ────────────

    useEffect(() => {
        const onKey = (e) => {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            switch (e.key) {
                case 'ArrowUp':    e.preventDefault(); processDirection('up');    break;
                case 'ArrowDown':  e.preventDefault(); processDirection('down');  break;
                case 'ArrowLeft':  e.preventDefault(); processDirection('left');  break;
                case 'ArrowRight': e.preventDefault(); processDirection('right'); break;
                case 'Enter':
                    if (focusedRef.current && isActiveRef.current) {
                        e.preventDefault();
                        focusedRef.current.click();
                    }
                    break;
                case 'Escape':
                    if (focusedRef.current) {
                        focusedRef.current.classList.remove('ps-focused');
                        focusedRef.current = null;
                        setFocusedEl(null);
                        isActiveRef.current = false;
                        setFocusIndicatorEnabled(false);
                        window.__focusNavActive = false;
                    }
                    break;
                default: break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [processDirection]);

    // ── Deactivate on mouse movement ────────────────────────────────

    useEffect(() => {
        let debounce;
        const onMouse = () => {
            if (!isActiveRef.current) return;
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                if (focusedRef.current) {
                    focusedRef.current.classList.remove('ps-focused');
                }
                focusedRef.current = null;
                setFocusedEl(null);
                isActiveRef.current = false;
                setFocusIndicatorEnabled(false);
                window.__focusNavActive = false;
            }, 150);
        };
        window.addEventListener('mousemove', onMouse, { passive: true });
        return () => { window.removeEventListener('mousemove', onMouse); clearTimeout(debounce); };
    }, []);

    // ── Clear on route change ───────────────────────────────────────

    useEffect(() => {
        if (focusedRef.current) {
            focusedRef.current.classList.remove('ps-focused');
        }
        focusedRef.current = null;
        setFocusedEl(null);
        isActiveRef.current = false;
        setFocusIndicatorEnabled(false);
        window.__focusNavActive = false;
    }, [location.pathname]);

    // ── Render ──────────────────────────────────────────────────────

    const toggleFocusIndicator = () => {
        if (focusIndicatorEnabled) {
            if (focusedRef.current) focusedRef.current.classList.remove('ps-focused');
            focusedRef.current = null;
            setFocusedEl(null);
            isActiveRef.current = false;
            setFocusIndicatorEnabled(false);
            window.__focusNavActive = false;
            return;
        }
        setFocusIndicatorEnabled(true);
        const first = findNearest(null, 'down');
        if (first) setFocus(first);
    };

    return (
        <ControllerNavContext.Provider value={{ focusedEl, setFocus, isActive: isActiveRef.current }}>
            {children}
            {location.pathname !== '/overlay' && (
                <button
                    type="button"
                    className={`controller-focus-toggle ${focusIndicatorEnabled ? 'is-active' : ''}`}
                    onClick={toggleFocusIndicator}
                    aria-pressed={focusIndicatorEnabled}
                    title="Show or hide the controller selection highlight"
                    data-no-focus="true"
                >
                    <span className="controller-focus-toggle-dot" aria-hidden="true" />
                    <span>Selection {focusIndicatorEnabled ? 'ON' : 'OFF'}</span>
                </button>
            )}
        </ControllerNavContext.Provider>
    );
}
