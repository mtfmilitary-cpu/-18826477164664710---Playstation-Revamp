# Windows GameInput and PlayStation Controller Support

## Goal

Make DualShock 4 (PS4) and DualSense (PS5) controllers more reliable over Bluetooth and USB, expose live diagnostics in the console, and offer a familiar controller feel where the device, Windows, and game support it.

## Important separation of responsibilities

- **Microsoft GameInput** is the preferred native input API for a future Windows helper. It provides a unified low-level input model, device notifications, and access to supported controller capabilities. The Electron renderer does not call GameInput directly today.
- **Chromium Gamepad API** is what the current Settings input monitor uses. It is useful for UI testing, but is not a substitute for a native GameInput bridge.
- **Controller emulation** is a separate layer. A compatibility tool such as DS4Windows can read a physical controller and expose a virtual device for games that need one. GameInput alone does not create a virtual PS4 controller for arbitrary games.
- **Steam Input** may already handle a supported controller inside Steam games. Running more than one mapper/emulator can create double input, extra latency, or conflicting mappings.

Microsoft describes GameInput as a unified API spanning legacy XInput, DirectInput, Raw Input, HID, and WinRT input APIs: https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/input/overviews/input-overview

## Current code status

Implemented in this branch:
- Settings can inspect whether the existing DS4Windows/driver installation is present.
- The Accessories and Controller Settings pages can open Windows Bluetooth settings.
- The Settings page can request launch of an installed DS4Windows executable via a validated Electron IPC bridge.
- The current renderer shows live input through the browser Gamepad API, and the settings page saves deadzone/profile preferences locally.

Not implemented or verified:
- A compiled native GameInput helper or Node/Electron IPC stream for GameInput device-added/device-removed and state events.
- Automatic Bluetooth re-pairing or a guarantee that Windows will reconnect a controller.
- A global virtual-controller output backend driven by the console's deadzone and button-remapping settings.
- Exact PS4/PS5 parity in every game, including DualSense adaptive triggers, advanced haptics, touchpad gestures, audio, or microphone. Those depend on controller transport, native support, drivers, and the game.

## Recommended implementation sequence

1. Build a small signed Windows native helper against Microsoft's GameInput SDK. Keep it separate from Electron's renderer and send a bounded JSON-lines event stream to the main process. Events should include device connected/disconnected, display name, stable device/container identifier, supported capabilities, button/axis state, and error codes. Avoid polling in the React renderer for production input.
2. Add a connection state machine: disconnected -> pairing/connecting -> connected -> reconnecting -> connected, with bounded retry/backoff and explicit user cancellation. Do not try to silently pair or bypass Windows Bluetooth permissions.
3. Use GameInput as the console's native input source for live status, calibration, controller selection, and supported native feedback. Keep the Gamepad API as a fallback for browser preview.
4. Treat output emulation as a selectable, separately validated backend. Before enabling a virtual controller, check whether Steam Input or another mapper is already active and explain how to avoid duplicate input. Do not silently install retired or unsigned kernel drivers.
5. Add calibration profiles per device/container ID, including left/right radial deadzones, response curves, trigger thresholds, and button remapping. Apply settings in the native input path used by the console. For games, apply mappings only through a documented supported virtual-device backend.
6. Add diagnostics: device ID (privacy-safe), transport if discoverable, connection/disconnection timestamps, battery where supported, input sample freshness, reconnect attempts, backend state, and a copyable log with no secrets.
7. Test on Windows 10/11 with DualShock 4 and DualSense over Bluetooth and USB, including sleep/resume, controller power-off/on, Bluetooth adapter recovery, multiple controllers, Steam Input on/off, and game launch/exit.

## Bluetooth recovery guidance

The console can open Windows Bluetooth settings and launch an installed controller mapper, but Windows controls the actual pairing and Bluetooth link. For a DS4, hold **PS + Share** until the light bar flashes rapidly to enter pairing mode; for DualSense, hold **PS + Create**. Pair from Windows Settings > Bluetooth & devices. If a device repeatedly drops, test the Microsoft Bluetooth stack/adapter and firmware, battery, distance/interference, and whether multiple controller mappers are competing.

## Legacy backend warning

The existing installer in this branch targets the classic DS4Windows + ViGEmBus combination. ViGEmBus is archived/retired, so it should not be treated as the preferred new installation path. Before changing the installer, pin and verify a maintained backend's exact release assets and checksums, clearly disclose driver installation, require Windows administrator approval, and keep cancellation/rollback paths. Do not automatically migrate users or install a kernel driver without explicit consent.

## Acceptance criteria

- Controller connect/disconnect is reported promptly and does not freeze the renderer.
- The selected device is stable across reconnects and app restarts.
- No duplicate controller input occurs in the documented configuration.
- Saved deadzones and remaps affect the console's actual native input, not just the Settings screen.
- Failed reconnects show actionable status and never claim the controller is connected when it is not.
- Native input and emulator output are separately identified in the UI.
- All changes are built and tested on a real Windows device before being labelled complete.
