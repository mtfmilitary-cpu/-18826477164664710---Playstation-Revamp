#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include <GameInput.h>
#include <cstdint>
#include <iostream>
#include <thread>
#include <chrono>
#include <iomanip>

static void emitState(const GameInputGamepadState& s) {
    // stdout is a machine-readable newline-delimited JSON channel for Electron.
    std::cout << "{\"type\":\"gamepad-state\",\"source\":\"gameinput\",\"connected\":true,\"buttons\":"
              << static_cast<unsigned long long>(s.buttons)
              << ",\"leftTrigger\":" << s.leftTrigger
              << ",\"rightTrigger\":" << s.rightTrigger
              << ",\"leftX\":" << s.leftThumbstickX
              << ",\"leftY\":" << s.leftThumbstickY
              << ",\"rightX\":" << s.rightThumbstickX
              << ",\"rightY\":" << s.rightThumbstickY << "}\n";
    std::cout.flush();
}

static void emitDisconnected() {
    std::cout << "{\"type\":\"device-status\",\"source\":\"gameinput\",\"connected\":false}\n";
    std::cout.flush();
}

int wmain() {
    IGameInput* input = nullptr;
    if (FAILED(GameInputCreate(&input)) || !input) {
        std::cerr << "GameInputCreate failed. Install the supported Windows GameInput runtime/SDK.\n";
        return 2;
    }

    IGameInputDevice* selectedDevice = nullptr;
    bool havePrevious = false;
    GameInputGamepadState previous{};

    // Native polling is independent of Electron renderer focus.
    while (true) {
        IGameInputReading* reading = nullptr;
        const HRESULT hr = input->GetCurrentReading(GameInputKindGamepad, selectedDevice, &reading);
        if (SUCCEEDED(hr) && reading) {
            if (!selectedDevice) reading->GetDevice(&selectedDevice);
            GameInputGamepadState current{};
            if (reading->GetGamepadState(&current)) {
                const bool changed = !havePrevious ||
                    current.buttons != previous.buttons ||
                    current.leftTrigger != previous.leftTrigger ||
                    current.rightTrigger != previous.rightTrigger ||
                    current.leftThumbstickX != previous.leftThumbstickX ||
                    current.leftThumbstickY != previous.leftThumbstickY ||
                    current.rightThumbstickX != previous.rightThumbstickX ||
                    current.rightThumbstickY != previous.rightThumbstickY;
                if (changed) emitState(current);
                previous = current;
                havePrevious = true;
            }
            reading->Release();
        } else if (selectedDevice) {
            emitDisconnected();
            selectedDevice->Release();
            selectedDevice = nullptr;
            havePrevious = false;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(8));
    }

    if (selectedDevice) selectedDevice->Release();
    input->Release();
    return 0;
}
