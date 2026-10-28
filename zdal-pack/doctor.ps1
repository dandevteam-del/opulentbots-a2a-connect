# ZDAL pack doctor: what's ready on this PC right now. Read-only; it changes nothing.
# Run:  powershell -ExecutionPolicy Bypass -File doctor.ps1
# Never prints a key: for A2A_HUB_KEY it shows only the first 8 characters.

$ok = 0; $todo = 0
function Pass($what, $detail) { Write-Host "  OK    $what  $detail" -ForegroundColor Green; $script:ok++ }
function Todo($what, $fix)    { Write-Host "  TODO  $what  -> $fix" -ForegroundColor Yellow; $script:todo++ }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

Write-Host "`nZDAL pack doctor  $(Get-Date -Format 'yyyy-MM-dd HH:mm')`n"

Write-Host "Tools"
if (Has node) { $v = (node -v); if ([int]($v -replace '^v(\d+).*','$1') -ge 20) { Pass "Node.js" $v } else { Todo "Node.js $v" "install the LTS from https://nodejs.org (needs v20+)" } } else { Todo "Node.js" "install the LTS from https://nodejs.org" }
if (Has git)    { Pass "Git" ((git --version) -replace 'git version ','') } else { Todo "Git" "install from https://git-scm.com/download/win" }
if (Has claude) { Pass "Claude Code" (claude --version) } else { Todo "Claude Code" "not on PATH" }
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($edge) { Pass "Microsoft Edge" "(the browser the agent drives)" } else { Todo "Microsoft Edge" "install Edge, or change --browser in the setup to chrome" }

Write-Host "`nHub key"
$k = [Environment]::GetEnvironmentVariable("A2A_HUB_KEY", "User"); if (-not $k) { $k = $env:A2A_HUB_KEY }
if ($k -like "a2a_*") { Pass "A2A_HUB_KEY" "set ($($k.Substring(0,8))...)" } else { Todo "A2A_HUB_KEY" "Carolyn runs the setx line from Daniel's email, then opens a new terminal" }
if ($k -and -not $env:A2A_HUB_KEY) { Todo "this terminal" "was opened before the key was saved: close it and open a new one" }

Write-Host "`nClaude Code connections"
if (Has claude) {
  $list = (claude mcp list 2>&1) -join "`n"
  foreach ($s in @("opulentbots-a2a", "browser", "outlook-mailer")) {
    $line = ($list -split "`n" | Where-Object { $_ -match "^$s\b" } | Select-Object -First 1)
    if (-not $line) { Todo $s "not added yet (see the setup guide)" }
    elseif ($line -match "Connected") { Pass $s "connected" }
    else { Todo $s "added but not connected: $($line -replace '^.*?-\s*','')" }
  }
}

Write-Host "`nOutlook kit"
$kit = Join-Path $HOME "opulentbots-a2a-connect\outlook-mailer"
if (Test-Path $kit) {
  Pass "kit folder" $kit
  if (Test-Path (Join-Path $kit "node_modules")) { Pass "packages" "installed" } else { Todo "packages" "cd `"$kit`"; npm ci" }
  if (Test-Path (Join-Path $kit ".env")) { Pass ".env" "present" } else { Todo ".env" "Copy-Item .env.example .env, then add the two IDs (SETUP.md step C)" }
  if (Test-Path (Join-Path $kit ".token-cache.json")) { Pass "Outlook sign-in" "done" } else { Todo "Outlook sign-in" "node mailer.mjs login (SETUP.md step E)" }
  $t = @(Get-ChildItem (Join-Path $kit "templates") -Filter *.html -ErrorAction SilentlyContinue | Where-Object Name -ne "example.html")
  if ($t.Count) { Pass "templates" (($t | ForEach-Object BaseName) -join ", ") } else { Todo "templates" "add Carolyn's template (SETUP.md step F)" }
} else { Todo "kit folder" "cd `$HOME; git clone https://github.com/dandevteam-del/opulentbots-a2a-connect.git" }

Write-Host "`n$ok ready, $todo to do.`n"
