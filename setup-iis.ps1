# Ensure TLS 1.2 is used for downloads
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Self-elevate the script to run as Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "=========================================================" -ForegroundColor Yellow
    Write-Host "  Requesting Administrative Privileges..." -ForegroundColor Yellow
    Write-Host "=========================================================" -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $PSCommandPath -Verb RunAs
    Exit
}

Clear-Host
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Guest Management Portal (GMP) - SECURE SETUP INSTALLER  " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

$attempts = 0
$authorized = $false
$expectedHash = "E5D7B90FA60946D1A13977EF0C9053635A04FC4F9DD3892BB46BDBF81C38809D"

while ($attempts -lt 3 -and -not $authorized) {
    $securePass = Read-Host -Prompt "Enter GMP Setup Installation Password" -AsSecureString
    if ($securePass) {
        $inputPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass))
        
        # Calculate SHA256 hash of input
        $passBytes = [System.Text.Encoding]::UTF8.GetBytes($inputPassword)
        $hashBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash($passBytes)
        $inputHash = ($hashBytes | ForEach-Object { $_.ToString("X2") }) -join ""
        
        if ($inputHash -eq $expectedHash) {
            $authorized = $true
        }
        else {
            $attempts++
            Write-Warning "Incorrect Setup Password! Attempt ($attempts of 3)"
        }
    }
    else {
        $attempts++
        Write-Warning "Password cannot be empty. Attempt ($attempts of 3)"
    }
}

if (-not $authorized) {
    Write-Error "Unauthorized installation attempt. Exiting."
    Start-Sleep -Seconds 3
    Exit
}

Write-Host "Access Granted. Beginning installation..." -ForegroundColor Green
Write-Host ""

$AppRoot = $PSScriptRoot
Write-Host "Application Directory Detected: $AppRoot" -ForegroundColor Yellow

# Detect system IPv4 address
$systemIP = (Get-NetIPAddress -AddressFamily IPv4 -Type Unicast -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" } | Select-Object -First 1).IPAddress
if (-not $systemIP) { $systemIP = "127.0.0.1" }
Write-Host "System IPv4 Address Detected: $systemIP" -ForegroundColor Yellow

Start-Transcript -Path "$AppRoot\setup-log.txt" -Force

# 0. Quick Re-run / Verification Check
$alreadyInstalled = $false
$websiteRunning = $false
$backendRunning = $false
$dbConnected = $false
$localUrl = "http://localhost/"

# Check IIS site status
$appcmd = "$env:SystemRoot\system32\inetsrv\appcmd.exe"
if (Test-Path $appcmd) {
    $siteLine = & $appcmd list site /name:"GuestManagementPortal" 2>$null
    if ($siteLine -match 'state:Started') {
        $websiteRunning = $true
        if ($siteLine -match 'bindings:http/\*:([^:]+):') {
            $boundPort = $Matches[1]
            $localUrl = "http://localhost:$boundPort/"
            if ($boundPort -eq "80") { $localUrl = "http://localhost/" }
        }
    }
}

# Check PM2 process status
$pm2Check = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Check) {
    $pm2List = & pm2 list 2>$null
    if ($pm2List -match 'gmp-backend-api' -and $pm2List -match 'online') {
        $backendRunning = $true
    }
}

# Check database connection using existing configuration
$envPath = Join-Path $AppRoot "backend\.env"
if (Test-Path $envPath) {
    $existingContent = Get-Content $envPath
    $dbUser = "root"; $dbPass = ""; $dbName = "guest_management_db"; $dbHost = "127.0.0.1"; $dbPort = "3306"
    foreach ($line in $existingContent) {
        if ($line -like "DB_USER=*") { $dbUser = $line.Substring(8).Trim() }
        if ($line -like "DB_PASS=*") { $dbPass = $line.Substring(8).Trim() }
        if ($line -like "DB_NAME=*") { $dbName = $line.Substring(8).Trim() }
        if ($line -like "DB_HOST=*") { $dbHost = $line.Substring(8).Trim() }
        if ($line -like "DB_PORT=*") { $dbPort = $line.Substring(8).Trim() }
    }
    
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck) {
        $testResult = & node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host: '$dbHost', port: '$dbPort', user: '$dbUser', password: '$dbPass'}).then(conn => { conn.end(); process.exit(0); }).catch(err => { process.exit(1); })" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dbConnected = $true
        }
    }
}

# Check if URL Rewrite and ARR are registered and installed
$rewriteRegisteredForCheck = $false
$arrRegisteredForCheck = $false
try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    if (Get-Command Get-WebGlobalModule -ErrorAction SilentlyContinue) {
        if (Get-WebGlobalModule -Name "RewriteModule" -ErrorAction SilentlyContinue) {
            $rewriteRegisteredForCheck = $true
        }
        if (Get-WebGlobalModule -Name "ApplicationRequestRouting" -ErrorAction SilentlyContinue) {
            $arrRegisteredForCheck = $true
        }
    }
} catch {}

$rewriteDllPathForCheck = "$env:SystemRoot\system32\inetsrv\rewrite.dll"
$arrDllPathForCheck = "C:\Program Files\IIS\Application Request Routing\requestRouter.dll"
$arrDllPathAlternativeForCheck = "$env:SystemRoot\system32\inetsrv\requestRouter.dll"

$rewriteInstalledForCheck = (Test-Path $rewriteDllPathForCheck) -and $rewriteRegisteredForCheck
$arrInstalledForCheck = ((Test-Path $arrDllPathForCheck) -or (Test-Path $arrDllPathAlternativeForCheck)) -and $arrRegisteredForCheck

if ($websiteRunning -and $backendRunning -and $dbConnected -and $rewriteInstalledForCheck -and $arrInstalledForCheck) {
    $alreadyInstalled = $true
}
else {
    $alreadyInstalled = $false
}

if ($alreadyInstalled) {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "  Guest Management Portal (GMP) is already running!      " -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "  - IIS Web Server is online.                            " -ForegroundColor Gray
    Write-Host "  - Backend API service is online.                       " -ForegroundColor Gray
    Write-Host "  - Database connection is healthy.                      " -ForegroundColor Gray
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "Opening web portal in browser ($localUrl)..." -ForegroundColor Gray
    Start-Process $localUrl
    try { Stop-Transcript } catch {}
    Start-Sleep -Seconds 2
    Exit
}

