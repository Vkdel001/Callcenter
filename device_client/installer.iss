; Inno Setup Script for NIC Device Client
; Creates Windows installer for the application

[Setup]
AppName=NIC Payment Device
AppVersion=1.0.0
AppPublisher=NIC Life Insurance
DefaultDirName={autopf}\NIC Device
DefaultGroupName=NIC Device
OutputDir=output
OutputBaseFilename=NIC_Device_Setup
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\NIC_Device_Client.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Main executable
Source: "dist\NIC_Device_Client.exe"; DestDir: "{app}"; Flags: ignoreversion

; Icon file
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion

; Configuration file (if exists)
Source: "config.py"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; README
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme

[Icons]
; Desktop shortcut
Name: "{userdesktop}\NIC Payment Device"; Filename: "{app}\NIC_Device_Client.exe"; IconFilename: "{app}\icon.ico"

; Start menu shortcuts
Name: "{group}\NIC Payment Device"; Filename: "{app}\NIC_Device_Client.exe"; IconFilename: "{app}\icon.ico"
Name: "{group}\View Logs"; Filename: "{app}\device_client.log"
Name: "{group}\README"; Filename: "{app}\README.md"
Name: "{group}\Uninstall NIC Device"; Filename: "{uninstallexe}"

[Run]
; Option to launch after installation
Filename: "{app}\NIC_Device_Client.exe"; Description: "Launch NIC Payment Device"; Flags: postinstall nowait skipifsilent

[UninstallDelete]
; Clean up log files on uninstall
Type: files; Name: "{app}\device_client.log"
Type: files; Name: "{app}\device_client.log.*"
Type: files; Name: "{app}\temp_qr.jpg"

[Code]
// Check if application is running before uninstall
function InitializeUninstall(): Boolean;
var
  ErrorCode: Integer;
begin
  // Try to close the application gracefully
  if CheckForMutexes('NICDeviceClient') then
  begin
    if MsgBox('NIC Payment Device is currently running. Close it now?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      // User confirmed, try to close
      Result := True;
    end
    else
    begin
      // User cancelled
      Result := False;
    end;
  end
  else
  begin
    Result := True;
  end;
end;
