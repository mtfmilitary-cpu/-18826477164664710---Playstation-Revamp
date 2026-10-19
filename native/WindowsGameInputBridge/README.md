# Windows GameInput bridge (native controller input)

The intended bridge is a native Windows executable started by Electron and connected through newline-delimited JSON over stdout. It will feed controller events to Electron's main process so input is not dependent on the React renderer being focused.

## Confirmed PlayStation button observation

The user tested the controller in Windows `joy.cpl` (Set up USB Game Controllers). Pressing the physical PlayStation-logo button lights **Button 13** in that tester.

This confirms the tester's button ordinal, but it does **not** prove that GameInput has a button numbered 13. These APIs use different representations:

- `joy.cpl` reports a numbered DirectInput-style button.
- GameInput exposes `GameInputGamepadState.buttons` as a bitmask of its defined gamepad controls.
- Depending on the controller and driver, the PS/Guide button may not be exposed through GameInput at all.

Do not convert the `joy.cpl` number directly into a GameInput bit. The next implementation step is to inspect real GameInput readings while pressing the PS button. If the button does not appear there, add a native Windows HID/Raw Input detection path for the PS button while keeping GameInput as the main source for standard buttons, sticks, and triggers.

## Planned event contract

Each stdout line is one JSON object:
```json
{"type":"button","control":"guide","pressed":true,"source":"native"}
{"type":"button","control":"guide","pressed":false,"source":"native"}
{"type":"gamepad-state","buttons":1234,"source":"gameinput"}
```

Electron should spawn the bridge, parse complete lines, debounce press/release events, and route a short Guide press to Home and a five-second hold to the Quick Menu. Keep browser `navigator.getGamepads()` only as a temporary fallback until native input is built and verified; do not claim system-wide controller support before that test passes.

## Build requirements

Windows 10/11 SDK with the GameInput SDK/header and library, Visual Studio C++ build tools, and a target architecture matching the Electron package. The current C++ source is an initial GameInput polling prototype; it has **not** been compiled, integrated with Electron, or verified against the physical PS button. The compiled executable should be distributed with the app; do not commit generated build output unless the project intentionally versions binaries.
