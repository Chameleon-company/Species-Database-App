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
Require-Command "npm" "npm is required."

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

npm install
npm --prefix ReactDash install
npm --prefix capacitor-wrapper install

& $PythonExe @PythonArgs -m venv backend\venv
& backend\venv\Scripts\python.exe -m pip install --upgrade pip
& backend\venv\Scripts\python.exe -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

Write-Host "Install complete. Fill .env, then run: npm run dev"