# 1. Enable IIS Role and Features
Write-Host "[1/7] Enabling IIS Web Server Role and Features..." -ForegroundColor Green
try {
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-StaticContent, IIS-DefaultDocument, IIS-HttpErrors, IIS-HttpRedirect, IIS-RequestFiltering, IIS-ManagementConsole, IIS-ManagementScriptingTools -All -NoRestart
    Write-Host "IIS role and features successfully enabled." -ForegroundColor Gray
}
catch {
    Write-Warning "Could not enable IIS features: $_"
}

# 1.4. Check and Install Node.js
Write-Host "`n[1.4/7] Detecting Node.js..." -ForegroundColor Green
$nodeInstalled = $false
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCheck) {
    $nodeVersion = & node -v
    Write-Host "Node.js detected ($nodeVersion)." -ForegroundColor Gray
    $nodeInstalled = $true
}
else {
    $defaultNodePath = "C:\Program Files\nodejs\node.exe"
    if (Test-Path $defaultNodePath) {
        Write-Host "Node.js executable found at '$defaultNodePath'." -ForegroundColor Gray
        $nodeInstalled = $true
        $env:Path += ";C:\Program Files\nodejs"
    }
}
if (-not $nodeInstalled) {
    Write-Warning "Node.js is required but was not detected on this system."
    $installChoice = Read-Host -Prompt "Would you like to install Node.js (LTS) now? (Y/n)"
    if ([string]::IsNullOrWhiteSpace($installChoice) -or $installChoice -eq 'y' -or $installChoice -eq 'Y') {
        $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetCheck) {
            Write-Host "Installing Node.js via winget..." -ForegroundColor Gray
            $proc = Start-Process winget -ArgumentList "install OpenJS.NodeJS --accept-source-agreements --accept-package-agreements" -Wait -PassThru
            if ($proc.ExitCode -eq 0) {
                Write-Host "Node.js installed successfully via winget." -ForegroundColor Gray
                $nodeInstalled = $true
            }
            else {
                Write-Warning "winget Node.js installation exited with code $($proc.ExitCode)."
            }
        }
        if (-not $nodeInstalled) {
            Write-Host "Downloading Node.js LTS Installer..." -ForegroundColor Gray
            $nodeMsi = Join-Path $env:TEMP "node-lts.msi"
            $nodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
            try {
                Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi
                Write-Host "Installing Node.js silently... This may take a minute." -ForegroundColor Yellow
                $proc = Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn /norestart" -Wait -PassThru
                if ($proc.ExitCode -eq 0) {
                    $nodeInstalled = $true
                    Write-Host "Node.js installed successfully." -ForegroundColor Gray
                }
                else {
                    Write-Warning "Node.js Installer exited with code $($proc.ExitCode)."
                }
            }
            catch {
                Write-Error "Failed to download or run Node.js Installer: $_"
            }
        }
        if ($nodeInstalled) {
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
                $env:Path += ";C:\Program Files\nodejs"
            }
            Write-Host "Node.js is now ready." -ForegroundColor Green
        }
    }
}
else {
    Write-Host "Node.js is already installed and ready." -ForegroundColor Gray
}

# 1.5. Check and Install MySQL
Write-Host "`n[1.5/7] Detecting MySQL Server..." -ForegroundColor Green
$mysqlInstalled = $false
$script:mysqlType = "Not Installed / External"
$script:mysqlPath = "N/A"

$mysqlService = Get-Service | Where-Object { $_.Name -like "*mysql*" -or $_.DisplayName -like "*mysql*" }
if ($mysqlService) {
    Write-Host "MySQL Service '$($mysqlService.Name)' detected (Status: $($mysqlService.Status))." -ForegroundColor Gray
    $mysqlInstalled = $true
    $script:mysqlType = "Windows Service ($($mysqlService.Name))"
    $script:mysqlPath = "Managed by Windows Service Manager"
}
else {
    $mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
    if ($mysqlCmd) {
        Write-Host "mysql command detected in system PATH." -ForegroundColor Gray
        $mysqlInstalled = $true
        $script:mysqlType = "System PATH MySQL"
        $script:mysqlPath = $mysqlCmd.Source
    }
    else {
        # Check default paths (including XAMPP and WAMP)
        $defaultPaths = @(
            "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
            "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
            "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
            "C:\xampp\mysql\bin\mysql.exe"
        )
        # Check WAMP paths (using wildcards)
        if (Test-Path "C:\wamp64\bin\mysql") {
            $defaultPaths += Get-ChildItem "C:\wamp64\bin\mysql\mysql*\bin\mysql.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
        }
        if (Test-Path "C:\wamp\bin\mysql") {
            $defaultPaths += Get-ChildItem "C:\wamp\bin\mysql\mysql*\bin\mysql.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
        }

        foreach ($path in $defaultPaths) {
            if (Test-Path $path) {
                Write-Host "MySQL Server executable found at '$path'." -ForegroundColor Gray
                $mysqlInstalled = $true
                $script:mysqlPath = $path
                if ($path -like "*xampp*") {
                    $script:mysqlType = "XAMPP MySQL Server"
                }
                elseif ($path -like "*wamp*") {
                    $script:mysqlType = "WAMP MySQL Server"
                }
                else {
                    $script:mysqlType = "Standard Local MySQL Server"
                }
                break
            }
        }
    }
}

