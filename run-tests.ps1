#Requires -Version 5.1
<#
.SYNOPSIS
    Single entry point for developing and testing RouteSense AI Version 2.

.DESCRIPTION
    Mode 1 (default): full automated pipeline -- environment checks, backend/
    frontend dependency setup, Playwright browser check, backend pytest,
    start both servers, run the full Playwright suite, clean up, report.

    Mode 2 (-StartOnly): prepares and starts both dev servers and leaves
    them running for manual development. Ctrl+C stops only the processes
    this script started.

    Mode 3 (-Clean): removes safe-to-regenerate artifacts.

    Mode 4 (-CheckOnly / -DryRun): validates tool availability, paths, and
    project structure without installing anything or starting servers.

.NOTES
    FIXED (this revision): a real crash reported from a live Windows run.
    Root cause: $ErrorActionPreference = "Stop" combined with PowerShell's
    "2>" redirect operator on a NATIVE command turns ANY stderr text from
    that command into a script-TERMINATING exception -- even completely
    expected stderr, like the ModuleNotFoundError a fresh venv's Python
    correctly produces during the "are dependencies installed" check.
    That crash was then compounded by a second bug: Overall was computed
    as "no phase explicitly recorded FAIL", so a phase that never got a
    chance to record ANYTHING (because the crash cut it off) was silently
    treated as passing. Both are fixed below: every external command now
    runs through Invoke-ExternalCommand (which never lets native stderr
    escalate to a terminating error, and captures full stdout+stderr+exit
    code), and Overall is now computed strictly from a set of explicit
    boolean flags that are each set to $true ONLY at the exact point that
    phase genuinely succeeds -- never inferred from the absence of a
    recorded failure.

    Known correction from the original spec: the backend's real health
    endpoint is /api/health, not /health -- verified by reading
    app/main.py directly.
#>

[CmdletBinding()]
param(
    [switch]$StartOnly,
    [switch]$Clean,
    [switch]$IncludeDependencies,
    [switch]$CheckOnly,
    [switch]$DryRun
)

if ($DryRun) { $CheckOnly = $true }

# ============================================================
# GLOBAL SETUP
# ============================================================

# NOTE: deliberately NOT using a blanket $ErrorActionPreference = "Stop"
# for the whole script. That setting is exactly what caused the reported
# crash (see .NOTES above) by escalating expected native-command stderr
# into terminating exceptions. Instead, PowerShell-level cmdlet errors are
# caught with explicit try/catch at each risky call site, and every
# external process invocation goes through Invoke-ExternalCommand below,
# which handles its own errors and never lets stderr text alone abort the
# script.
$ErrorActionPreference = "Continue"

$RepoRoot     = $PSScriptRoot
$BackendDir   = Join-Path $RepoRoot "backend"
$FrontendDir  = Join-Path $RepoRoot "frontend"
$ResultsDir   = Join-Path $RepoRoot "test-results"
$VenvDir      = Join-Path $BackendDir ".venv"
$VenvPython   = Join-Path $VenvDir "Scripts\python.exe"

$BackendHealthUrl    = "http://127.0.0.1:8000/api/health"
$FrontendUrl         = "http://127.0.0.1:5173"
$BackendPort         = 8000
$FrontendPort        = 5173

$RunnerTranscriptLog = Join-Path $ResultsDir "runner-transcript.log"
$BackendTestLog      = Join-Path $ResultsDir "backend-tests.log"
$BackendServerLog    = Join-Path $ResultsDir "backend-server.log"
$FrontendServerLog   = Join-Path $ResultsDir "frontend-server.log"
$PlaywrightLog       = Join-Path $ResultsDir "playwright.log"
$PlaywrightReportDir = Join-Path $FrontendDir "playwright-report"

$script:StartedProcesses      = @()
$script:ReusedExistingBackend  = $false
$script:ReusedExistingFrontend = $false
$script:TranscriptActive      = $false

