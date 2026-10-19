param(
  [Parameter(Mandatory=$true)][string]$ProgressPath,
  [Parameter(Mandatory=$true)][string]$ResultPath
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
function Set-Stage([string]$stage, [string]$title, [string]$message, [string]$kind = 'info') {
  @{ stage=$stage; title=$title; message=$message; kind=$kind } |
    ConvertTo-Json -Compress | Set-Content -LiteralPath $ProgressPath -Encoding ASCII
}
try {
  Set-Stage 'download' 'Downloading controller software' 'Fetching the published DS4Windows and ViGEmBus release files.'
  $work = Join-Path $env:TEMP 'ConsoleControllerSetup'
  New-Item -ItemType Directory -Path $work -Force | Out-Null
  $ds4 = Join-Path $work 'DS4Windows_4.0.2.3_x64.zip'
  $driver = Join-Path $work 'ViGEmBus_1.22.0_x64_x86_arm64.exe'
  Invoke-WebRequest -Uri 'https://github.com/hbashton/DS4Windows/releases/download/v4.0.2.3/DS4Windows_4.0.2.3_x64.zip' -OutFile $ds4 -UseBasicParsing
  Invoke-WebRequest -Uri 'https://github.com/nefarius/ViGEmBus/releases/download/v1.22.0/ViGEmBus_1.22.0_x64_x86_arm64.exe' -OutFile $driver -UseBasicParsing

  Set-Stage 'verify' 'Verifying downloads' 'Checking pinned SHA-256 hashes before using either file.'
  $ds4Hash = (Get-FileHash -LiteralPath $ds4 -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($ds4Hash -ne 'c78c1b2a6aa83e55e3ca16cc49a30c259b5c0e19dc20e616b3d775f1e69329bc') {
    throw 'DS4Windows checksum validation failed. The downloaded file was not installed.'
  }
  $driverHash = (Get-FileHash -LiteralPath $driver -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($driverHash -ne '89220a7865076b342892f98865f3499fb7c4cfd673159e89d352c360fd014c6a') {
    throw 'ViGEmBus checksum validation failed. The downloaded driver was not run.'
  }

  Set-Stage 'extract' 'Preparing DS4Windows' 'Extracting the verified app into your local application folder.'
  $installDir = Join-Path $env:LOCALAPPDATA 'DS4Windows'
  New-Item -ItemType Directory -Path $installDir -Force | Out-Null
  Expand-Archive -LiteralPath $ds4 -DestinationPath $installDir -Force
  # Release ZIPs may place the executable in a versioned/nested directory.
  # Search the extracted tree instead of assuming the EXE is at the ZIP root.
  $ds4ExeItem = Get-ChildItem -LiteralPath $installDir -Filter 'DS4Windows.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $ds4ExeItem) {
    $topEntries = (Get-ChildItem -LiteralPath $installDir -Force -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name) -join ', '
    throw ('DS4Windows.exe was not found anywhere in the extracted archive. Extracted entries: ' + $topEntries)
  }
  $ds4Exe = $ds4ExeItem.FullName

  Set-Stage 'driver' 'Installing ViGEmBus driver' 'Follow the driver setup window to finish installation.'
  $installer = Start-Process -FilePath $driver -Verb RunAs -Wait -PassThru
  if ($installer.ExitCode -notin @(0, 3010)) { throw ('ViGEmBus setup exited with code ' + $installer.ExitCode + '.') }
  $needsRestart = $installer.ExitCode -eq 3010

  Set-Stage 'validate' 'Validating controller setup' 'Checking the DS4Windows app files and ViGEmBus driver service.'
  $service = Get-CimInstance Win32_SystemDriver -Filter "Name='ViGEmBus'" -ErrorAction SilentlyContinue
  $serviceKey = Test-Path 'HKLM:\SYSTEM\CurrentControlSet\Services\ViGEmBus'
  if (-not $service -and -not $serviceKey) {
    throw 'DS4Windows is present, but Windows did not report the ViGEmBus driver service. Check the driver setup or restart if requested.'
  }
  $driverState = if ($service) { [string]$service.State } else { 'Installed; service state pending' }
  $result = @{
    success = $true
    ds4WindowsInstalled = $true
    ds4WindowsPath = $ds4Exe
    vigemBusInstalled = $true
    vigemBusState = $driverState
    needsRestart = $needsRestart
    message = if ($needsRestart) { 'Controller support is installed. Restart Windows when convenient, then try out the controller system.' } else { 'Controller support is installed. Try out the controller system now.' }
  }
  $result | ConvertTo-Json -Compress | Set-Content -LiteralPath $ResultPath -Encoding ASCII
  Set-Stage 'complete' 'Controller support installed' 'Controller support is installed. Try out the controller system now.' 'success'
} catch {
  $failureMessage = $_.Exception.Message
  $cancelled = $failureMessage -match 'cancel|cancelled|canceled'
  @{ success=$false; cancelled=$cancelled; error=$failureMessage } | ConvertTo-Json -Compress | Set-Content -LiteralPath $ResultPath -Encoding ASCII
  if ($cancelled) { Set-Stage 'cancelled' 'Administrator approval cancelled' 'Windows administrator approval was cancelled. The driver was not installed.' 'info' }
  else { Set-Stage 'failed' 'Controller setup needs attention' $failureMessage 'error' }
  exit 1
}