if (-not $mysqlInstalled) {
    Write-Warning "MySQL Server was not detected locally on this system (checked standard paths, XAMPP, and WAMP)."
    Write-Host "NOTE: If you are using a custom/remote database server (managed via MySQL Workbench or otherwise)," -ForegroundColor Yellow
    Write-Host "you can skip this installation and simply enter your connection details in Phase 4." -ForegroundColor Yellow
    $installChoice = Read-Host -Prompt "Would you like to install MySQL Server locally now? (Y/n)"
    if ([string]::IsNullOrWhiteSpace($installChoice) -or $installChoice -eq 'y' -or $installChoice -eq 'Y') {
        # Check if winget is available
        $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetCheck) {
            Write-Host "Installing MySQL Server via winget..." -ForegroundColor Gray
            $proc = Start-Process winget -ArgumentList "install Oracle.MySQL --accept-source-agreements --accept-package-agreements" -Wait -PassThru
            if ($proc.ExitCode -eq 0) {
                Write-Host "MySQL Server installed successfully via winget." -ForegroundColor Gray
                $mysqlInstalled = $true
                $script:mysqlType = "Standard Local MySQL Server (Installed via winget)"
                $script:mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
            }
            else {
                Write-Warning "winget installation exited with code $($proc.ExitCode)."
            }
        }
        
        # Fallback if winget is missing or installation failed
        if (-not $mysqlInstalled) {
            Write-Host "Downloading MySQL Community Web Installer..." -ForegroundColor Gray
            $mysqlInstallerMsi = Join-Path $env:TEMP "mysql-installer.msi"
            $mysqlInstallerUrl = "https://dev.mysql.com/get/Downloads/MySQLInstaller/mysql-installer-web-community-8.0.34.0.msi"
            try {
                Invoke-WebRequest -Uri $mysqlInstallerUrl -OutFile $mysqlInstallerMsi
                Write-Host "Launching MySQL Installer... Please follow the installation wizard to set your root password." -ForegroundColor Yellow
                $proc = Start-Process msiexec.exe -ArgumentList "/i `"$mysqlInstallerMsi`"" -Wait -PassThru
                if ($proc.ExitCode -eq 0) {
                    $mysqlInstalled = $true
                    $script:mysqlType = "Standard Local MySQL Server (Installed via MSI)"
                    $script:mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
                }
                else {
                    Write-Warning "MySQL Installer exited with code $($proc.ExitCode)."
                }
            }
            catch {
                Write-Error "Failed to download or run MySQL Installer: $_"
            }
        }
        
        # Check for service again and start it if stopped
        Start-Sleep -Seconds 5
        $mysqlService = Get-Service | Where-Object { $_.Name -like "*mysql*" -or $_.DisplayName -like "*mysql*" }
        if ($mysqlService) {
            if ($mysqlService.Status -ne 'Running') {
                Write-Host "Starting MySQL Service..." -ForegroundColor Gray
                Start-Service -Name $mysqlService.Name -ErrorAction SilentlyContinue
            }
            Write-Host "MySQL Server is ready." -ForegroundColor Gray
        }
        else {
            Write-Warning "MySQL Service not found after installation. You may need to configure it manually."
        }
    }
    else {
        Write-Host "MySQL installation skipped by user. Please ensure MySQL is running before connecting." -ForegroundColor Yellow
    }
}
else {
    # If service is installed but stopped, start it
    if ($mysqlService -and $mysqlService.Status -ne 'Running') {
        Write-Host "MySQL service is stopped. Attempting to start service '$($mysqlService.Name)'..." -ForegroundColor Gray
        Start-Service -Name $mysqlService.Name -ErrorAction SilentlyContinue
    }
}

# 1.6. Check and Install MySQL Workbench
Write-Host "`n[1.6/7] Detecting MySQL Workbench..." -ForegroundColor Green
$workbenchInstalled = $false
$workbenchPaths = @(
    "C:\Program Files\MySQL\MySQL Workbench 8.0 CE\MySQLWorkbench.exe",
    "C:\Program Files\MySQL\MySQL Workbench 8.0\MySQLWorkbench.exe",
    "C:\Program Files\MySQL\MySQL Workbench 8.4\MySQLWorkbench.exe"
)
foreach ($path in $workbenchPaths) {
    if (Test-Path $path) {
        $workbenchInstalled = $true
        Write-Host "MySQL Workbench found at '$path'." -ForegroundColor Gray
        break
    }
}
if (-not $workbenchInstalled) {
    $regCheck = Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "*MySQL Workbench*" }
    if ($regCheck) {
        $workbenchInstalled = $true
        Write-Host "MySQL Workbench detected via Registry." -ForegroundColor Gray
    }
}
if (-not $workbenchInstalled) {
    Write-Warning "MySQL Workbench is not detected on this system."
    $installChoice = Read-Host -Prompt "Would you like to install MySQL Workbench now? (Y/n)"
    if ([string]::IsNullOrWhiteSpace($installChoice) -or $installChoice -eq 'y' -or $installChoice -eq 'Y') {
        $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetCheck) {
            Write-Host "Installing MySQL Workbench via winget..." -ForegroundColor Gray
            $proc = Start-Process winget -ArgumentList "install Oracle.MySQLWorkbench --accept-source-agreements --accept-package-agreements" -Wait -PassThru
            if ($proc.ExitCode -eq 0) {
                Write-Host "MySQL Workbench installed successfully via winget." -ForegroundColor Gray
                $workbenchInstalled = $true
            }
            else {
                Write-Warning "winget Workbench installation exited with code $($proc.ExitCode)."
            }
        }
        if (-not $workbenchInstalled) {
            Write-Host "Downloading MySQL Workbench Installer..." -ForegroundColor Gray
            $wbInstallerMsi = Join-Path $env:TEMP "mysql-workbench-installer.msi"
            $wbInstallerUrl = "https://dev.mysql.com/get/Downloads/MySQLGUIs/mysql-workbench-community-8.0.34-winx64.msi"
            try {
                Invoke-WebRequest -Uri $wbInstallerUrl -OutFile $wbInstallerMsi
                Write-Host "Launching MySQL Workbench Installer... Please follow the installation wizard." -ForegroundColor Yellow
                $proc = Start-Process msiexec.exe -ArgumentList "/i `"$wbInstallerMsi`"" -Wait -PassThru
                if ($proc.ExitCode -eq 0) {
                    $workbenchInstalled = $true
                    Write-Host "MySQL Workbench installed successfully." -ForegroundColor Gray
                }
                else {
                    Write-Warning "MySQL Workbench Installer exited with code $($proc.ExitCode)."
                }
            }
            catch {
                Write-Error "Failed to download or run MySQL Workbench Installer: $_"
            }
        }
    }
}
else {
    Write-Host "MySQL Workbench is already installed and ready." -ForegroundColor Gray
}

# 2. Download and install URL Rewrite
Write-Host "`n[2/7] Installing IIS URL Rewrite Module..." -ForegroundColor Green
$rewriteDllPath = "$env:SystemRoot\system32\inetsrv\rewrite.dll"
$rewriteRegistered = $false
try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    if (Get-Command Get-WebGlobalModule -ErrorAction SilentlyContinue) {
        if (Get-WebGlobalModule -Name "RewriteModule" -ErrorAction SilentlyContinue) {
            $rewriteRegistered = $true
        }
    }
} catch {}

if ((Test-Path $rewriteDllPath) -and $rewriteRegistered) {
    Write-Host "URL Rewrite Module is already installed and registered in IIS." -ForegroundColor Gray
}
else {
    $rewriteInstalled = $false
    # Try winget first
    $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCheck) {
        Write-Host "Uninstalling any conflicting/existing URL Rewrite package via winget..." -ForegroundColor Gray
        Start-Process winget -ArgumentList "uninstall Microsoft.IIS.URLRewrite --accept-source-agreements" -Wait -PassThru -NoNewWindow
        
        Write-Host "Installing URL Rewrite via winget..." -ForegroundColor Gray
        $proc = Start-Process winget -ArgumentList "install Microsoft.IIS.URLRewrite --accept-source-agreements --accept-package-agreements" -Wait -PassThru -NoNewWindow
        if ($proc.ExitCode -eq 0) {
            $rewriteInstalled = $true
            Write-Host "URL Rewrite module installed successfully via winget." -ForegroundColor Gray
        }
        else {
            Write-Warning "winget URL Rewrite installation failed with exit code $($proc.ExitCode)."
        }
    }
    
    if (-not $rewriteInstalled) {
        $rewriteMsi = Join-Path $env:TEMP "rewrite_amd64.msi"
        $urlRewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
        try {
            Write-Host "Downloading URL Rewrite Installer..." -ForegroundColor Gray
            Invoke-WebRequest -Uri $urlRewriteUrl -OutFile $rewriteMsi
            Write-Host "Running silent installation..." -ForegroundColor Gray
            $proc = Start-Process msiexec.exe -ArgumentList "/i `"$rewriteMsi`" /qn /norestart" -Wait -PassThru
            if ($proc.ExitCode -eq 0) {
                Write-Host "URL Rewrite module installed successfully." -ForegroundColor Gray
            }
            else {
                Write-Warning "URL Rewrite installer exited with code $($proc.ExitCode)"
            }
        }
        catch {
            Write-Warning "Failed to install URL Rewrite Module: $_"
        }
    }
}

# 3. Download and install ARR
Write-Host "`n[3/7] Installing Application Request Routing (ARR 3.0)..." -ForegroundColor Green
$arrDllPath = "C:\Program Files\IIS\Application Request Routing\requestRouter.dll"
$arrDllPathAlternative = "$env:SystemRoot\system32\inetsrv\requestRouter.dll"
$arrRegistered = $false
try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    if (Get-Command Get-WebGlobalModule -ErrorAction SilentlyContinue) {
        if (Get-WebGlobalModule -Name "ApplicationRequestRouting" -ErrorAction SilentlyContinue) {
            $arrRegistered = $true
        }
    }
} catch {}

if (((Test-Path $arrDllPath) -or (Test-Path $arrDllPathAlternative)) -and $arrRegistered) {
    Write-Host "Application Request Routing (ARR 3.0) is already installed and registered in IIS." -ForegroundColor Gray
}
else {
    $arrInstalled = $false
    # Try winget first
    $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCheck) {
        Write-Host "Uninstalling any existing/ghost ARR package via winget to prevent conflicts..." -ForegroundColor Gray
        # We run uninstall first to clear any conflicting packages/registry keys
        $uninstProc = Start-Process winget -ArgumentList "uninstall Microsoft.IIS.ApplicationRequestRouting --accept-source-agreements" -Wait -PassThru -NoNewWindow
        
        Write-Host "Installing ARR via winget..." -ForegroundColor Gray
        $proc = Start-Process winget -ArgumentList "install Microsoft.IIS.ApplicationRequestRouting --accept-source-agreements --accept-package-agreements" -Wait -PassThru -NoNewWindow
        if ($proc.ExitCode -eq 0) {
            $arrInstalled = $true
            Write-Host "ARR module installed successfully via winget." -ForegroundColor Gray
        }
        else {
            Write-Warning "winget installation failed with exit code $($proc.ExitCode)."
        }
    }
    
    if (-not $arrInstalled) {
        $arrMsi = Join-Path $env:TEMP "requestRouter_amd64.msi"
        $arrUrl = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi"

        try {
            Write-Host "Downloading Application Request Routing (ARR 3.0) direct installer..." -ForegroundColor Gray
            Invoke-WebRequest -Uri $arrUrl -OutFile $arrMsi
            
            Write-Host "Installing Application Request Routing..." -ForegroundColor Gray
            $proc = Start-Process msiexec.exe -ArgumentList "/i `"$arrMsi`" /qn /norestart" -Wait -PassThru
            if ($proc.ExitCode -eq 0) {
                $arrInstalled = $true
                Write-Host "ARR module installed successfully." -ForegroundColor Gray
            }
            else {
                Write-Warning "ARR installer exited with code $($proc.ExitCode)"
            }
        }
        catch {
            Write-Warning "Failed to install ARR via manual download: $_"
        }
    }
}


# 4. Enable ARR Proxy Settings
Write-Host "`n[4/7] Enabling Reverse Proxy configuration in IIS ARR Cache..." -ForegroundColor Green
$appcmd = "$env:SystemRoot\system32\inetsrv\appcmd.exe"
if (Test-Path $appcmd) {
    try {
        & $appcmd set config -section:system.webServer/proxy /enabled:"True" /commit:apphost
        Write-Host "ARR Proxy Cache successfully enabled." -ForegroundColor Gray
    }
    catch {
        Write-Warning "Failed to enable proxy cache via appcmd: $_"
    }
}
else {
    Write-Warning "appcmd.exe was not found. Please ensure IIS is fully installed."
}

# 4.5. Database Env Configuration
Write-Host "`n[4.5/7] Configuring Database Connection Settings (.env)..." -ForegroundColor Green
$envPath = Join-Path $AppRoot "backend\.env"
$shouldPrompt = $true

if (Test-Path $envPath) {
    $confirm = 'n'
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        $shouldPrompt = $false
        Write-Host "Keeping existing .env settings." -ForegroundColor Gray
        
        # Parse database variables from the existing .env file
        $existingContent = Get-Content $envPath
        foreach ($line in $existingContent) {
            if ($line -like "DB_USER=*") { $dbUser = $line.Substring(8).Trim() }
            if ($line -like "DB_PASS=*") { $dbPass = $line.Substring(8).Trim() }
            if ($line -like "DB_NAME=*") { $dbName = $line.Substring(8).Trim() }
            if ($line -like "DB_HOST=*") { $dbHost = $line.Substring(8).Trim() }
            if ($line -like "DB_PORT=*") { $dbPort = $line.Substring(8).Trim() }
        }
    }
}

if ($shouldPrompt) {
    $dbUser = Read-Host -Prompt "Enter MySQL Username [default: root]"
    if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "root" }
    
    $dbPass = Read-Host -Prompt "Enter MySQL Password [default: empty]"
    
    $dbName = Read-Host -Prompt "Enter MySQL Database Name [default: guest_management_db]"
    if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "guest_management_db" }

    $dbHost = Read-Host -Prompt "Enter MySQL Host [default: 127.0.0.1]"
    if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "127.0.0.1" }

    $dbPort = Read-Host -Prompt "Enter MySQL Port [default: 3306]"
    if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "3306" }

    $jwtSecret = "gmp_jwt_s3cr3t_k3y_2024_change_me_in_production"
    $recoveryCode = "FST_RECOVERY_2026"
    
    # Preserve JWT_SECRET and RECOVERY_CODE if .env already exists
    if (Test-Path $envPath) {
        $existingContent = Get-Content $envPath
        foreach ($line in $existingContent) {
            if ($line -like "JWT_SECRET=*") { $jwtSecret = $line.Substring(11) }
            if ($line -like "RECOVERY_CODE=*") { $recoveryCode = $line.Substring(14) }
        }
    }

    $envContent = "PORT=5000`r`n" +
    "DB_HOST=$dbHost`r`n" +
    "DB_PORT=$dbPort`r`n" +
    "DB_USER=$dbUser`r`n" +
    "DB_PASS=$dbPass`r`n" +
    "DB_NAME=$dbName`r`n" +
    "JWT_SECRET=$jwtSecret`r`n" +
    "RECOVERY_CODE=$recoveryCode"
    Set-Content -Path $envPath -Value $envContent
    Write-Host "Database settings successfully saved in backend/.env." -ForegroundColor Gray
}

# 5. Build the Web Application
Write-Host "`n[5/7] Installing packages and compiling frontend..." -ForegroundColor Green
try {
    # Backend dependencies
    if (Test-Path "$AppRoot\backend\node_modules") {
        Write-Host "Backend node_modules already installed. Skipping npm install." -ForegroundColor Gray
        Set-Location -Path "$AppRoot\backend"
    }
    else {
        Write-Host "Setting up Backend dependencies..." -ForegroundColor Gray
        Set-Location -Path "$AppRoot\backend"
        & npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed in backend directory with exit code $LASTEXITCODE." }
    }

    # Validate database connection
    Write-Host "Validating Database connection..." -ForegroundColor Gray
    $dbValid = $false
    
    # Run Node to test connection
    $testResult = & node -e "const mysql = require('mysql2/promise'); require('dotenv').config({path: './.env'}); mysql.createConnection({host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASS}).then(conn => { console.log('SUCCESS'); conn.end(); process.exit(0); }).catch(err => { console.error(err.message); process.exit(1); })" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dbValid = $true
        Write-Host "Database connection verified successfully!" -ForegroundColor Green
    }
    else {
        Write-Warning "Database connection validation failed: $testResult"
        $retryChoice = Read-Host -Prompt "Would you like to re-configure database settings? (Y/n)"
        if ([string]::IsNullOrWhiteSpace($retryChoice) -or $retryChoice -eq 'y' -or $retryChoice -eq 'Y') {
            while (-not $dbValid) {
                Write-Host "`nRe-configuring Database Connection Settings..." -ForegroundColor Green
                $dbUser = Read-Host -Prompt "Enter MySQL Username [default: root]"
                if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "root" }
                $dbPass = Read-Host -Prompt "Enter MySQL Password [default: empty]"
                $dbName = Read-Host -Prompt "Enter MySQL Database Name [default: guest_management_db]"
                if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "guest_management_db" }
                $dbHost = Read-Host -Prompt "Enter MySQL Host [default: 127.0.0.1]"
                if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "127.0.0.1" }
                $dbPort = Read-Host -Prompt "Enter MySQL Port [default: 3306]"
                if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "3306" }

                $jwtSecret = "gmp_jwt_s3cr3t_k3y_2024_change_me_in_production"
                $recoveryCode = "FST_RECOVERY_2026"
                if (Test-Path $envPath) {
                    $existingContent = Get-Content $envPath
                    foreach ($line in $existingContent) {
                        if ($line -like "JWT_SECRET=*") { $jwtSecret = $line.Substring(11) }
                        if ($line -like "RECOVERY_CODE=*") { $recoveryCode = $line.Substring(14) }
                    }
                }
                $envContent = "PORT=5000`r`n" +
                "DB_HOST=$dbHost`r`n" +
                "DB_PORT=$dbPort`r`n" +
                "DB_USER=$dbUser`r`n" +
                "DB_PASS=$dbPass`r`n" +
                "DB_NAME=$dbName`r`n" +
                "JWT_SECRET=$jwtSecret`r`n" +
                "RECOVERY_CODE=$recoveryCode"
                Set-Content -Path $envPath -Value $envContent
                Write-Host "Updated database settings in backend/.env." -ForegroundColor Gray

                # Retest connection
                $testResult = & node -e "const mysql = require('mysql2/promise'); require('dotenv').config({path: './.env'}); mysql.createConnection({host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASS}).then(conn => { console.log('SUCCESS'); conn.end(); process.exit(0); }).catch(err => { console.error(err.message); process.exit(1); })" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dbValid = $true
                    Write-Host "Database connection verified successfully!" -ForegroundColor Green
                }
                else {
                    Write-Warning "Database connection validation failed: $testResult"
                }
            }
        }
        else {
            Write-Host "Proceeding anyway. Please note database connection errors may occur." -ForegroundColor Yellow
        }
    }

    # 4.6. Database Auto-Setup (Creation, Schema Import, Seeding)
    if ($dbValid) {
        Write-Host "`n[4.6/7] Running Database Auto-Setup (Creation, Schema, and Seeding)..." -ForegroundColor Green
        
        # Write a temporary script to run database creation and schema import securely via node
        $setupScript = @'
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({path: './.env'});

(async () => {
  let conn;
  try {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || 3306;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASS || '';
    const dbName = process.env.DB_NAME || 'guest_management_db';

    console.log('Connecting to MySQL Server to ensure database exists...');
    conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
    
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`);
    console.log(`Database "${dbName}" created or already exists.`);
    await conn.end();

    // Now connect to the database to import schema
    console.log(`Connecting directly to database "${dbName}"...`);
    conn = await mysql.createConnection({ host, port, user, password, database: dbName, multipleStatements: true });
    
    // Check if tables already exist (e.g. guests table)
    const [tables] = await conn.query("SHOW TABLES LIKE 'guests'");
    if (tables.length > 0) {
      console.log('Database tables already exist. Skipping schema import to preserve existing records.');
      
      // Take a backup of the existing data
      console.log('Taking a pre-setup backup of the existing database...');
      try {
        const backupData = {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          tables: {}
        };
        
        const dumpTable = async (tableName) => {
          try {
            const [rows] = await conn.query(`SELECT * FROM \`${tableName}\``);
            backupData.tables[tableName] = rows;
          } catch (e) {
            console.warn(`Could not dump table ${tableName}: ${e.message}`);
          }
        };

        await dumpTable('users');
        await dumpTable('guests');
        await dumpTable('status_history');
        await dumpTable('settings');

        const backupDir = path.resolve('./backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
        const filename = `backup-presetup-${dateStr}.json`;
        const filepath = path.join(backupDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf8');
        console.log(`PRE_SETUP_BACKUP_SUCCESS: ${filename}`);
      } catch (backupErr) {
        console.error('Failed to create pre-setup backup:', backupErr.message);
      }
    } else {
      console.log('Importing database schema from guest_management_db.sql...');
      const sqlFilePath = path.resolve('../guest_management_db.sql');
      if (fs.existsSync(sqlFilePath)) {
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        await conn.query(sqlContent);
        console.log('Database schema successfully imported.');
        console.log('NEW_DATABASE_SETUP_SUCCESS');
      } else {
        console.warn('Warning: guest_management_db.sql file not found at project root.');
      }
    }
  } catch (err) {
    console.error('Database setup error:', err.message);
    process.exit(1);
  } finally {
    if (conn) {
      try { await conn.end(); } catch (e) {}
    }
  }
})();
'@

        $setupScript | Set-Content -Path "$AppRoot\backend\db-init-temp.js"
        $currentLocation = Get-Location
        Set-Location -Path "$AppRoot\backend"
        
        # Install node-mysql2 dependency if missing in backend
        if (-not (Test-Path "$AppRoot\backend\node_modules\mysql2")) {
            Write-Host "Installing backend mysql2 dependency..." -ForegroundColor Gray
            & npm install mysql2
        }
        if (-not (Test-Path "$AppRoot\backend\node_modules\dotenv")) {
            Write-Host "Installing backend dotenv dependency..." -ForegroundColor Gray
            & npm install dotenv
        }

        # Run Node script and capture output to detect new installation
        $initOutput = & node db-init-temp.js 2>&1
        $initExitCode = $LASTEXITCODE
        $initOutput | ForEach-Object { Write-Host $_ }
        
        $isNewInstall = $false
        if ($initOutput -match "NEW_DATABASE_SETUP_SUCCESS") {
            $isNewInstall = $true
        }
        
        Remove-Item -Path "db-init-temp.js" -Force
        
        if ($initExitCode -eq 0) {
            Write-Host "Database schema verified and loaded successfully!" -ForegroundColor Green
            
            # Run database seeder only on new installations
            if ($isNewInstall) {
                Write-Host "Running database seeder (seed.js)..." -ForegroundColor Gray
                & node seed.js
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "Database seeded successfully!" -ForegroundColor Green
                }
                else {
                    Write-Warning "Database seeder exited with warning/error."
                }
            }
            else {
                Write-Host "Skipping database seeding because an existing database was found." -ForegroundColor Yellow
            }
        }
        else {
            Write-Warning "Database schema initialization failed. You may need to create tables and import guest_management_db.sql manually."
        }
        
        Set-Location -Path $currentLocation
    }

    # Frontend dependencies
    if (Test-Path "$AppRoot\frontend\node_modules") {
        Write-Host "Frontend node_modules already installed. Skipping npm install." -ForegroundColor Gray
    }
    else {
        Write-Host "Setting up Frontend dependencies..." -ForegroundColor Gray
        Set-Location -Path "$AppRoot\frontend"
        & npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed in frontend directory with exit code $LASTEXITCODE." }
    }

    # Frontend build
    if ((Test-Path "$AppRoot\frontend\dist\index.html") -and (Test-Path "$AppRoot\frontend\dist\web.config")) {
        Write-Host "Production build already exists in frontend/dist. Skipping rebuild." -ForegroundColor Green
    }
    else {
        Write-Host "Compiling Frontend assets..." -ForegroundColor Gray
        Set-Location -Path "$AppRoot\frontend"
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE." }
    }
    
    Write-Host "Compilation completed. dist/ folder populated with web.config." -ForegroundColor Gray
}
catch {
    Write-Error "Failed during npm install or build phase: $_"
    Read-Host -Prompt "Press Enter to exit"
    Exit
}


