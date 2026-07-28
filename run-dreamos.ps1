# DreamOS one-click launcher: starts Ollama (if needed), the FastAPI backend (if needed),
# indexes the vault, then launches the desktop app and waits for it to close.
# Only stops the backend on exit if THIS script started it - never touches Ollama, since
# other local projects on this machine share the same Ollama instance.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
# 127.0.0.1, not "localhost" - on this machine "localhost" resolves to the IPv6 loopback
# (::1) first, and neither Ollama nor uvicorn listen on IPv6, so Invoke-RestMethod hangs
# until timeout even though the service is actually up and curl/127.0.0.1 reach it fine.
$ollamaUrl = "http://127.0.0.1:11434/api/tags"
$backendUrl = "http://127.0.0.1:8420"
$requiredModels = @("nomic-embed-text", "llama3.2")

function Test-Url($url, $timeoutSec = 2) {
    try {
        Invoke-RestMethod -Uri $url -TimeoutSec $timeoutSec -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Wait-Until($check, $label, $timeoutSec = 30) {
    $elapsed = 0
    while (-not (& $check)) {
        if ($elapsed -ge $timeoutSec) {
            throw "Timed out waiting for $label after ${timeoutSec}s"
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
}

Write-Host "== DreamOS launcher ==" -ForegroundColor Cyan

# 1. Ollama
if (Test-Url $ollamaUrl) {
    Write-Host "Ollama already running." -ForegroundColor Green
} else {
    Write-Host "Starting Ollama..."
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Wait-Until { Test-Url $ollamaUrl } "Ollama to start"
    Write-Host "Ollama is up." -ForegroundColor Green
}

# 2. Required models (pull is a no-op if already present)
$installed = (ollama list) -join "`n"
foreach ($model in $requiredModels) {
    if ($installed -notmatch [regex]::Escape($model)) {
        Write-Host "Pulling missing model $model (first run only, may take a while)..." -ForegroundColor Yellow
        ollama pull $model
    }
}

# 3. Backend
if (-not (Test-Path $venvPython)) {
    throw "Backend venv not found at $venvPython - run: cd backend; python -m venv .venv; ./.venv/Scripts/python.exe -m pip install -r requirements.txt"
}

$startedBackend = $false
if (Test-Url "$backendUrl/health") {
    Write-Host "Backend already running." -ForegroundColor Green
} else {
    Write-Host "Starting backend..."
    $backendLog = Join-Path $backendDir "data\launcher-backend.log"
    New-Item -ItemType Directory -Force -Path (Split-Path $backendLog) | Out-Null
    $backendProc = Start-Process $venvPython `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--port", "8420" `
        -WorkingDirectory $backendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError "$backendLog.err" `
        -PassThru
    $startedBackend = $true
    try {
        Wait-Until { Test-Url "$backendUrl/health" } "backend to start"
    } catch {
        Write-Host "Backend failed to start - check $backendLog and $backendLog.err" -ForegroundColor Red
        throw
    }
    Write-Host "Backend is up." -ForegroundColor Green
}

# 4. Index the vault (cheap no-op on unchanged files, so safe to run every launch)
Write-Host "Indexing vault..."
try {
    $result = Invoke-RestMethod -Uri "$backendUrl/index" -Method Post -TimeoutSec 120
    Write-Host "  indexed: $($result.indexed.Count), skipped: $($result.skipped_unchanged.Count), errors: $($result.errors.PSObject.Properties.Count)" -ForegroundColor Green
} catch {
    Write-Host "  Indexing failed - continuing anyway ($($_.Exception.Message))" -ForegroundColor Yellow
}

# 5. Launch the desktop app - prefer an installed build, fall back to the release exe,
# fall back to dev mode if neither exists yet.
$candidates = @(
    (Join-Path $env:LOCALAPPDATA "DreamOS\DreamOS.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\DreamOS\DreamOS.exe"),
    (Join-Path $env:ProgramFiles "DreamOS\DreamOS.exe"),
    (Join-Path $frontendDir "src-tauri\target\release\frontend.exe")
)
$appPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($appPath) {
    Write-Host "Launching $appPath" -ForegroundColor Cyan
    $appProc = Start-Process $appPath -PassThru
    Write-Host "DreamOS is running. Close its window to exit this launcher."
    $appProc.WaitForExit()
} else {
    Write-Host "No built app found - falling back to dev mode (npm run tauri dev)." -ForegroundColor Yellow
    Push-Location $frontendDir
    try {
        npm run tauri dev
    } finally {
        Pop-Location
    }
}

# 6. Cleanup - only stop what we started
if ($startedBackend -and $backendProc -and -not $backendProc.HasExited) {
    Write-Host "Stopping backend..."
    Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "Done." -ForegroundColor Cyan
