# Scanner Diagnostic and Issue Tracing Tool
$logFile = Join-Path $PSScriptRoot "scanner_diagnostic_report.md"
$log = @()

function Log-Write {
    param([string]$text)
    $script:log += $text
    Write-Host $text
}

Log-Write '## Scanner Hardware Diagnostic Report'
Log-Write "Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Log-Write "System Name: $env:COMPUTERNAME"
Log-Write "CurrentUser: $env:USERNAME"
Log-Write "Is Elevated: $([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"
Log-Write ''

Log-Write '### 1. WIA Service Status'
$wiaService = Get-Service -Name stisvc -ErrorAction SilentlyContinue
if ($wiaService) {
    Log-Write "Service Name: stisvc"
    Log-Write "Status: $($wiaService.Status)"
    Log-Write "Start Type: $($wiaService.StartType)"
    
    if ($wiaService.Status -ne 'Running') {
        Log-Write 'Attempting to start WIA Service...'
        try {
            Start-Service -Name stisvc -ErrorAction Stop
            $wiaService.Refresh()
            Log-Write "Post-Start Status: $($wiaService.Status)"
        } catch {
            Log-Write "Error Starting WIA Service: $($_.Exception.Message)"
        }
    }
} else {
    Log-Write 'Error: WIA Service stisvc is not installed on this system.'
}
Log-Write ''

Log-Write '### 2. WIA COM Object Verification'
try {
    $deviceManager = New-Object -ComObject WIA.DeviceManager
    Log-Write 'WIA COM Object Creation: SUCCESS'
    Log-Write "Registered Devices Count: $($deviceManager.DeviceInfos.Count)"
    
    if ($deviceManager.DeviceInfos.Count -gt 0) {
        for ($i = 1; $i -le $deviceManager.DeviceInfos.Count; $i++) {
            $dev = $deviceManager.DeviceInfos.Item($i)
            $name = $dev.Properties.Item('Name').Value
            $devId = $dev.DeviceID
            Log-Write "Device ID: $devId, Name: $name, Type: $($dev.Type)"
        }
    } else {
        Log-Write 'WIA reports 0 connected scanners.'
    }
} catch {
    Log-Write "Error creating WIA COM object: $($_.Exception.Message)"
}
Log-Write ''

Log-Write '### 3. TWAIN Driver Detection'
$twainPaths = @('C:\Windows\twain_32', 'C:\Windows\twain_64')
$twainCount = 0
foreach ($path in $twainPaths) {
    Log-Write "Checking: $path"
    if (Test-Path $path) {
        $dsFiles = Get-ChildItem -Path $path -Filter '*.ds' -Recurse -ErrorAction SilentlyContinue
        if ($dsFiles) {
            Log-Write 'Found TWAIN Data Sources:'
            foreach ($file in $dsFiles) {
                Log-Write " - $($file.Name) (Path: $($file.FullName))"
                $twainCount++
            }
        } else {
            Log-Write 'No DS files found in directory.'
        }
    } else {
        Log-Write 'Directory does not exist.'
    }
}
Log-Write ''

Log-Write '### 4. Plug-and-Play (PnP) Imaging and Scanner Device Scan'
$pnpQuery = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue
if ($pnpQuery) {
    Log-Write 'Searching PnP devices matching keywords or classes...'
    $scannerPnp = $pnpQuery | Where-Object {
        ($_.Name -and ($_.Name -match 'Scanner|Scan|Epson|Canon|HP|Brother|Fujitsu|Honeywell|Zebra|Kodak|Plustek|Avision|Gemalto|Thales|ARH|Combo|Elyctis|Reader|Document|Passport|QID|Webcam|Camera|Swipe|MRZ|OCR')) -or
        ($_.PNPClass -and ($_.PNPClass -match 'Image|Camera|Scanner|SmartCardReader|Biometric'))
    }
    
    if ($scannerPnp) {
        foreach ($dev in $scannerPnp) {
            Log-Write "Class: $($dev.PNPClass), Name: $($dev.Name), Status: $($dev.Status), DeviceID: $($dev.DeviceID)"
        }
    } else {
        Log-Write 'No matching PnP Imaging, SmartCard, or Scanner devices found.'
    }
} else {
    Log-Write 'Could not run Win32_PnPEntity query.'
}
Log-Write ''

Log-Write '### 5. Universal Serial Bus (USB) Controllers'
$usbControllers = Get-CimInstance Win32_USBController -ErrorAction SilentlyContinue
if ($usbControllers) {
    foreach ($ctrl in $usbControllers) {
        Log-Write "Name: $($ctrl.Name), Status: $($ctrl.Status), ErrorCode: $($ctrl.ConfigManagerErrorCode)"
    }
} else {
    Log-Write 'USB Controller query returned no data.'
}
Log-Write ''

Log-Write '### 6. Watched Folder Status'
$envFile = Join-Path $PSScriptRoot "backend\.env"
$folder = "C:\ScannerOutput"
if (Test-Path $envFile) {
    $lines = Get-Content $envFile
    foreach ($line in $lines) {
        if ($line -match '^SCANNER_FOLDER=(.+)$') {
            $folder = $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
}
Log-Write "Configured Watch Folder: $folder"
if (Test-Path $folder) {
    Log-Write 'Folder status: EXISTS'
    try {
        $testFile = Join-Path $folder "permission_test.tmp"
        "test" | Out-File $testFile -ErrorAction Stop
        Remove-Item $testFile -ErrorAction Stop
        Log-Write 'Write Permissions: OK (Verified)'
    } catch {
        Log-Write "Write Permissions Error: $($_.Exception.Message)"
    }
} else {
    Log-Write 'Folder status: DOES NOT EXIST'
}

Log-Write ''
Log-Write '### 7. Recommendations'
$problems = @()
if ($wiaService -and $wiaService.Status -ne 'Running') {
    $problems += 'WIA Service is stopped. Ensure the launcher ran with administrative permissions to start it.'
}
if ($twainCount -eq 0 -and $deviceManager -and $deviceManager.DeviceInfos.Count -eq 0 -and -not $scannerPnp) {
    $problems += 'No hardware scanner detected on WIA, TWAIN, or PnP. Connect the USB cable, power it on, and install the manufacturer driver.'
}
if (-not (Test-Path $folder)) {
    $problems += "Watch folder ($folder) is missing. Create it or update settings in the app."
}

if ($problems.Count -gt 0) {
    foreach ($p in $problems) {
        Log-Write " - ERROR: $p"
    }
} else {
    Log-Write 'System checks passed. If your hardware is still not scanning, check power and software settings.'
}

$log | Out-File $logFile -Encoding utf8
