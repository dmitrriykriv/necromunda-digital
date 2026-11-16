# Запуск со своего компьютера: по SSH ставит Necromunda Digital на Ubuntu 22.04.
#
# Параметры лежат в tools/deploy/remote.local (см. remote.local.example).
#   copy tools\deploy\remote.local.example tools\deploy\remote.local
#   powershell -File tools/deploy/remote.ps1
#
# На сервере нужны SSH и sudo. Этот скрипт копирует install-ubuntu.sh
# на сервер и запускает его. Репозиторий установщик клонирует сам.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

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
    # Консольное приложение здесь зависает: ssh ждёт его stdout, а оно ждёт консоль.
    $exe = Join-Path $env:TEMP 'necromunda-askpass-win.exe'
    if (Test-Path -LiteralPath $exe) { return $exe }
    $code = @'
using System;
using System.Runtime.InteropServices;
public class NecromundaAskPass {
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr GetStdHandle(int nStdHandle);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool WriteFile(IntPtr hFile, byte[] lpBuffer, int nNumberOfBytesToWrite, out int lpNumberOfBytesWritten, IntPtr lpOverlapped);
    public static void Main(string[] args) {
        string password = Environment.GetEnvironmentVariable("NECROMUNDA_SSH_PASSWORD");
        if (password == null) password = "";
        byte[] bytes = System.Text.Encoding.UTF8.GetBytes(password + "\n");
        int written;
        WriteFile(GetStdHandle(-11), bytes, bytes.Length, out written, IntPtr.Zero);
    }
}
'@
    Add-Type -TypeDefinition $code -OutputAssembly $exe -OutputType WindowsApplication
    return $exe
}

