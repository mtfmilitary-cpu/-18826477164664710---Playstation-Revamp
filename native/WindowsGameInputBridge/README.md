# Windows GameInput bridge (native controller input)

The native helper is a Windows executable started by Electron and connected through newline-delimited JSON over stdout. Electron launches only the repo-local executable, parses bounded JSONL events, and forwards validated controller samples through a narrow preload IPC bridge to the Settings input monitor. It never exposes Node.js APIs to the renderer.

## Build the helper

Requirements:

- Windows 10 (May 2019 update or newer) or Windows 11.
- Visual Studio C++ Build Tools with the x64 Native Tools command prompt.
- Network access to restore the official `Microsoft.GameInput` NuGet package on the first build.

From **x64 Native Tools Command Prompt for VS**, run:

```bat
native\WindowsGameInputBridge\build.bat
```

The script restores the Microsoft GameInput NuGet package, locates the header and x64 import library, and compiles `GameInputBridge.exe` next to the source. The Electron Settings page has a **Start native GameInput** button that launches it. If the executable has not been built, the UI reports that instead of pretending native input is active.

The helper build does not silently install a driver or a Windows runtime. On PCs without a compatible GameInput runtime, the helper reports the initialization error; any runtime installation should be handled explicitly and with user consent.

## Event contract

Each stdout line is one JSON object:

```json
{"type":"gamepad-state","source":"gameinput","buttons":1234,"leftTrigger":0.0,"rightTrigger":0.0,"leftX":0.0,"leftY":0.0,"rightX":0.0,"rightY":0.0}
```

Electron accepts only `gamepad-state` events with source `gameinput`, clamps numeric fields, rejects malformed/oversized lines, and stops the helper when Electron exits. The Settings input monitor prefers native samples when received and keeps Chromium's Gamepad API as a fallback.

## Confirmed PlayStation button observation

The user tested the controller in Windows `joy.cpl` (Set up USB Game Controllers). Pressing the physical PlayStation-logo button lights **Button 13** in that tester.

This confirms the tester's button ordinal, but it does **not** prove that GameInput has a button numbered 13. These APIs use different representations:

- `joy.cpl` reports a numbered DirectInput-style button.
- GameInput exposes `GameInputGamepadState.buttons` as a bitmask of its defined gamepad controls.
- Depending on the controller and driver, the PS/Guide button may not be exposed through GameInput at all.

Do not convert the `joy.cpl` number directly into a GameInput bit. The current prototype reads standard gamepad state; it does not yet implement Guide-button detection or short-press / five-second-hold navigation. The next step is to inspect real GameInput readings while pressing the PS button. If the button does not appear there, add a native Windows HID/Raw Input detection path while keeping GameInput as the main source for standard buttons, sticks, and triggers.

## Current limitations

- The helper is source-integrated with Electron, but it must be compiled on Windows before it can run.
- It currently reports standard gamepad state only. Device identity/status events and the PS/Guide button path are not complete.
- The native helper does not create a virtual controller. Virtual output/emulation is a separate compatibility layer.
- The native source and Electron runtime still need validation on a real Windows PC with DualShock 4 and DualSense over USB and Bluetooth. Do not claim system-wide controller support before those tests pass.