# ------------------------------------------------------------
# TASK 5: explicit, strictly-gated success state. Each starts false and
# is set true ONLY at the exact point that phase genuinely, fully
# succeeds. Overall is calculated ONLY from these -- never inferred from
# "nothing failed yet".
# ------------------------------------------------------------
$script:EnvironmentPassed        = $false
$script:BackendEnvironmentPassed = $false
$script:FrontendEnvironmentPassed = $false
$script:PlaywrightInstallPassed  = $false
$script:BackendTestsPassed       = $false
$script:BackendServerPassed      = $false
$script:FrontendServerPassed     = $false
$script:PlaywrightTestsPassed    = $false
$script:OverallPassed            = $false

$script:StepOrder = [ordered]@{
    "Environment"           = { $script:EnvironmentPassed }
    "Backend dependencies"  = { $script:BackendEnvironmentPassed }
    "Frontend dependencies" = { $script:FrontendEnvironmentPassed }
    "Playwright browsers"   = { $script:PlaywrightInstallPassed }
    "Backend pytest"        = { $script:BackendTestsPassed }
    "Backend server"        = { $script:BackendServerPassed }
    "Frontend server"       = { $script:FrontendServerPassed }
    "Playwright tests"      = { $script:PlaywrightTestsPassed }
}

$script:FailedStep   = $null
$script:FailedReason = $null
$script:FailedLog    = $null
$script:BackendTestSummary = "(not run)"
$script:PlaywrightSummary  = "(not run)"

function Write-Section($title) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host $title -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}
function Write-Step($msg) { Write-Host "[*] $msg" -ForegroundColor Yellow }
function Write-Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "[FAIL] $msg" -ForegroundColor Red }

function Set-Failure($step, $reason, $log = $null) {
    $script:FailedStep = $step
    $script:FailedReason = $reason
    $script:FailedLog = $log
}

function Start-RunnerLog {
    try {
        if (-not (Test-Path $ResultsDir)) {
            New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null
        }
        Start-Transcript -Path $RunnerTranscriptLog -Force | Out-Null
        $script:TranscriptActive = $true
    } catch {
        # Transcript is a best-effort, complete-audit-trail convenience --
        # if it can't start for some environment-specific reason, the
        # script must still run; per-phase logs still capture everything
        # that actually matters for diagnosing failures.
        Write-Host "[WARN] Could not start full runner transcript: $($_.Exception.Message)"
    }
}
function Stop-RunnerLog {
    if ($script:TranscriptActive) {
        try { Stop-Transcript | Out-Null } catch { }
        $script:TranscriptActive = $false
    }
}

# ------------------------------------------------------------
# TASK 1/2/7: robust external-command execution.
#
# THIS is the fix for the reported crash. It NEVER lets a native
# command's stderr output escalate into a PowerShell terminating
# exception (that escalation only happens when $ErrorActionPreference is
# "Stop" AND a "2>" style redirect is used on a native command -- this
# function avoids both conditions: it temporarily forces
# $ErrorActionPreference to "Continue" for the duration of the call, and
# merges stderr into the captured output as plain text via "2>&1" into a
# variable rather than a bare "2>" redirect). It also captures the
# complete stdout+stderr+exit code, which Task 1 requires be shown in
# full (not truncated) on failure.
# ------------------------------------------------------------
function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory)] [string]$FilePath,
        [string[]]$ArgumentList = @(),
        [string]$WorkingDirectory = $null,
        [string]$LogFile = $null,
        [switch]$EchoToConsole
    )

    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $pushedLocation = $false
    $outputLines = @()
    $exitCode = -1
    $caughtException = $null

    try {
        if ($WorkingDirectory) {
            Push-Location -Path $WorkingDirectory
            $pushedLocation = $true
        }
        try {
            $outputLines = & $FilePath @ArgumentList 2>&1 | ForEach-Object { "$_" }
            $exitCode = $LASTEXITCODE
        } catch {
            # A genuine PowerShell-level exception (e.g. the executable
            # itself could not be launched at all) -- captured in full,
            # not swallowed, and not allowed to silently keep $exitCode
            # at a stale/misleading value.
            $caughtException = $_
            $exitCode = 1
        }
    } finally {
        if ($pushedLocation) { Pop-Location }
        $ErrorActionPreference = $prevEAP
    }

    $outputText = ($outputLines -join [Environment]::NewLine)

    if ($LogFile) {
        try {
            $header = "COMMAND: $FilePath $($ArgumentList -join ' ')$([Environment]::NewLine)EXIT CODE: $exitCode$([Environment]::NewLine)----------------------------------------$([Environment]::NewLine)"
            ($header + $outputText) | Out-File -FilePath $LogFile -Encoding utf8
        } catch {
            Write-Host "[WARN] Could not write log file $LogFile`: $($_.Exception.Message)"
        }
    }

    if ($EchoToConsole) {
        $outputLines | ForEach-Object { Write-Host $_ }
    }

    return [PSCustomObject]@{
        ExitCode        = $exitCode
        Output          = $outputText
        OutputLines     = $outputLines
        Exception       = $caughtException
        Command         = "$FilePath $($ArgumentList -join ' ')"
    }
}

