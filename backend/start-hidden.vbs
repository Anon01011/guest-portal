Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c cd /d ""D:\GuestManagementApp\backend"" && node server.js", 0, False
