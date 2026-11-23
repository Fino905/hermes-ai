Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strCurDir = fso.GetParentFolderName(WScript.ScriptFullName)
strNode = "node.exe"
strScript = chr(34) & strCurDir & "\desktop-launcher.js" & chr(34)

' Run without showing a command prompt window (0 = hidden)
oShell.Run "node " & strScript, 0, False