# 6. Configure IIS Website
Write-Host "`n[6/7] Configuring IIS Website..." -ForegroundColor Green
$usePowerShell = $false
try {
    Import-Module WebAdministration -ErrorAction Stop
    if (Get-Command Get-Website -ErrorAction SilentlyContinue) {
        $usePowerShell = $true
    }
}
catch {
    Write-Host "WebAdministration PowerShell module not available. Falling back to appcmd.exe." -ForegroundColor Yellow
}

if ($usePowerShell) {
    try {
        # Find and remove any website bound to Port 80 or Port 443 (except GuestManagementPortal) to clear the ports
        $conflictingSites = Get-Website | Where-Object {
            $_.Name -ne "GuestManagementPortal" -and 
            ($_.Bindings | Where-Object { $_.BindingInformation -like "*:80:*" -or $_.BindingInformation -like "*:443:*" })
        }
        foreach ($site in $conflictingSites) {
            Write-Host "Stopping and removing conflicting IIS site '$($site.Name)' running on Port 80/443..." -ForegroundColor Yellow
            Stop-Website -Name $site.Name -ErrorAction SilentlyContinue
            Remove-Website -Name $site.Name -ErrorAction SilentlyContinue
        }

        $port = 80
        $siteCreated = $false
        
        while (-not $siteCreated) {
            try {
                Write-Host "Creating IIS Website 'GuestManagementPortal' pointing to dist/ on Port $port..." -ForegroundColor Gray
                
                # Re-register site if already exists
                if (Get-Website -Name "GuestManagementPortal" -ErrorAction SilentlyContinue) {
                    Remove-Website -Name "GuestManagementPortal"
                }
                
                New-Website -Name "GuestManagementPortal" -Port $port -PhysicalPath "$AppRoot\frontend\dist" -Force
                
                # Add HTTPS (443) binding with Self-Signed Certificate
                try {
                    $cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Subject -like "*CN=localhost*" -or $_.Subject -like "*CN=$systemIP*" } | Select-Object -First 1
                    if (-not $cert) {
                        Write-Host "Generating Self-Signed SSL Certificate for localhost & $systemIP..." -ForegroundColor Gray
                        $cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1", $systemIP -CertStoreLocation "cert:\LocalMachine\My" -FriendlyName "GMP_Localhost_SSL" -ErrorAction SilentlyContinue
                    }
                    if ($cert) {
                        Write-Host "Binding HTTPS (Port 443)..." -ForegroundColor Gray
                        New-WebBinding -Name "GuestManagementPortal" -IP "*" -Port 443 -Protocol "https" -ErrorAction SilentlyContinue
                        $httpsBinding = Get-WebBinding -Name "GuestManagementPortal" -Protocol "https" -ErrorAction SilentlyContinue
                        if ($httpsBinding) {
                            $httpsBinding.AddSslCertificate($cert.GetCertHashString(), "my")
                        }
                    }
                }
                catch {}

                Start-Website -Name "GuestManagementPortal"
                $siteCreated = $true
                Write-Host "IIS Website created and started successfully on Port $port (and HTTPS 443)." -ForegroundColor Gray
                
                # Restart IIS to apply URL Rewrite and ARR modules
                Write-Host "Restarting IIS to apply all URL Rewrite and ARR modules..." -ForegroundColor Gray
                iisreset
            }
            catch {
                if ($_.Exception.Message -like "*used by another process*" -or $_.Exception.InnerException.Message -like "*used by another process*") {
                    Write-Warning "Port $port is currently in use by a non-IIS process (e.g. Apache, Nginx, or Skype)."
                    $userInput = Read-Host -Prompt "Enter a different port to bind the website (e.g. 8080 or 8081) [default: 8080]"
                    if ([string]::IsNullOrWhiteSpace($userInput)) {
                        $port = 8080
                    }
                    else {
                        $port = [int]$userInput
                    }
                }
                else {
                    throw $_
                }
            }
        }
    }
    catch {
        Write-Warning "Failed to configure IIS Website using PowerShell: $_. Attempting to fall back to appcmd.exe."
        $usePowerShell = $false
    }
}

