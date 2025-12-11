# Complete Android Build Script for Species Database App
# Run this script to build your Android APK from scratch

$ErrorActionPreference = "Stop"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE ANDROID BUILD PROCESS" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean up everything
Write-Host "[1/7] Cleaning up previous builds and processes..." -ForegroundColor Yellow

# Kill Java/Gradle processes
Get-Process | Where-Object {$_.ProcessName -like "*java*" -or $_.ProcessName -like "*gradle*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Stop Gradle daemons
if (Test-Path android) {
    Push-Location android
    if (Test-Path gradlew.bat) {
        cmd /c gradlew.bat --stop 2>&1 | Out-Null
    }
    Pop-Location
}

# Remove problematic directories and files
if (Test-Path app) {
    Remove-Item -Recurse -Force app -ErrorAction SilentlyContinue
    Write-Host "  Removed incorrect 'app' directory" -ForegroundColor Gray
}
if (Test-Path android\app\build) {
    Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
}
Remove-Item app-release-unsigned-aligned.apk -ErrorAction SilentlyContinue
Remove-Item build.gradle, settings.gradle, gradlew.bat, gradlew -ErrorAction SilentlyContinue
Remove-Item .gradle -Recurse -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2
Write-Host "  [OK] Cleanup complete" -ForegroundColor Green
Write-Host ""

# Step 2: Check prerequisites
Write-Host "[2/7] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command bubblewrap -ErrorAction SilentlyContinue)) {
    throw "Bubblewrap CLI is not installed. Run: npm install -g @bubblewrap/cli"
}
Write-Host "  [OK] Bubblewrap installed" -ForegroundColor Green

if (-not (Get-Command http-server -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing http-server..." -ForegroundColor Yellow
    npm install -g http-server
}
Write-Host "  [OK] http-server installed" -ForegroundColor Green

if (-not (Test-Path "android.keystore")) {
    Write-Host "  Generating keystore..." -ForegroundColor Yellow
    $javaHome = "$env:USERPROFILE\.bubblewrap\jdk\jdk-17.0.11+9"
    & "$javaHome\bin\keytool.exe" -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000 -storepass 123456 -keypass 123456 -dname "CN=SpeciesDB, OU=Development, O=SpeciesDB, L=Unknown, ST=Unknown, C=US" 2>&1 | Out-Null
    Write-Host "  [OK] Keystore created" -ForegroundColor Green
} else {
    Write-Host "  [OK] Keystore found" -ForegroundColor Green
}
Write-Host ""

# Step 3: Start HTTP server
Write-Host "[3/7] Starting local HTTP server..." -ForegroundColor Yellow

# Check if server is already running
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/manifest.json" -UseBasicParsing -Method Head -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $serverRunning = $true
        Write-Host "  [OK] Server already running on port 8080" -ForegroundColor Green
    }
} catch {
    # Server not running, start it
    cmd /c "start /min http-server -p 8080 -c-1"
    Start-Sleep -Seconds 5
    
    # Verify it started
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/manifest.json" -UseBasicParsing -Method Head -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] Server started on port 8080" -ForegroundColor Green
            $serverRunning = $true
        }
    } catch {
        throw "Could not start or verify HTTP server on port 8080"
    }
}

if (-not $serverRunning) {
    throw "HTTP server is not accessible"
}
Write-Host ""

# Step 4: Check if Android project exists, if not initialize
Write-Host "[4/7] Checking Android project..." -ForegroundColor Yellow

if (-not (Test-Path android)) {
    Write-Host "  Android project not found. Initializing..." -ForegroundColor Yellow
    Write-Host "  You will need to answer prompts:" -ForegroundColor Magenta
    Write-Host "    - Press Enter for most defaults" -ForegroundColor White
    Write-Host "    - Password: 123456" -ForegroundColor White
    Write-Host ""
    
    cmd /c bubblewrap init --manifest=http://localhost:8080/manifest.json
    
    Start-Sleep -Seconds 3
    
    if (-not (Test-Path android)) {
        throw "Android project initialization failed. Please run 'bubblewrap init' manually."
    }
    Write-Host "  [OK] Android project initialized" -ForegroundColor Green
} else {
    Write-Host "  [OK] Android project found" -ForegroundColor Green
}
Write-Host ""

# Step 5: Regenerate Android project
Write-Host "[5/7] Updating Android project..." -ForegroundColor Yellow

# Set memory limits
$env:GRADLE_OPTS = "-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=256m"

# Update project
Write-Host "  Running bubblewrap update..." -ForegroundColor Gray
$updateOutput = cmd /c bubblewrap update 2>&1
# Don't show all output, just check for success

# Wait a moment for file system to catch up
Start-Sleep -Seconds 3

if (-not (Test-Path android)) {
    throw "Android project was not generated. Check twa-manifest.json configuration."
}
Write-Host "  [OK] Android project updated" -ForegroundColor Green
Write-Host ""

# Step 6: Build APK
Write-Host "[6/7] Building Android APK..." -ForegroundColor Yellow
Write-Host "  This will take several minutes..." -ForegroundColor Gray
Write-Host "  When prompted, enter password: 123456" -ForegroundColor Magenta
Write-Host ""

# Build
$buildOutput = cmd /c bubblewrap build 2>&1

# Check if build succeeded by looking for the APK
$sourceApk = "android/app/build/outputs/apk/release/app-release-signed.apk"
if (-not (Test-Path $sourceApk)) {
    Write-Host "  Build may have failed. Checking for unsigned APK..." -ForegroundColor Yellow
    $unsignedApk = "android/app/build/outputs/apk/release/app-release-unsigned.apk"
    if (Test-Path $unsignedApk) {
        Write-Host "  Found unsigned APK. Signing manually..." -ForegroundColor Yellow
        # Try to sign it manually
        $javaHome = "$env:USERPROFILE\.bubblewrap\jdk\jdk-17.0.11+9"
        $apksigner = "$env:USERPROFILE\.bubblewrap\android_sdk\build-tools\34.0.0\lib\apksigner.jar"
        if (Test-Path $apksigner) {
            & "$javaHome\bin\java.exe" -jar $apksigner sign --ks android.keystore --ks-key-alias android --ks-pass pass:123456 --key-pass pass:123456 --out android/app/build/outputs/apk/release/app-release-signed.apk android/app/build/outputs/apk/release/app-release-unsigned.apk
            if (Test-Path $sourceApk) {
                Write-Host "  [OK] APK signed successfully" -ForegroundColor Green
            }
        }
    }
    
    if (-not (Test-Path $sourceApk)) {
        Write-Host "  Build output:" -ForegroundColor Yellow
        Write-Host $buildOutput
        throw "Build failed - APK not found. Check errors above."
    }
}

Write-Host "  [OK] APK built successfully" -ForegroundColor Green
Write-Host ""

# Step 7: Organize output
Write-Host "[7/7] Organizing output..." -ForegroundColor Yellow

$releaseDir = "release"
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

Copy-Item $sourceApk -Destination "$releaseDir/SpeciesDB-Signed.apk" -Force

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your APK is ready for testing:" -ForegroundColor Cyan
Write-Host "  Location: $releaseDir/SpeciesDB-Signed.apk" -ForegroundColor White
Write-Host ""
Write-Host "File size: $([math]::Round((Get-Item "$releaseDir/SpeciesDB-Signed.apk").Length / 1MB, 2)) MB" -ForegroundColor Gray
Write-Host ""
Write-Host "NOTE: This build points to localhost:8080" -ForegroundColor Yellow
Write-Host "      For wireless testing, deploy to a public URL first." -ForegroundColor Yellow
Write-Host ""
