# Windows GameInput bridge (native controller input)

The intended bridge is a native Windows executable started by Electron and connected through newline-delimited JSON over stdout. It will feed controller events to Electron's main process so input is not dependent on the React renderer being focused.

## Important mapping note

Windows GameInput represents gamepad controls as a **bitmask** in `GameInputGamepadState.buttons`; it does not define a generic numbered button index 113. If a controller test utility labels the PlayStation/Guide button as "113", that may be a raw HID button index from that utility rather than a GameInput enum value. GameInput may also not expose the PlayStation Guide button for every controller/driver.

Before treating 113 as a GameInput control, compare the value with the actual controller's GameInput readings. If the Guide button is not exposed by GameInput, a separate Raw Input/HID path may be required. Do not map GameInput's D-pad bits to a guessed numeric index.

## Planned event contract

Each stdout line is one JSON object:
```json
{"type":"button","control":"guide","pressed":true,"source":"gameinput"}
{"type":"button","control":"guide","pressed":false,"source":"gameinput"}
{"type":"gamepad","buttons":1234,"source":"gameinput"}
```

Electron should spawn the bridge, parse complete lines, debounce press/release events, and route short Guide press to Home and a five-second hold to the Quick Menu. Keep browser `navigator.getGamepads()` as a temporary fallback until native input is built and verified; do not claim system-wide controller support before that test passes.

## Build requirements

Windows 10/11 SDK with the GameInput SDK/header and library, Visual Studio C++ build tools, and a target architecture matching the Electron package. The compiled executable should be distributed with the app; do not commit generated build output unless the project intentionally versions binaries.
