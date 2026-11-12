$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

function Require-Command {
    param([string]$Name, [string]$Message)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw $Message
    }
}

Require-Command "node" "Node.js 22+ is required."
Require-Command "pnpm" "pnpm is required. Install it with: npm install -g pnpm"

$Python = Get-Command "py" -ErrorAction SilentlyContinue
if ($Python) {
    $PythonExe = "py"
    $PythonArgs = @("-3")
} elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    $PythonExe = "python"
    $PythonArgs = @()
} else {
    throw "Python 3.12+ is required."
}

pnpm install

& $PythonExe @PythonArgs -m venv services\flask-api\venv
& services\flask-api\venv\Scripts\python.exe -m pip install --upgrade pip
& services\flask-api\venv\Scripts\python.exe -m pip install -r services\flask-api\requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

Write-Host "Install complete. Fill .env, then run: pnpm dev"
