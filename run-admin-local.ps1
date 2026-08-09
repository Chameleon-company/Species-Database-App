$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\nodejs;$env:Path"
Set-Location -Path "$PSScriptRoot\ReactDash"
& "C:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1