function Show-FullFailureDetail($result, $context) {
    # TASK 1: the complete failure detail -- command, exit code, full
    # stdout/stderr, and exception type+message if a PowerShell-level
    # exception was involved. Never truncated.
    Write-Err "$context failed."
    Write-Host "  Command   : $($result.Command)"
    Write-Host "  Exit code : $($result.ExitCode)"
    if ($result.Exception) {
        Write-Host "  Exception type    : $($result.Exception.Exception.GetType().FullName)"
        Write-Host "  Exception message : $($result.Exception.Exception.Message)"
    }
    Write-Host "  ---- full output ----"
    Write-Host $result.Output
    Write-Host "  ---------------------"
}

# ============================================================
# PROCESS TREE HELPERS (background servers only -- uvicorn/vite)
# ============================================================

function Get-ChildProcessIds($ParentId) {
    try {
        Get-CimInstance Win32_Process -Filter "ParentProcessId=$ParentId" -ErrorAction Stop |
            Select-Object -ExpandProperty ProcessId
    } catch {
        @()
    }
}

function Stop-ProcessTree($ProcessId) {
    if (-not $ProcessId) { return }
    $children = Get-ChildProcessIds -ParentId $ProcessId
    foreach ($childId in $children) {
        Stop-ProcessTree -ProcessId $childId
    }
    try {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    } catch { }
}

function Stop-AllStartedProcesses {
    if ($script:StartedProcesses.Count -eq 0) { return }
    Write-Step "Cleaning up: stopping only the processes this script started..."
    foreach ($proc in $script:StartedProcesses) {
        if ($proc -and -not $proc.HasExited) {
            Write-Host "    stopping PID $($proc.Id) ($($proc.ProcessName)) and its child processes"
            Stop-ProcessTree -ProcessId $proc.Id
        }
    }
    $script:StartedProcesses = @()
}

# A last-resort safety net for a genuinely unexpected error that escapes
# every explicit try/catch below. Because $ErrorActionPreference is
# "Continue" (see above), this should now be reached far less often than
# before -- but if it IS reached, it must still end in FAIL, never PASS.
trap {
    Write-Err "Unhandled error: $($_.Exception.GetType().FullName): $($_.Exception.Message)"
    Write-Host "  $($_.InvocationInfo.PositionMessage)"
    Set-Failure "Unhandled Script Error" "$($_.Exception.GetType().FullName): $($_.Exception.Message)"
    Exit-OnFailure
}
[Console]::TreatControlCAsInput = $false
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Stop-AllStartedProcesses
} | Out-Null

