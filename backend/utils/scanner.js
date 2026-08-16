const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Run a PowerShell script and return output without command line length limits
 */
const runPowerShell = (script) => {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-Command', '-'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        return reject(new Error(stderr || `PowerShell exited with code ${code}`));
      }
      resolve(stdout.trim());
    });

    child.stdin.write(script);
    child.stdin.end();
  });
};

/**
 * List all available WIA & PnP scanner devices on Windows (USB, Network IP, MFP, Imaging)
 */
const listScanners = async () => {
  const script = `
    $ErrorActionPreference = 'SilentlyContinue'
    $devices = @()
    
    # 1. Ensure WIA service (stisvc) and Smart Card service (SCardSvr) are running
    $stisvc = Get-Service -Name stisvc -ErrorAction SilentlyContinue
    if ($stisvc -and $stisvc.Status -ne 'Running') {
        try { Start-Service -Name stisvc -ErrorAction SilentlyContinue } catch {}
        # Refetch status to verify if start succeeded (requires Admin privileges)
        $stisvc = Get-Service -Name stisvc -ErrorAction SilentlyContinue
        if ($stisvc.Status -ne 'Running') {
            $devices += [PSCustomObject]@{
                id = "warning_wia_stopped"
                name = "⚠️ WARNING: WIA Scanner Service is STOPPED! Run app as Administrator to enable."
                type = "warning"
            }
        }
    }
    $scSvr = Get-Service -Name SCardSvr -ErrorAction SilentlyContinue
    if ($scSvr -and $scSvr.Status -ne 'Running') {
        try { Start-Service -Name SCardSvr -ErrorAction SilentlyContinue } catch {}
        # Refetch status to verify if start succeeded (requires Admin privileges)
        $scSvr = Get-Service -Name SCardSvr -ErrorAction SilentlyContinue
        if ($scSvr.Status -ne 'Running') {
            $devices += [PSCustomObject]@{
                id = "warning_scardsvr_stopped"
                name = "⚠️ WARNING: Smart Card Service is STOPPED! Start it to read National IDs."
                type = "warning"
            }
        }
    }
    
    # 2. Enumerate WIA Devices (all types: Scanner=1, Unspecified=0, Video=2, Camera=3)
    try {
      $deviceManager = New-Object -ComObject WIA.DeviceManager
      for ($i = 1; $i -le $deviceManager.DeviceInfos.Count; $i++) {
          $dev = $deviceManager.DeviceInfos.Item($i)
          $name = $dev.Properties.Item("Name").Value
          $devId = $dev.DeviceID
          if ($name -and $devId) {
              $typeStr = switch ($dev.Type) {
                  1 { "WIA Hardware Scanner" }
                  0 { "Network / Unspecified WIA Device" }
                  2 { "Video / Camera Scanner" }
                  3 { "Digital Camera Scanner" }
                  default { "WIA Device" }
              }
              $devices += [PSCustomObject]@{
                  id = $devId
                  name = "$name ($typeStr)"
                  type = "wia"
              }
          }
      }
    } catch {
        $devices += [PSCustomObject]@{
            id = "warning_wia_dll_error"
            name = "⚠️ WARNING: WIA COM API failed. Re-register wiaaut.dll."
            type = "warning"
        }
    }

    # 3. Enumerate Windows PnP & Network Imaging/Scanner Devices (Win32_PnPEntity / Get-CimInstance)
    try {
      $pnpDevs = Get-CimInstance Win32_PnPEntity
      $matches = $pnpDevs | Where-Object { 
          ($PSItem.Name -and ($PSItem.Name -match 'Scanner|Scan|Epson|Canon|HP|Brother|Fujitsu|Honeywell|Zebra|Kodak|Plustek|Avision|Gemalto|Thales|ARH|Combo|Elyctis|Reader|Document|Passport|QID|Webcam|Camera|Swipe|MRZ|OCR|OpticSlim|SecureScan|DocAction|Ambir|Regula|Desko|3M|Ricoh|Xerox')) -or 
          ($PSItem.PNPClass -and ($PSItem.PNPClass -match 'Image|Camera|Scanner|SmartCardReader|Biometric|WSDScanDevice')) -or
          ($PSItem.ClassGuid -and ($PSItem.ClassGuid -eq '{50dd5230-ba8a-11d1-bf5d-0000f805f530}')) -or
          ($PSItem.DeviceID -and ($PSItem.DeviceID -match 'VID_07B3|VID_0A69|VID_0A5C|VID_08C3|VID_0C2E|VID_05E0|VID_2A1F|VID_072F|VID_076B|VID_08E6|VID_04E6|VID_0B0C|VID_23E8|VID_2B50|VID_24BA|VID_04A9|VID_04B8|VID_03F0|VID_04F9|VID_04C5|VID_0638|VID_040A|VID_0924|VID_20A0|VID_0483|VID_1163|VID_197B|VID_0403|VID_0982'))
      } | Where-Object {
          $PSItem.Name -notmatch 'Mouse|Keyboard|Touchpad|Battery|Bluetooth|Audio|Speaker|Microphone|Print to PDF|Print Queue|Fax|Root Print'
      }
      foreach ($pnp in $matches) {
          if ($pnp.Name -and $pnp.DeviceID) {
              # Check if not already in list
              $already = $devices | Where-Object { $_.id -eq $pnp.DeviceID -or $_.name -like "*$($pnp.Name)*" }
              if (-not $already) {
                  $devices += [PSCustomObject]@{
                      id = $pnp.DeviceID
                      name = "$($pnp.Name) (PnP / USB Reader)"
                      type = "pnp"
                  }
              }
          }
      }
    } catch {}

    # 4. Enumerate TWAIN Drivers (TWAIN Data Sources)
    $twainPaths = @("C:\\Windows\\twain_32", "C:\\Windows\\twain_64")
    foreach ($path in $twainPaths) {
      if (Test-Path $path) {
        Get-ChildItem -Path $path -Filter "*.ds" -Recurse | ForEach-Object {
          $dsName = $_.BaseName
          $already = $devices | Where-Object { $_.name -like "*$dsName*" }
          if (-not $already) {
            $devices += [PSCustomObject]@{
              id = "twain_$dsName"
              name = "$dsName (TWAIN Driver)"
              type = "twain"
            }
          }
        }
      }
    }

    if ($devices.Count -eq 0) {
        Write-Output "[]"
    } else {
        @($devices) | ConvertTo-Json -Compress
    }
  `;
  try {
    const output = await runPowerShell(script);
    if (!output || output.trim() === '[]') return [];
    const jsonMatch = output.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!jsonMatch) {
      console.warn('listScanners: No JSON array found in PowerShell output:', output);
      return [];
    }
    const parsed = JSON.parse(jsonMatch[1]);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.error('listScanners error:', err.message);
    return [];
  }
};

