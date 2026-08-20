$ErrorActionPreference = 'Stop'
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root
try { $Host.UI.RawUI.WindowTitle = 'Necromunda Digital' } catch { }

function Wait-Exit {
    param([string]$Message, [int]$Code = 1)
    Write-Host ''
    if ($Message) { Write-Host $Message -ForegroundColor Red }
    cmd.exe /c pause
    exit $Code
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Wait-Exit 'Node.js не найден. Установите Node.js 20+ и добавьте его в PATH.'
}

if (-not (Test-Path -LiteralPath 'node_modules')) {
    Write-Host 'Устанавливаю зависимости...'
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { Wait-Exit 'npm install не удался.' }
}

if (-not (Test-Path -LiteralPath 'frontend\dist\index.html')) {
    Write-Host 'Собираю frontend...'
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { Wait-Exit 'Сборка frontend не удалась.' }
}

Write-Host ''
Write-Host 'Справочник:  http://127.0.0.1:8000/'
Write-Host 'Ростеры:     http://127.0.0.1:8000/pages/roster-builder.html'
Write-Host 'Остановка:   Ctrl+C'
Write-Host ''

Start-Process -FilePath 'cmd.exe' -WindowStyle Hidden -ArgumentList '/c', 'timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000/'

& npm.cmd start
if ($LASTEXITCODE -ne 0) { Wait-Exit 'Не удалось запустить сервер.' }
