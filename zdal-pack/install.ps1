# ZDAL pack installer: puts everything the OpulentBots kit needs on this PC, in one go.
# Run once in PowerShell:  powershell -ExecutionPolicy Bypass -File install.ps1
# Uses winget (built into Windows 10 and 11). Skips anything already installed.
# Windows may ask "Do you want to allow this app to make changes?" for each one: Carolyn clicks Yes.
#
#   REQUIRED  Node.js LTS  runs the browser tool (Playwright) and the Outlook kit (npm/npx come with it)
#   REQUIRED  Git          downloads and updates the kit from GitHub
#   RECOMMENDED Python 3.12 not used by the kit, but the assistant reaches for it for odd jobs
#                           (reading a PDF, converting a file). Saves a stop later.
#   ALREADY THERE          Microsoft Edge (the browser the agent drives), PowerShell, Claude Code
# Playwright itself needs no install: "npx @playwright/mcp@0.0.83" fetches it on first use and drives Edge.

$ErrorActionPreference = "Continue"
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
if (-not (Has winget)) {
  Write-Host "winget is missing. Open the Microsoft Store, install 'App Installer', then run this again." -ForegroundColor Yellow
  exit 1
}

$apps = @(
  @{ Name = "Node.js LTS"; Cmd = "node";   Id = "OpenJS.NodeJS.LTS";  Need = "required" },
  @{ Name = "Git";         Cmd = "git";    Id = "Git.Git";            Need = "required" },
  @{ Name = "Python 3.12"; Cmd = "python"; Id = "Python.Python.3.12"; Need = "recommended" }
)
foreach ($a in $apps) {
  # "python" on a fresh Windows can be a Store shortcut that only opens the Store; check it really runs.
  $present = (Has $a.Cmd) -and ($a.Cmd -ne "python" -or ((& python --version 2>&1) -match "Python 3"))
  if ($present) { Write-Host "  OK       $($a.Name) already installed" -ForegroundColor Green; continue }
  Write-Host "  INSTALL  $($a.Name) ($($a.Need))..." -ForegroundColor Cyan
  winget install --id $a.Id --exact --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -eq 0) { Write-Host "  DONE     $($a.Name)" -ForegroundColor Green }
  else { Write-Host "  FAILED   $($a.Name) (winget exit $LASTEXITCODE). Take a screenshot for OpulentBots." -ForegroundColor Yellow }
}

Write-Host "`nNext: close EVERY terminal window, open a new one (so Windows sees the new programs), then run doctor.ps1.`n"