# ------------------------------------------------------------
# TASK 3/4/6: the ONE place Overall is decided and the process exits.
# Strictly AND's the explicit boolean flags -- never inferred from the
# absence of a recorded failure.
# ------------------------------------------------------------
function Show-FinalReportAndExit {
    $requiredFlags = @(
        $script:EnvironmentPassed,
        $script:BackendEnvironmentPassed,
        $script:FrontendEnvironmentPassed,
        $script:PlaywrightInstallPassed,
        $script:BackendTestsPassed,
        $script:BackendServerPassed,
        $script:FrontendServerPassed,
        $script:PlaywrightTestsPassed
    )
    $script:OverallPassed = -not ($requiredFlags -contains $false)

    Write-Section "RouteSense AI - Version 2 Test Report"
    Write-Host ""
    foreach ($key in $script:StepOrder.Keys) {
        $passed = & $script:StepOrder[$key]
        $label = if ($passed) { "PASS" } else { "FAIL" }
        $color = if ($passed) { "Green" } else { "Red" }
        Write-Host ("{0,-24}: {1}" -f $key, $label) -ForegroundColor $color
    }
    Write-Host ""
    Write-Host "Backend pytest:"
    Write-Host "  $script:BackendTestSummary"
    Write-Host ""
    Write-Host "Playwright:"
    Write-Host "  $script:PlaywrightSummary"
    Write-Host ""

    if ($script:OverallPassed) {
        Write-Host "Overall:"
        Write-Ok "PASS"
        Write-Host "=================================================="
        Stop-RunnerLog
        exit 0
    } else {
        Write-Host "Overall:"
        Write-Err "FAIL"
        Write-Host ""
        Write-Host "FAILED STEP:"
        Write-Host "  $script:FailedStep"
        Write-Host "  $script:FailedReason"
        if ($script:FailedLog) {
            Write-Host ""
            Write-Host "LOG FILE:"
            Write-Host "  $script:FailedLog"
        }
        Write-Host "=================================================="
        Stop-RunnerLog
        exit 1
    }
}

function Exit-OnFailure {
    Stop-AllStartedProcesses
    Show-FinalReportAndExit
}

# ============================================================
# NETWORK / READINESS HELPERS
# ============================================================

function Test-PortInUse($Port) {
    try {
        $conn = Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return [bool]$conn
    } catch {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $client.Connect("127.0.0.1", $Port)
            $client.Close()
            return $true
        } catch {
            return $false
        }
    }
}

function Test-HttpOk($Url) {
    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300)
    } catch {
        return $false
    }
}

function Wait-ForHttpReady($Url, $TimeoutSeconds, $Label) {
    Write-Step "Waiting for $Label to respond at $Url (timeout ${TimeoutSeconds}s)..."
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-HttpOk -Url $Url) {
            Write-Ok "$Label is ready."
            return $true
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    Write-Err "$Label did not become ready within ${TimeoutSeconds}s."
    return $false
}

# ============================================================
# MODE: CLEAN
# ============================================================