/**
 * Sanitize device ID to prevent PowerShell command injection
 */
const sanitizeDeviceId = (id) => {
  if (typeof id !== 'string') return '';
  return id.replace(/[\$`;&|]/g, '').trim();
};

/**
 * Trigger WIA scanner device to scan and save image
 */
const triggerScan = async (deviceId, outputPath) => {
  if (deviceId && typeof deviceId === 'string' && deviceId.startsWith('twain_')) {
    throw new Error('TWAIN scanner detected. Please perform the scan using your scanner\'s native application or place the scanned file in your designated scanner folder (C:\\ScannerOutput).');
  }

  const destDir = path.dirname(outputPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const safeDeviceId = sanitizeDeviceId(deviceId);

  const script = `
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.IO
    
    # 1. Ensure WIA service (stisvc) and Smart Card service (SCardSvr) are running
    $stisvc = Get-Service -Name stisvc -ErrorAction SilentlyContinue
    if ($stisvc -and $stisvc.Status -ne 'Running') {
        try { Start-Service -Name stisvc -ErrorAction SilentlyContinue } catch {}
    }
    $scSvr = Get-Service -Name SCardSvr -ErrorAction SilentlyContinue
    if ($scSvr -and $scSvr.Status -ne 'Running') {
        try { Start-Service -Name SCardSvr -ErrorAction SilentlyContinue } catch {}
    }

    $deviceManager = New-Object -ComObject WIA.DeviceManager
    $scanner = $null
    
    $targetId = "${safeDeviceId.replace(/"/g, '`"')}"
    
    # 2. Search WIA devices matching target ID or Name (exact or wildcard match for network scanner IDs)
    if ($targetId) {
        for ($i = 1; $i -le $deviceManager.DeviceInfos.Count; $i++) {
            $dev = $deviceManager.DeviceInfos.Item($i)
            $devName = $dev.Properties.Item("Name").Value
            if ($dev.DeviceID -eq $targetId -or $devName -eq $targetId -or $dev.DeviceID -like "*$targetId*" -or $targetId -like "*$($dev.DeviceID)*" -or $devName -like "*$targetId*") {
                try {
                    $scanner = $dev.Connect()
                    if ($scanner) { break }
                } catch {}
            }
        }
    }
    
    # 3. Fallback to connecting to any available WIA scanner or imaging device
    if (-not $scanner) {
        for ($i = 1; $i -le $deviceManager.DeviceInfos.Count; $i++) {
            $dev = $deviceManager.DeviceInfos.Item($i)
            try {
                $scanner = $dev.Connect()
                if ($scanner) { break }
            } catch {}
        }
    }
    
    if (-not $scanner) {
        throw "No physical WIA scanner device could be connected. Please verify scanner connection, power, and driver installation."
    }
    
    if ($scanner.Items.Count -eq 0) {
        throw "Connected WIA device exposes no items to scan. Ensure the scanner flatbed/ADF is loaded and not busy."
    }
    $item = $scanner.Items.Item(1)
    
    # Configure high-accuracy passport/ID scanning properties (Color, 300 DPI)
    try {
        # WIA_IPS_CUR_INTENT (6146): 1 = Color, 2 = Grayscale
        $item.Properties.Item("6146").Value = 1
    } catch {}
    try {
        # WIA_IPS_XRES (6147): 300 DPI
        $item.Properties.Item("6147").Value = 300
    } catch {}
    try {
        # WIA_IPS_YRES (6148): 300 DPI
        $item.Properties.Item("6148").Value = 300
    } catch {}
    
    # Try JPEG, PNG, BMP, TIFF, and native format transfers sequentially to support all hardware drivers
    $image = $null
    $formats = @(
        "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}", # JPEG
        "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}", # PNG
        "{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}", # BMP
        "{B96B3CB1-0728-11D3-9D7B-0000F81EF32E}"  # TIFF
    )
    foreach ($fmt in $formats) {
        try {
            $image = $item.Transfer($fmt)
            if ($image) { break }
        } catch {}
    }
    
    if (-not $image) {
        try {
            $image = $item.Transfer()
        } catch {}
    }
    
    if (-not $image) {
        throw "Failed to transfer image from scanner device. The driver does not support standard WIA JPEG, PNG, BMP, or TIFF formats."
    }
    
    $outputPath = "${outputPath.replace(/\\/g, '\\\\')}"
    if (Test-Path $outputPath) {
        Remove-Item $outputPath -Force
    }
    $image.SaveFile($outputPath)
    Write-Output "SUCCESS"
  `;

  return await runPowerShell(script);
};

/**
 * Open native Windows Folder Browser dialog
 */
const browseFolder = async () => {
  const script = `
    Add-Type -AssemblyName System.Windows.Forms
    $f = New-Object System.Windows.Forms.FolderBrowserDialog
    $f.Description = 'Select Scanner Output Folder'
    $f.ShowNewFolderButton = $true
    $result = $f.ShowDialog()
    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        $f.SelectedPath
    } else {
        Write-Output "CANCELLED"
    }
  `;
  const result = await runPowerShell(script);
  if (result === 'CANCELLED') return null;
  return result;
};

module.exports = {
  listScanners,
  triggerScan,
  browseFolder
};
