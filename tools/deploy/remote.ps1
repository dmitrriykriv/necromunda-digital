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

function Unquote([string]$Value) {
    if ($Value.Length -ge 2) {
        $first = $Value[0]
        $last = $Value[$Value.Length - 1]
        if (($first -eq "'" -and $last -eq "'") -or ($first -eq '"' -and $last -eq '"')) {
            return $Value.Substring(1, $Value.Length - 2)
        }
    }
    return $Value
}

function Get-ConfigValue([string]$Line, [string]$Key) {
    $prefix = $Key + '='
    if (-not $Line.StartsWith($prefix)) { return $null }
    $value = $Line.Substring($prefix.Length)
    $hash = $value.IndexOf('#')
    if ($hash -ge 0) { $value = $value.Substring(0, $hash) }
    return (Unquote $value.Trim())
}

function Get-AskPassExe {
    $exe = Join-Path $env:TEMP 'necromunda-askpass.exe'
    if (Test-Path -LiteralPath $exe) { return $exe }
    $code = @'
using System;
public class NecromundaAskPass {
    public static void Main(string[] args) {
        string password = Environment.GetEnvironmentVariable("NECROMUNDA_SSH_PASSWORD");
        if (password == null) password = "";
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        Console.Out.WriteLine(password);
    }
}
'@
    Add-Type -TypeDefinition $code -OutputAssembly $exe -OutputType ConsoleApplication
    return $exe
}

if (-not (Test-Path -LiteralPath $configPath)) {
    Write-Error "Нет $configPath. Скопируйте tools/deploy/remote.local.example в tools/deploy/remote.local и заполните TARGET."
}

$target = ''
$sshPort = 22
$sshPassword = ''
$passwordMode = 'ask'
$tokens = New-Object System.Collections.Generic.List[string]
foreach ($raw in [System.IO.File]::ReadAllLines($configPath)) {
    $line = $raw.Trim()
    if (-not $line -or $line.StartsWith('#')) { continue }
    if ($line.StartsWith('SSH_PASSWORD=')) {
        $sshPassword = Unquote $line.Substring(13).Trim()
        continue
    }
    $modeValue = Get-ConfigValue $line 'SSH_PASSWORD_MODE'
    if ($null -ne $modeValue) {
        $passwordMode = $modeValue.ToLowerInvariant()
        continue
    }
    $targetValue = Get-ConfigValue $line 'TARGET'
    if ($null -ne $targetValue) {
        $target = $targetValue
        continue
    }
    $portValue = Get-ConfigValue $line 'SSH_PORT'
    if ($null -ne $portValue) {
        $sshPort = [int]$portValue
        continue
    }
    $hash = $line.IndexOf('#')
    if ($hash -ge 0) { $line = $line.Substring(0, $hash).Trim() }
    if (-not $line) { continue }
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

if ($passwordMode -ne 'ask' -and $passwordMode -ne 'file' -and $passwordMode -ne 'prompt') {
    Write-Error "SSH_PASSWORD_MODE должен быть ask или file, сейчас: $passwordMode"
}
if ($passwordMode -eq 'prompt') { $passwordMode = 'ask' }
if ($passwordMode -eq 'file' -and -not $sshPassword) {
    Write-Error 'SSH_PASSWORD_MODE=file, но SSH_PASSWORD пуст.'
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

$saved = @{
    NECROMUNDA_SSH_PASSWORD = [Environment]::GetEnvironmentVariable('NECROMUNDA_SSH_PASSWORD')
    SSH_ASKPASS = [Environment]::GetEnvironmentVariable('SSH_ASKPASS')
    SSH_ASKPASS_REQUIRE = [Environment]::GetEnvironmentVariable('SSH_ASKPASS_REQUIRE')
    DISPLAY = [Environment]::GetEnvironmentVariable('DISPLAY')
}
function Restore-SshEnv {
    foreach ($name in @('NECROMUNDA_SSH_PASSWORD', 'SSH_ASKPASS', 'SSH_ASKPASS_REQUIRE', 'DISPLAY')) {
        $previous = $saved[$name]
        if ($null -eq $previous) {
            Remove-Item "Env:$name" -ErrorAction SilentlyContinue
        } else {
            Set-Item "Env:$name" $previous
        }
    }
}

try {
    if ($passwordMode -eq 'file') {
        $env:NECROMUNDA_SSH_PASSWORD = $sshPassword
        $env:SSH_ASKPASS = Get-AskPassExe
        $env:SSH_ASKPASS_REQUIRE = 'force'
        if (-not $env:DISPLAY) { $env:DISPLAY = 'localhost:0' }
    } else {
        Remove-Item Env:NECROMUNDA_SSH_PASSWORD -ErrorAction SilentlyContinue
        Remove-Item Env:SSH_ASKPASS -ErrorAction SilentlyContinue
        Remove-Item Env:SSH_ASKPASS_REQUIRE -ErrorAction SilentlyContinue
    }
    & ssh @sshArgs
    $exitCode = $LASTEXITCODE
} finally {
    Restore-SshEnv
}

exit $exitCode