if (-not $usePowerShell) {
    # Fallback using appcmd.exe
    $appcmd = "$env:SystemRoot\system32\inetsrv\appcmd.exe"
    if (Test-Path $appcmd) {
        try {
            Write-Host "Stopping and deleting all conflicting sites running on Port 80 or Port 443..." -ForegroundColor Yellow
            
            # Query all sites bound to Port 80 and 443 using appcmd
            $sitesOn80Or443 = (& $appcmd list site /bindings:"http/*:80:") + (& $appcmd list site /bindings:"https/*:443:")
            foreach ($siteLine in $sitesOn80Or443) {
                # Format: SITE "SiteName" (id:1,bindings:http/*:80:,state:Started)
                if ($siteLine -match 'SITE "([^"]+)"') {
                    $siteName = $Matches[1]
                    if ($siteName -ne "GuestManagementPortal") {
                        Write-Host "Stopping and deleting conflicting site '$siteName' via appcmd..." -ForegroundColor Yellow
                        & $appcmd stop site "$siteName" 2>$null
                        & $appcmd delete site "$siteName" 2>$null
                    }
                }
            }
            
            # Check and delete existing GuestManagementPortal
            & $appcmd delete site "GuestManagementPortal" 2>$null
            
            $port = 80
            & $appcmd add site /name:"GuestManagementPortal" /bindings:"http/*:$($port):" /physicalPath:"$AppRoot\frontend\dist"
            & $appcmd start site "GuestManagementPortal"
            
            Write-Host "IIS Website created and started successfully using appcmd.exe on Port $port." -ForegroundColor Gray
            
            # Restart IIS to apply URL Rewrite and ARR modules
            Write-Host "Restarting IIS to apply all URL Rewrite and ARR modules..." -ForegroundColor Gray
            iisreset
        }
        catch {
            Write-Error "Failed to configure website using appcmd.exe: $_"
        }
    }
    else {
        Write-Error "Neither WebAdministration PowerShell module nor appcmd.exe is available. Could not configure IIS Website."
    }
}



