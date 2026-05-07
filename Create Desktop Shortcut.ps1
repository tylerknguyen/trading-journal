# Trading Journal - Desktop Shortcut Installer
#
# Run this file once (right-click -> "Run with PowerShell") to add a shortcut to
# your Desktop that one-click launches the Trading Journal.
#
# To customize the icon:
#   1. Drop an .ico file named "app-icon.ico" in this same folder.
#      (Recommended: grab the WallStreetBets mascot, save as PNG, then convert
#       to .ico at https://convertio.co/png-ico/ or https://icoconvert.com/ -
#       both are free and work in the browser.)
#   2. Re-run this script. The shortcut will pick up the new icon.
#
# If app-icon.ico is missing, the shortcut still works -- it'll just use the
# default cmd icon.

$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath    = Join-Path $projectDir "Launch Trading Journal.bat"
$iconPath   = Join-Path $projectDir "app-icon.ico"
$desktop    = [Environment]::GetFolderPath("Desktop")
$linkPath   = Join-Path $desktop "Trading Journal.lnk"

if (-not (Test-Path $batPath)) {
    Write-Host "ERROR: Could not find 'Launch Trading Journal.bat' in $projectDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($linkPath)
$shortcut.TargetPath       = $batPath
$shortcut.WorkingDirectory = $projectDir
$shortcut.Description      = "Launch Trading Journal locally on http://127.0.0.1:5173"
$shortcut.WindowStyle      = 1  # Normal

if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
    Write-Host "Using icon: $iconPath" -ForegroundColor Green
} else {
    Write-Host "No 'app-icon.ico' found in project folder. Shortcut will use the default icon." -ForegroundColor Yellow
    Write-Host "  -> Drop an .ico file named 'app-icon.ico' here and re-run this script to set a custom icon." -ForegroundColor Yellow
}

$shortcut.Save()

Write-Host ""
Write-Host "Shortcut created on Desktop:" -ForegroundColor Green
Write-Host "  $linkPath"
Write-Host ""
Write-Host "Double-click 'Trading Journal' on your Desktop to launch the app." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
