$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\nodejs;$env:Path"
Set-Location -Path $PSScriptRoot
& pnpm --filter admin dev --host 127.0.0.1