function ConvertTo-ProcessArgument([string[]]$Parts) {
    ($Parts | ForEach-Object {
        if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join ' '
}

function Invoke-RemoteProcess {
    param(
        [Parameter(Mandatory = $true)][string]$FileName,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList,
        [switch]$SendSudoPassword
    )
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = $FileName
    $start.Arguments = ConvertTo-ProcessArgument $ArgumentList
    $start.UseShellExecute = $false
    if ($passwordMode -eq 'file') {
        $start.RedirectStandardInput = $true
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
    }
    $proc = [System.Diagnostics.Process]::Start($start)
    $streamJobs = @()
    $sshLines = New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]'
    if ($passwordMode -eq 'file') {
        $copyStream = {
            param($Reader, $Queue)
            while ($true) {
                $line = $Reader.ReadLine()
                if ($null -eq $line) { break }
                $Queue.Enqueue($line)
                [Console]::Out.WriteLine($line)
            }
        }
        foreach ($reader in @($proc.StandardOutput, $proc.StandardError)) {
            $ps = [powershell]::Create()
            [void]$ps.AddScript($copyStream).AddArgument($reader).AddArgument($sshLines)
            $streamJobs += @{ Ps = $ps; Handle = $ps.BeginInvoke() }
        }
        if ($SendSudoPassword) {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($sshPassword + "`n")
            $proc.StandardInput.BaseStream.Write($bytes, 0, $bytes.Length)
        }
        $proc.StandardInput.Close()
    }
    $proc.WaitForExit()
    foreach ($job in $streamJobs) {
        try { $job.Ps.EndInvoke($job.Handle) } catch {}
        $job.Ps.Dispose()
    }
    foreach ($line in $sshLines) {
        Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
    }
    return $proc.ExitCode
}

function Write-RemoteFailure([int]$Code, [string]$What) {
    if ($Code -eq 255) {
        Write-Note "$What не удалось: нет соединения (код 255). Проверьте адрес, порт и пароль SSH."
    } else {
        Write-Note "$What завершилось с кодом $Code. Текст ошибки выше и в журнале."
    }
}

$logPath = Join-Path $scriptDir 'remote.log'
$exitCode = 1
function Write-Note([string]$Message) {
    Write-Host $Message
    Add-Content -LiteralPath $logPath -Value $Message -Encoding UTF8
}
"----- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') -----" | Set-Content -LiteralPath $logPath -Encoding UTF8

try {
if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Нет $configPath. Скопируйте tools/deploy/remote.local.example в tools/deploy/remote.local и заполните TARGET."
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
    throw "Не понял строку в ${configPath}: $line"
}

if ($passwordMode -ne 'ask' -and $passwordMode -ne 'file' -and $passwordMode -ne 'prompt') {
    throw "SSH_PASSWORD_MODE должен быть ask или file, сейчас: $passwordMode"
}
if ($passwordMode -eq 'prompt') { $passwordMode = 'ask' }
if ($passwordMode -eq 'file' -and -not $sshPassword) {
    throw 'SSH_PASSWORD_MODE=file, но SSH_PASSWORD пуст.'
}

if (-not $target) {
    throw "В $configPath нет TARGET. Пример: TARGET=user@203.0.113.10"
}

$sshExe = 'C:\Windows\System32\OpenSSH\ssh.exe'
if (-not (Test-Path -LiteralPath $sshExe)) {
    $found = Get-Command ssh.exe -ErrorAction SilentlyContinue
    if (-not $found) { throw 'Не найден ssh. Установите OpenSSH Client: Параметры Windows, Приложения, Дополнительные компоненты.' }
    $sshExe = $found.Source
}

$installScript = Join-Path $scriptDir 'install-ubuntu.sh'
if (-not (Test-Path -LiteralPath $installScript)) {
    throw "Нет $installScript"
}
$scpExe = Join-Path (Split-Path -Parent $sshExe) 'scp.exe'
if (-not (Test-Path -LiteralPath $scpExe)) {
    throw "Не найден scp рядом с $sshExe"
}

$remoteArgs = ($tokens | ForEach-Object { ConvertTo-BashQuoted $_ }) -join ' '
if ($remoteArgs) { $remoteArgs = ' ' + $remoteArgs }

if ($passwordMode -eq 'file') {
    # Без кавычек внутри команды: иначе Windows обрезает аргумент ssh и тот сразу завершается.
    $remote = "sudo -S -p '' bash /tmp/necromunda-install.sh$remoteArgs"
} else {
    $remote = "sudo bash /tmp/necromunda-install.sh$remoteArgs"
}

$sshOpts = @(
    '-o', 'ConnectTimeout=20',
    '-o', 'ConnectionAttempts=1',
    '-o', 'NumberOfPasswordPrompts=3',
    '-o', 'StrictHostKeyChecking=accept-new'
)
$scpArgs = @() + $sshOpts
$sshArgs = @() + $sshOpts
if ($passwordMode -ne 'file') {
    $sshArgs = @('-tt') + $sshArgs
}
if ($sshPort -ne 22) {
    $scpArgs += @('-P', "$sshPort")
    $sshArgs += @('-p', "$sshPort")
}
$scpArgs += @($installScript, "${target}:/tmp/necromunda-install.sh")
$sshArgs += @($target, $remote)

if ($passwordMode -eq 'file') {
    Write-Note "Подключаюсь к $target. Пароль из файла, без запроса. Жду ответ не дольше 20 с."
} else {
    Write-Note "Подключаюсь к $target. Сейчас появится запрос пароля SSH, жду ответ не дольше 20 с."
    Write-Note "Если вход пройдёт, сервер может отдельно спросить пароль sudo."
}

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
    Write-Note "Копирую скрипт установки на $target."
    $copyCode = Invoke-RemoteProcess -FileName $scpExe -ArgumentList $scpArgs
    if ($copyCode -ne 0) {
        Write-RemoteFailure $copyCode 'Копирование скрипта'
        $exitCode = $copyCode
    } else {
        Write-Note "Запускаю установку на $target."
        $sendPassword = $passwordMode -eq 'file'
        $exitCode = Invoke-RemoteProcess -FileName $sshExe -ArgumentList $sshArgs -SendSudoPassword:$sendPassword
        if ($exitCode -ne 0) {
            Write-RemoteFailure $exitCode 'Установка'
        }
    }
} catch {
    Write-Note $_.Exception.Message
    $exitCode = 1
} finally {
    if (Get-Command Restore-SshEnv -ErrorAction SilentlyContinue) { Restore-SshEnv }
    Write-Host ""
    Write-Host "Журнал: $logPath"
    try { Read-Host "Нажмите Enter, чтобы закрыть окно" | Out-Null } catch {}
}

exit $exitCode
