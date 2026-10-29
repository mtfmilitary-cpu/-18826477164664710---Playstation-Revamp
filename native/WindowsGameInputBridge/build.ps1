$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$packages = Join-Path $root "packages"
$source = Join-Path $root "GameInputBridge.cpp"
$output = Join-Path $root "GameInputBridge.exe"

if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
  throw "cl.exe was not found. Open the x64 Native Tools Command Prompt for Visual Studio, then run this script."
}

$nugetCommand = Get-Command nuget.exe -ErrorAction SilentlyContinue
if ($nugetCommand) {
  $nuget = $nugetCommand.Source
} else {
  $nuget = Join-Path $env:TEMP "console-nuget.exe"
  if (-not (Test-Path $nuget)) {
    Write-Host "Downloading the official NuGet command-line client over HTTPS..."
    Invoke-WebRequest -Uri "https://dist.nuget.org/win-x86-commandline/latest/nuget.exe" -OutFile $nuget
  }
}

New-Item -ItemType Directory -Force -Path $packages | Out-Null
& $nuget install Microsoft.GameInput -OutputDirectory $packages -NonInteractive
if ($LASTEXITCODE -ne 0) { throw "Microsoft.GameInput package restore failed." }

$header = Get-ChildItem $packages -Filter GameInput.h -Recurse | Select-Object -First 1
$library = Get-ChildItem $packages -Filter GameInput.lib -Recurse |
  Where-Object { $_.FullName -match '[\\/]x64[\\/]' -or $_.DirectoryName -match 'x64' } |
  Select-Object -First 1
if (-not $header -or -not $library) {
  throw "The restored Microsoft.GameInput package did not contain GameInput.h and an x64 GameInput.lib in the expected package layout."
}

Write-Host "Using GameInput headers: $($header.DirectoryName)"
Write-Host "Using GameInput library: $($library.DirectoryName)"
& cl.exe /nologo /EHsc /std:c++17 /W4 "/I$($header.DirectoryName)" $source /link "/LIBPATH:$($library.DirectoryName)" GameInput.lib "/OUT:$output"
if ($LASTEXITCODE -ne 0) { throw "GameInputBridge compilation failed." }
if (-not (Test-Path $output)) { throw "The compiler did not create GameInputBridge.exe." }
Write-Host "Built $output"
