@echo off
setlocal
rem Run from an x64 Native Tools Command Prompt for Visual Studio.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1"
if errorlevel 1 exit /b 1
