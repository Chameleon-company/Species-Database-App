$ErrorActionPreference = "Stop"
Set-Location -Path "$PSScriptRoot\backend"
& ".\venv\Scripts\python.exe" -c "from app import app; app.run(debug=False, port=5000)"