# 7. Start Backend and Configure Auto-Start on PC Reboot
Write-Host "`n[7/7] Starting Backend Node API & Configuring Auto-Start on PC Boot..." -ForegroundColor Green
try {
    Set-Location -Path "$AppRoot\backend"
    
    # Verify PM2 installation
    $pm2Check = Get-Command pm2 -ErrorAction SilentlyContinue
    if (-not $pm2Check) {
        Write-Host "PM2 is not installed. Installing PM2 globally..." -ForegroundColor Gray
        & npm install pm2 -g
    }
    
    Write-Host "Registering backend API with PM2..." -ForegroundColor Gray
    & pm2 delete gmp-backend-api 2>$null
    & pm2 start server.js --name "gmp-backend-api" --watch false
    & pm2 save
    
    Write-Host "gmp-backend-api process successfully running under PM2." -ForegroundColor Gray
}
catch {
    Write-Warning "PM2 configuration notice: $_. Proceeding with Windows Scheduled Task registration."
}

# 7.5. Clean up old Windows Scheduled Task (delegating autostart to PM2)
try {
    $taskName = "GMP_Backend_AutoStart"
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Bypassed Task Scheduler registration. Autostart is managed exclusively by PM2." -ForegroundColor Gray
}
catch {
    # Ignore cleanup errors if task scheduler cmdlets are missing
}

