## Scanner Hardware Diagnostic Report
Generated on: 2026-08-16 16:46:44
System Name: LUCIFER
CurrentUser: kmhat
Is Elevated: System.Security.Principal.WindowsPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

### 1. WIA Service Status
Service Name: stisvc
Status: Stopped
Start Type: Manual
Attempting to start WIA Service...
Error Starting WIA Service: Service 'Windows Image Acquisition (WIA) (stisvc)' cannot be started due to the following error: Cannot open stisvc service on computer '.'.

### 2. WIA COM Object Verification
WIA COM Object Creation: SUCCESS
Registered Devices Count: 0
WIA reports 0 connected scanners.

### 3. TWAIN Driver Detection
Checking: C:\Windows\twain_32
Found TWAIN Data Sources:
 - wiatwain.ds (Path: C:\Windows\twain_32\wiatwain.ds)
Checking: C:\Windows\twain_64
Directory does not exist.

### 4. Plug-and-Play (PnP) Imaging and Scanner Device Scan
Searching PnP devices matching keywords or classes...
Class: Camera, Name: Integrated Camera, Status: OK, DeviceID: USB\VID_5986&PID_1135&MI_00\7&1869FAD3&0&0000

### 5. Universal Serial Bus (USB) Controllers
Name: AMD USB 3.10 eXtensible Host Controller - 1.10 (Microsoft), Status: OK, ErrorCode: 0

### 6. Watched Folder Status
Configured Watch Folder: C:\ScannerOutput
Folder status: EXISTS
Write Permissions: OK (Verified)

### 7. Recommendations
 - ERROR: WIA Service is stopped. Ensure the launcher ran with administrative permissions to start it.
