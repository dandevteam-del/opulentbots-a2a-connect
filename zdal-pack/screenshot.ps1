# ZDAL pack "eyes": save a picture of the screen so the assistant can see what Carolyn sees.
# Run only when Carolyn asks ("look at my screen"). It saves one PNG and prints its path; the
# assistant then opens that file. Nothing is uploaded anywhere.
#   powershell -ExecutionPolicy Bypass -File screenshot.ps1            # all screens
#   powershell -ExecutionPolicy Bypass -File screenshot.ps1 -Primary   # main screen only
param([switch]$Primary)
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$b = if ($Primary) { [System.Windows.Forms.Screen]::PrimaryScreen.Bounds } else { [System.Windows.Forms.SystemInformation]::VirtualScreen }
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Left, $b.Top, 0, 0, $bmp.Size)
$dir = Join-Path $HOME "zdal-screens"; New-Item -ItemType Directory -Force -Path $dir | Out-Null
$out = Join-Path $dir ("screen-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png")
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
# keep the last 20 only
Get-ChildItem $dir -Filter screen-*.png | Sort-Object LastWriteTime -Descending | Select-Object -Skip 20 | Remove-Item -Force
Write-Output $out