# Open Windows Firewall ports
Write-Host "`nConfiguring Windows Firewall inbound rules..." -ForegroundColor Green
try {
    Remove-NetFirewallRule -DisplayName "GMP Frontend HTTP (80)" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "GMP Frontend HTTP (80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Description "Allow inbound access to GMP Frontend Portal" -ErrorAction SilentlyContinue
    
    Remove-NetFirewallRule -DisplayName "GMP Frontend HTTP (8080)" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "GMP Frontend HTTP (8080)" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Description "Allow inbound access to GMP Frontend Portal (Port 8080)" -ErrorAction SilentlyContinue

    Remove-NetFirewallRule -DisplayName "GMP Backend API (5000)" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "GMP Backend API (5000)" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -Description "Allow inbound access to GMP Backend API Service" -ErrorAction SilentlyContinue
    
    Write-Host "Firewall rules successfully added for ports 80, 8080, and 5000." -ForegroundColor Gray
}
catch {
    Write-Warning "Could not update firewall rules: $_"
}

$localUrl = "http://localhost:$port/"
$ipUrl = "http://${systemIP}:${port}/"
if ($port -eq 80) { 
    $localUrl = "http://localhost/"
    $ipUrl = "http://${systemIP}/"
}

if ($isNewInstall) {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Yellow
    Write-Host "  NEW DATABASE INSTALLATION INITIALIZED                  " -ForegroundColor Yellow
    Write-Host "=========================================================" -ForegroundColor Yellow
    Write-Host "  MySQL Database Credentials:                            " -ForegroundColor Gray
    Write-Host "    Host:     $dbHost" -ForegroundColor Gray
    Write-Host "    Port:     $dbPort" -ForegroundColor Gray
    Write-Host "    User:     $dbUser" -ForegroundColor Gray
    Write-Host "    Database: $dbName" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Default Admin Portal Account:                          " -ForegroundColor Gray
    Write-Host "    Username: admin" -ForegroundColor Yellow
    Write-Host "    Password: admin123" -ForegroundColor Yellow
    Write-Host "=========================================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "  IIS Setup Completed Successfully!                      " -ForegroundColor Green
Write-Host "  Detected MySQL: $script:mysqlType                      " -ForegroundColor Green
Write-Host "  MySQL Path:     $script:mysqlPath                      " -ForegroundColor Green
Write-Host "  Localhost URL:  $localUrl                              " -ForegroundColor Green
Write-Host "  System IP URL:  $ipUrl                                 " -ForegroundColor Green
Write-Host "  HTTPS Localhost: https://localhost/                    " -ForegroundColor Green
Write-Host "  HTTPS System IP: https://${systemIP}/                  " -ForegroundColor Green
Write-Host "  The app will auto-run on Windows machine restart.      " -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""
$cliCommand = "mysql -u $dbUser -P $dbPort -p"
$mysqlCmdCheck = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlCmdCheck) {
    # If mysql command is not registered in system PATH, scan directories to find the exact binary path
    $searchPaths = @(
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )
    if (Test-Path "C:\wamp64\bin\mysql") {
        $searchPaths += Get-ChildItem "C:\wamp64\bin\mysql\mysql*\bin\mysql.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
    }
    if (Test-Path "C:\wamp\bin\mysql") {
        $searchPaths += Get-ChildItem "C:\wamp\bin\mysql\mysql*\bin\mysql.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
    }
    
    $foundPath = $null
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $foundPath = $path
            break
        }
    }
    if ($foundPath) {
        $cliCommand = "& `"$foundPath`" -u $dbUser -P $dbPort -p"
    }
}
elseif ($dbHost -ne "127.0.0.1" -and $dbHost -ne "localhost") {
    $cliCommand = "mysql -u $dbUser -h $dbHost -P $dbPort -p"
}


Write-Host "  To view the database via command line (CLI):           " -ForegroundColor Gray
Write-Host "    1. Run: $cliCommand                                  " -ForegroundColor Yellow
Write-Host "    2. Run: USE $dbName;                                 " -ForegroundColor Yellow
Write-Host "    3. Run: SELECT * FROM guests;                        " -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""

# Create Desktop Shortcut for GMP Portal
try {
    $shortcutScript = Join-Path $AppRoot "create-desktop-shortcut.ps1"
    if (Test-Path $shortcutScript) {
        & $shortcutScript
    }
} catch {}

try {
    $openUrl = $ipUrl
    if ([string]::IsNullOrWhiteSpace($openUrl)) { $openUrl = $localUrl }
    Write-Host "Opening application in browser using System IP ($openUrl)..." -ForegroundColor Gray
    Start-Process $openUrl
}
catch {}

try { Stop-Transcript } catch {}
pause

