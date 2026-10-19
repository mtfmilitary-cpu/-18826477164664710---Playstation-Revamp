@echo off
setlocal
rem Run from an x64 Native Tools Command Prompt for Visual Studio.
rem GameInput.h and GameInput.lib must be installed with the supported Windows GameInput SDK/runtime.
cl.exe /nologo /EHsc /std:c++17 /W4 GameInputBridge.cpp /link GameInput.lib /OUT:GameInputBridge.exe
if errorlevel 1 (
  echo Build failed. Check the Windows SDK/GameInput headers, library paths, and Visual Studio C++ tools.
  exit /b 1
)
echo Built GameInputBridge.exe