function Invoke-Clean {
    Write-Section "RouteSense AI V2 -- Clean"

    $targets = @(
        $ResultsDir,
        $PlaywrightReportDir,
        (Join-Path $FrontendDir "test-results")
    )
    foreach ($path in $targets) {
        if (Test-Path $path) {
            Write-Step "Removing $path"
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    if ($IncludeDependencies) {
        Write-Step "IncludeDependencies specified -- also removing node_modules and .venv"
        foreach ($path in @((Join-Path $FrontendDir "node_modules"), $VenvDir)) {
            if (Test-Path $path) {
                Write-Step "Removing $path"
                Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "Skipped node_modules/.venv (safe default). Use -Clean -IncludeDependencies to remove those too."
    }

    Write-Ok "Clean complete. Source code, .env files, database files, and Version 1 were not touched."
    exit 0
}

if ($Clean) { Invoke-Clean }

# ============================================================
# START LOGGING
# ============================================================

if (-not (Test-Path $ResultsDir)) {
    New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null
}
Start-RunnerLog

# ============================================================
# PHASE 1 -- ENVIRONMENT CHECK
# ============================================================

Write-Section "RouteSense AI V2 -- Environment Check"

function Test-CommandAvailable($Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$envOk = $true
foreach ($cmd in @("python", "node", "npm")) {
    if (Test-CommandAvailable $cmd) {
        Write-Ok "$cmd found: $((Get-Command $cmd).Source)"
    } else {
        Write-Err "$cmd was not found on PATH."
        $envOk = $false
    }
}

if (-not $envOk) {
    Write-Err "Missing required tool(s). Install Python 3.11+, Node.js (with npm), and re-run."
    Set-Failure "Environment Check" "python/node/npm not found on PATH"
    Exit-OnFailure
}
$script:EnvironmentPassed = $true
Write-Ok "Environment check passed."

if ($CheckOnly) {
    Write-Section "Check-Only / Dry Run"
    $checks = [ordered]@{
        "backend directory exists"       = (Test-Path $BackendDir)
        "frontend directory exists"      = (Test-Path $FrontendDir)
        "backend requirements.txt exists" = (Test-Path (Join-Path $BackendDir "requirements.txt"))
        "backend tests/ exists"          = (Test-Path (Join-Path $BackendDir "tests"))
        "frontend package.json exists"   = (Test-Path (Join-Path $FrontendDir "package.json"))
        "frontend e2e/ exists"           = (Test-Path (Join-Path $FrontendDir "e2e"))
        "venv python (if venv exists)"   = (-not (Test-Path $VenvDir)) -or (Test-Path $VenvPython)
        "test-results/ creatable"        = (Test-Path $ResultsDir)
    }
    $allOk = $true
    foreach ($key in $checks.Keys) {
        $ok = $checks[$key]
        if ($ok) { Write-Ok $key } else { Write-Err $key; $allOk = $false }
    }
    Write-Host ""
    if ($allOk) {
        Write-Ok "Dry run complete -- project structure looks correct. No servers were started, nothing was installed."
        Stop-RunnerLog
        exit 0
    } else {
        Write-Err "Dry run found one or more structural problems (see above)."
        Stop-RunnerLog
        exit 1
    }
}

# ============================================================
# PHASE 2 -- BACKEND ENVIRONMENT
# ============================================================

Write-Section "Backend Environment"

if (-not (Test-Path $VenvDir)) {
    Write-Step "Creating virtual environment at $VenvDir ..."
    $venvResult = Invoke-ExternalCommand -FilePath "python" -ArgumentList @("-m", "venv", $VenvDir)
    if ($venvResult.ExitCode -ne 0) {
        Show-FullFailureDetail $venvResult "Virtual environment creation"
        Set-Failure "Backend Environment" "python -m venv failed (exit $($venvResult.ExitCode))" $RunnerTranscriptLog
        Exit-OnFailure
    }
} else {
    Write-Ok "Virtual environment already exists."
}

if (-not (Test-Path $VenvPython)) {
    Write-Err "Expected venv Python at $VenvPython but it does not exist."
    Set-Failure "Backend Environment" "venv python.exe missing after venv creation" $RunnerTranscriptLog
    Exit-OnFailure
}

# Dependency check -- THIS is the call site that crashed before. A fresh
# venv correctly failing this import check (ModuleNotFoundError on
# stderr, non-zero exit code) is an EXPECTED, NORMAL outcome that must
# route to "install dependencies", not crash the script.
Write-Step "Checking whether backend dependencies are already installed..."
$depsCheckResult = Invoke-ExternalCommand -FilePath $VenvPython `
    -ArgumentList @("-c", "import fastapi, sqlalchemy, pydantic_settings, jose, passlib, bcrypt, pytest")
$depsPresent = ($depsCheckResult.ExitCode -eq 0)

if (-not $depsPresent) {
    Write-Step "Dependencies not fully present (this is normal for a fresh venv) -- installing..."
    Write-Host "  (import check said: exit code $($depsCheckResult.ExitCode))"
    $pipResult = Invoke-ExternalCommand -FilePath $VenvPython `
        -ArgumentList @("-m", "pip", "install", "-r", "requirements.txt") `
        -WorkingDirectory $BackendDir -EchoToConsole

    if ($pipResult.ExitCode -ne 0) {
        Show-FullFailureDetail $pipResult "pip install -r requirements.txt"
        Write-Err "This is often a network problem -- see the full output above."
        Set-Failure "Backend Environment" "pip install failed (exit $($pipResult.ExitCode)). See full output above / in $RunnerTranscriptLog." $RunnerTranscriptLog
        Exit-OnFailure
    }
    Write-Ok "Backend dependencies installed."
} else {
    Write-Ok "Backend dependencies already present -- skipping install."
}
$script:BackendEnvironmentPassed = $true

# ============================================================
# PHASE 3 -- FRONTEND ENVIRONMENT
# ============================================================

Write-Section "Frontend Environment"

$NodeModulesDir = Join-Path $FrontendDir "node_modules"
if (-not (Test-Path $NodeModulesDir)) {
    Write-Step "node_modules not found -- running npm install..."
    $npmResult = Invoke-ExternalCommand -FilePath "npm" -ArgumentList @("install") `
        -WorkingDirectory $FrontendDir -EchoToConsole

    if ($npmResult.ExitCode -ne 0) {
        Show-FullFailureDetail $npmResult "npm install"
        Write-Err "This is often a network problem -- see the full output above."
        Set-Failure "Frontend Environment" "npm install failed (exit $($npmResult.ExitCode))" $RunnerTranscriptLog
        Exit-OnFailure
    }
    Write-Ok "Frontend dependencies installed."
} else {
    Write-Ok "node_modules already exists -- skipping npm install."
}
$script:FrontendEnvironmentPassed = $true

# ============================================================
# PHASE 4 -- PLAYWRIGHT BROWSERS (skipped in -StartOnly)
# ============================================================

if (-not $StartOnly) {
    Write-Section "Playwright Browser Check"
    Write-Step "Ensuring Playwright browsers are installed (no-op if already present)..."
    $pwInstallResult = Invoke-ExternalCommand -FilePath "npx" -ArgumentList @("playwright", "install") `
        -WorkingDirectory $FrontendDir -EchoToConsole

    if ($pwInstallResult.ExitCode -ne 0) {
        Show-FullFailureDetail $pwInstallResult "npx playwright install"
        Write-Err "This is often a network problem -- see the full output above."
        Set-Failure "Playwright Browser Check" "npx playwright install failed (exit $($pwInstallResult.ExitCode))" $RunnerTranscriptLog
        Exit-OnFailure
    }
    Write-Ok "Playwright browsers ready."
    $script:PlaywrightInstallPassed = $true
}

# ============================================================
# PHASE 5 -- BACKEND PYTEST (skipped in -StartOnly)
# ============================================================

if (-not $StartOnly) {
    Write-Section "Backend Tests (pytest)"
    $pytestResult = Invoke-ExternalCommand -FilePath $VenvPython -ArgumentList @("-m", "pytest", "-v") `
        -WorkingDirectory $BackendDir -LogFile $BackendTestLog -EchoToConsole

    $summaryLine = ($pytestResult.OutputLines | Select-String -Pattern "passed|failed|error" | Select-Object -Last 1)
    $script:BackendTestSummary = if ($summaryLine) { $summaryLine.Line.Trim() } else { "(no summary line captured -- see $BackendTestLog)" }

    # TASK 4: pytest must have ACTUALLY RUN and ALL tests must have
    # passed. A zero exit code from a command that never really executed
    # pytest (e.g. pytest not installed, immediate launch failure) would
    # also show as "0 tests ran" in the output -- so exit code alone
    # isn't trusted; the summary line must mention "passed" and must NOT
    # mention "failed"/"error" for this phase to be marked passed.
    $ranSuccessfully = ($pytestResult.ExitCode -eq 0)
    $mentionsPassed = ($script:BackendTestSummary -match "passed")
    $mentionsFailureWord = ($script:BackendTestSummary -match "failed|error")

    if (-not $ranSuccessfully -or -not $mentionsPassed -or $mentionsFailureWord) {
        Show-FullFailureDetail $pytestResult "Backend tests (pytest)"
        Set-Failure "Backend Tests (pytest)" "pytest did not report a clean all-passed result. Summary: $script:BackendTestSummary" $BackendTestLog
        Exit-OnFailure
    }

    Write-Ok "Backend tests passed: $script:BackendTestSummary"
    $script:BackendTestsPassed = $true
}

# ============================================================
# PHASE 6 -- START BACKEND
# ============================================================

Write-Section "Starting Backend Server"

if (Test-PortInUse -Port $BackendPort) {
    Write-Step "Port $BackendPort is already in use -- checking whether it's a healthy RouteSense V2 backend..."
    if (Test-HttpOk -Url $BackendHealthUrl) {
        Write-Ok "An existing healthy backend is already responding at $BackendHealthUrl -- reusing it instead of starting a new one."
        $script:ReusedExistingBackend = $true
    } else {
        Write-Err "Port $BackendPort is occupied by something that is NOT responding correctly at $BackendHealthUrl."
        Set-Failure "Start Backend" "Port $BackendPort occupied by an unrelated/unhealthy process"
        Exit-OnFailure
    }
} else {
    Write-Step "Launching uvicorn in the background (log: $BackendServerLog)..."
    try {
        $backendProc = Start-Process -FilePath $VenvPython `
            -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "$BackendPort" `
            -WorkingDirectory $BackendDir `
            -RedirectStandardOutput $BackendServerLog `
            -RedirectStandardError (Join-Path $ResultsDir "backend-server-stderr.log") `
            -WindowStyle Hidden -PassThru
        $script:StartedProcesses += $backendProc
    } catch {
        Write-Err "Failed to launch uvicorn: $($_.Exception.Message)"
        Set-Failure "Start Backend" "Start-Process for uvicorn threw: $($_.Exception.Message)" $BackendServerLog
        Exit-OnFailure
    }

    $backendReady = Wait-ForHttpReady -Url $BackendHealthUrl -TimeoutSeconds 60 -Label "Backend"
    if (-not $backendReady) {
        Write-Err "Backend failed to start. Log output:"
        if (Test-Path $BackendServerLog) { Get-Content $BackendServerLog | Select-Object -Last 40 | Write-Host }
        Set-Failure "Start Backend" "Backend did not respond at $BackendHealthUrl within 60s" $BackendServerLog
        Exit-OnFailure
    }
}
$script:BackendServerPassed = $true

# ============================================================
# PHASE 7 -- START FRONTEND
# ============================================================

Write-Section "Starting Frontend Server"

if (Test-PortInUse -Port $FrontendPort) {
    Write-Step "Port $FrontendPort is already in use -- checking whether it's already serving the frontend..."
    if (Test-HttpOk -Url $FrontendUrl) {
        Write-Ok "An existing server is already responding at $FrontendUrl -- reusing it instead of starting a new one."
        $script:ReusedExistingFrontend = $true
    } else {
        Write-Err "Port $FrontendPort is occupied by something that is NOT responding at $FrontendUrl."
        Set-Failure "Start Frontend" "Port $FrontendPort occupied by an unrelated/unhealthy process"
        Exit-OnFailure
    }
} else {
    Write-Step "Launching Vite dev server in the background (log: $FrontendServerLog)..."
    try {
        $frontendProc = Start-Process -FilePath "cmd.exe" `
            -ArgumentList "/c", "npm run dev -- --host 127.0.0.1 --port $FrontendPort" `
            -WorkingDirectory $FrontendDir `
            -RedirectStandardOutput $FrontendServerLog `
            -RedirectStandardError (Join-Path $ResultsDir "frontend-server-stderr.log") `
            -WindowStyle Hidden -PassThru
        $script:StartedProcesses += $frontendProc
    } catch {
        Write-Err "Failed to launch the frontend dev server: $($_.Exception.Message)"
        Set-Failure "Start Frontend" "Start-Process for npm run dev threw: $($_.Exception.Message)" $FrontendServerLog
        Exit-OnFailure
    }

    $frontendReady = Wait-ForHttpReady -Url $FrontendUrl -TimeoutSeconds 60 -Label "Frontend"
    if (-not $frontendReady) {
        Write-Err "Frontend failed to start. Log output:"
        if (Test-Path $FrontendServerLog) { Get-Content $FrontendServerLog | Select-Object -Last 40 | Write-Host }
        Set-Failure "Start Frontend" "Frontend did not respond at $FrontendUrl within 60s" $FrontendServerLog
        Exit-OnFailure
    }
}
$script:FrontendServerPassed = $true

# ============================================================
# MODE 2: -StartOnly stops here and keeps servers running
# ============================================================

if ($StartOnly) {
    Write-Section "RouteSense AI Development Servers"
    Write-Host ""
    Write-Host "Backend:"
    Write-Host "  http://127.0.0.1:$BackendPort"
    Write-Host ""
    Write-Host "Frontend:"
    Write-Host "  $FrontendUrl"
    Write-Host ""
    Write-Host "Both servers are running."
    Write-Host "Press Ctrl+C to stop both servers."
    Write-Host "=================================================="
    Write-Host ""

    try {
        while ($true) { Start-Sleep -Seconds 1 }
    } finally {
        if (-not $script:ReusedExistingBackend -or -not $script:ReusedExistingFrontend) {
            Stop-AllStartedProcesses
        }
        Stop-RunnerLog
    }
    exit 0
}

# ============================================================
# PHASE 8 -- PLAYWRIGHT TESTS
# ============================================================

Write-Section "Playwright End-to-End Tests"

$pwTestResult = Invoke-ExternalCommand -FilePath "npx" -ArgumentList @("playwright", "test") `
    -WorkingDirectory $FrontendDir -LogFile $PlaywrightLog -EchoToConsole

$pwSummaryLine = ($pwTestResult.OutputLines | Select-String -Pattern "passed|failed" | Select-Object -Last 1)
$script:PlaywrightSummary = if ($pwSummaryLine) { $pwSummaryLine.Line.Trim() } else { "(no summary line captured -- see $PlaywrightLog)" }

if (Test-Path $PlaywrightReportDir) {
    Write-Step "Copying Playwright HTML report into $ResultsDir\playwright-report ..."
    Copy-Item -Path $PlaywrightReportDir -Destination (Join-Path $ResultsDir "playwright-report") -Recurse -Force -ErrorAction SilentlyContinue
}

$pwRanSuccessfully = ($pwTestResult.ExitCode -eq 0)
$pwMentionsPassed = ($script:PlaywrightSummary -match "passed")
$pwMentionsFailureWord = ($script:PlaywrightSummary -match "failed")

if (-not $pwRanSuccessfully -or -not $pwMentionsPassed -or $pwMentionsFailureWord) {
    Show-FullFailureDetail $pwTestResult "Playwright tests"
    Set-Failure "Playwright Tests" "Playwright did not report a clean all-passed result. Summary: $script:PlaywrightSummary" $PlaywrightLog
    # Do not exit yet -- fall through to Phase 9/10 so cleanup still runs
    # and the full structured report still prints, per the required flow.
} else {
    Write-Ok "Playwright tests passed: $script:PlaywrightSummary"
    $script:PlaywrightTestsPassed = $true
}

# ============================================================
# PHASE 9 -- CLEANUP
# ============================================================

Write-Section "Cleanup"
if ($script:ReusedExistingBackend -and $script:ReusedExistingFrontend) {
    Write-Step "Both servers were pre-existing and reused -- leaving them running, nothing to stop."
} else {
    Stop-AllStartedProcesses
    Write-Ok "Stopped all processes started by this script."
}

# ============================================================
# PHASE 10 -- FINAL SUMMARY
# ============================================================

Show-FinalReportAndExit
