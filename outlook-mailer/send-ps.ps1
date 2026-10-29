# send-ps.ps1 - send a branded email from Carolyn's own Outlook mailbox WITHOUT registering an app.
#
# The kit builds the email (node mailer.mjs preview, which needs no sign-in). Microsoft's own
# Graph PowerShell module sends it as HTML from the signed-in mailbox. The same rules as mail_send
# apply: do-not-email.txt, no repeat email to one person within 3 days unless -FollowUp,
# 10 recipients, 50 a day, and nothing goes out without -Yes (or -Test, which mails only yourself).
# Every send is logged in sent-log.ndjson, the same log "node mailer.mjs history" reads.
#
# One-time setup (Carolyn signs in once with her own Microsoft 365 account):
#   Install-Module Microsoft.Graph.Users.Actions -Scope CurrentUser
#   Connect-MgGraph -Scopes "Mail.Send","User.Read" -UseDeviceCode -NoWelcome
#
# Use:
#   .\send-ps.ps1 -Template quick-question -Vars templates\quick-question.vars.json -Subject "Quick question..." -Test
#   .\send-ps.ps1 -Template quick-question -Vars vars\sam.json -To sam@example.com -Subject "Quick question..." -Yes
#   .\send-ps.ps1 -Text note.txt -To sam@example.com -Subject "Your proof is ready" -Yes
param(
  [string]$Template, [string]$Vars, [string]$Text,
  [string[]]$To, [string[]]$Cc, [Parameter(Mandatory)][string]$Subject,
  [switch]$Test, [switch]$Yes, [switch]$FollowUp
)
$ErrorActionPreference = "Stop"
$Dir = $PSScriptRoot
$MaxRcpt = 10; $DailyCap = 50; $CooldownDays = 3

# 1. Signed in?
$ctx = Get-MgContext
if (-not $ctx -or -not $ctx.Account) { throw 'Not signed in. Run: Connect-MgGraph -Scopes "Mail.Send","User.Read" -UseDeviceCode -NoWelcome' }
if ($ctx.Scopes -notcontains "Mail.Send") { throw 'Signed in without Mail.Send. Run Connect-MgGraph again with -Scopes "Mail.Send","User.Read".' }
$Me = $ctx.Account

# 2. Build the email with the kit (same template, same shell, same unfilled-field check).
Push-Location $Dir
try {
  if ($Template) { $out = node mailer.mjs preview --template $Template --vars $Vars | Out-String }
  elseif ($Text) { $out = node mailer.mjs preview --text $Text | Out-String }
  else { throw "Give -Template (with -Vars) or -Text" }
  if ($LASTEXITCODE -ne 0) { throw "Preview failed: $out" }
  $previewPath = ($out | ConvertFrom-Json).preview
} finally { Pop-Location }
$html = [IO.File]::ReadAllText($previewPath)
if ($html -match '\{\{\{?\s*\w+\s*\}?\}\}') { throw "Not sent: the email still has an unfilled {{field}} ($($Matches[0]))." }

# 3. Recipients and the rules.
$norm = { param($a) $a.Trim().ToLower() }
$rcpt = if ($Test) { @($Me) } else { @($To | Where-Object { $_ }) }
$all = @($rcpt) + @($Cc | Where-Object { $_ })
if (-not $rcpt) { throw "Not sent: -To is required (or -Test to send to yourself)." }
if ($all.Count -gt $MaxRcpt) { throw "Not sent: $($all.Count) recipients is over the limit of $MaxRcpt per email." }
if (-not $Test -and -not $Yes) { throw "Not sent: add -Yes only after Carolyn has seen the preview ($previewPath) and approved these recipients." }

$logPath = Join-Path $Dir "sent-log.ndjson"
$log = @()
if (Test-Path $logPath) { $log = Get-Content $logPath | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json } }
$today = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")
if (@($log | Where-Object { "$($_.at)".StartsWith($today) }).Count -ge $DailyCap) { throw "Not sent: daily cap of $DailyCap emails reached." }

if (-not $Test) {
  $supPath = Join-Path $Dir "do-not-email.txt"
  $sup = @()
  if (Test-Path $supPath) { $sup = Get-Content $supPath | ForEach-Object { & $norm ($_ -replace '#.*', '') } | Where-Object { $_ } }
  foreach ($a in $all) {
    $n = & $norm $a
    if ($sup -contains $n -or $sup -contains ("@" + $n.Split("@")[1])) { throw "Not sent: $a is on the do-not-email list (do-not-email.txt)." }
    if (-not $FollowUp) {
      $last = $log | Where-Object { -not $_.test -and (@($_.to) + @($_.cc) | ForEach-Object { & $norm "$_" }) -contains $n } | Select-Object -Last 1
      if ($last -and ((Get-Date) - [datetime]$last.at).TotalDays -lt $CooldownDays) {
        throw "Not sent: already emailed $a on $("$($last.at)".Substring(0,10)). If Carolyn wants this follow-up, add -FollowUp."
      }
    }
  }
}

# 4. Send as HTML from her mailbox (lands in her Sent Items).
$addr = { param($a) @{ EmailAddress = @{ Address = $a } } }
$params = @{
  Message = @{
    Subject = $Subject
    Body = @{ ContentType = "HTML"; Content = $html }
    ToRecipients = @($rcpt | ForEach-Object { & $addr $_ })
    CcRecipients = @($Cc | Where-Object { $_ } | ForEach-Object { & $addr $_ })
  }
  SaveToSentItems = $true
}
Send-MgUserMail -UserId $Me -BodyParameter $params

$entry = [ordered]@{ at = (Get-Date).ToUniversalTime().ToString("o"); to = @($rcpt); cc = @($Cc | Where-Object { $_ }); subject = $Subject; template = $(if ($Template) { $Template } else { "_note" }); test = [bool]$Test; via = "powershell" }
Add-Content -Path $logPath -Value ($entry | ConvertTo-Json -Compress)
Write-Output "Sent from $Me to $($rcpt -join ', '): $Subject"
