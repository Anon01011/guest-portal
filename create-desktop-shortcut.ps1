# create-desktop-shortcut.ps1
# Creates "GMP Portal" shortcut on user's Desktop with gmp-logo.ico icon

$AppRoot = $PSScriptRoot
if (-not $AppRoot) { $AppRoot = "d:\GuestManagementApp" }

$TargetBat = Join-Path $AppRoot "gmp-portal.bat"
$IconFile  = Join-Path $AppRoot "gmp-logo.ico"

# Verify target files exist
if (-not (Test-Path $TargetBat)) {
    Write-Warning "Target launcher gmp-portal.bat not found at $TargetBat"
}

# Create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "GMP Portal.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetBat
$Shortcut.WorkingDirectory = $AppRoot
if (Test-Path $IconFile) {
    $Shortcut.IconLocation = "$IconFile,0"
}
$Shortcut.Description = "Guest Management Portal"
$Shortcut.Save()

Write-Host "✅ Desktop Shortcut successfully created: $ShortcutPath" -ForegroundColor Green
