# Запуск со своего компьютера: по SSH ставит Necromunda Digital на Ubuntu 22.04.
#
# Параметры лежат в tools/deploy/remote.local (см. remote.local.example).
#   copy tools\deploy\remote.local.example tools\deploy\remote.local
#   powershell -File tools/deploy/remote.ps1
#
# На сервере нужны SSH и sudo. Скрипт установки скачивается с GitHub
# и сам клонирует репозиторий.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$Url = 'https://raw.githubusercontent.com/dmitrriykriv/necromunda-digital/main/tools/deploy/install-ubuntu.sh'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir 'remote.local'

function ConvertTo-BashQuoted([string]$Value) {
    return "'" + ($Value -replace "'", "'\''") + "'"
}

if (-not (Test-Path -LiteralPath $configPath)) {
    Write-Error "Нет $configPath. Скопируйте tools/deploy/remote.local.example в tools/deploy/remote.local и заполните TARGET."
}

$target = ''
$sshPort = 22
$tokens = New-Object System.Collections.Generic.List[string]
foreach ($raw in [System.IO.File]::ReadAllLines($configPath)) {
    $line = $raw
    $hash = $line.IndexOf('#')
    if ($hash -ge 0) { $line = $line.Substring(0, $hash) }
    $line = $line.Trim()
    if (-not $line) { continue }
    if ($line -like 'TARGET=*') {
        $target = $line.Substring(7).Trim()
        continue
    }
    if ($line -like 'SSH_PORT=*') {
        $sshPort = [int]$line.Substring(9).Trim()
        continue
    }
    if ($line.StartsWith('--')) {
        $parts = $line -split '\s+', 2
        $tokens.Add($parts[0])
        if ($parts.Count -gt 1 -and $parts[1].Trim()) {
            $tokens.Add($parts[1].Trim())
        }
        continue
    }
    Write-Error "Не понял строку в ${configPath}: $line"
}

if (-not $target) {
    Write-Error "В $configPath нет TARGET. Пример: TARGET=user@203.0.113.10"
}

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Error 'Не найден ssh. Установите OpenSSH Client: Параметры Windows, Приложения, Дополнительные компоненты.'
}

$remoteArgs = ($tokens | ForEach-Object { ConvertTo-BashQuoted $_ }) -join ' '
if ($remoteArgs) { $remoteArgs = ' ' + $remoteArgs }

$remote = "curl -fsSL $(ConvertTo-BashQuoted $Url) -o /tmp/necromunda-install.sh && sudo bash /tmp/necromunda-install.sh$remoteArgs"

$sshArgs = @('-t')
if ($sshPort -ne 22) {
    $sshArgs += @('-p', "$sshPort")
}
$sshArgs += @($target, $remote)

Write-Host "Подключаюсь к $target и запускаю установку на сервере."
& ssh @sshArgs
exit $LASTEXITCODE
