# Opens/records a File Explorer window on the demo folder (primary screen, fixed rectangle).
# Usage:
#   explorer-demo.ps1 -Action open
#   explorer-demo.ps1 -Action record -Out clip.mp4 -Seconds 10 [-Refresh]
#   explorer-demo.ps1 -Action close
param([ValidateSet('open','record','close','shot')][string]$Action, [string]$Out, [double]$Seconds = 8, [switch]$Refresh, [double]$RefreshAt = 1.5)
$ErrorActionPreference = 'Stop'
$folder = 'C:\demo\sample-music'
Add-Type @'
using System; using System.Runtime.InteropServices;
public class W32 {
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int hh, uint f);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
}
'@
Add-Type -AssemblyName System.Windows.Forms
function Get-Win {
  $sh = New-Object -ComObject Shell.Application
  foreach ($w in $sh.Windows()) {
    try { if ($w.LocationURL -like '*demo/sample-music*') { return $w } } catch {}
  }
  return $null
}
# Window rectangle on the primary screen (96 DPI, 100% scaling): 1920x1040 above the taskbar
$RX = 0; $RY = 0; $RW = 1920; $RH = 1040
switch ($Action) {
  'open' {
    Start-Process explorer.exe $folder
    $w = $null; 1..40 | % { if (-not $w) { Start-Sleep -Milliseconds 250; $w = Get-Win } }
    if (-not $w) { throw 'Explorer window did not open' }
    $h = [IntPtr]$w.HWND
    [W32]::ShowWindow($h, 9) | Out-Null
    [W32]::SetWindowPos($h, [IntPtr]::Zero, $RX, $RY, $RW, $RH, 0x0040) | Out-Null
    [W32]::SetForegroundWindow($h) | Out-Null
    Start-Sleep -Milliseconds 800
    [System.Windows.Forms.SendKeys]::SendWait('^+1')   # Extra large icons
    Start-Sleep -Milliseconds 800
    [W32]::SetCursorPos(1700, 800) | Out-Null
    'OPEN OK'
  }
  'record' {
    $w = Get-Win; if (-not $w) { throw 'Explorer window not found' }
    [W32]::SetForegroundWindow([IntPtr]$w.HWND) | Out-Null
    [W32]::SetCursorPos(1700, 800) | Out-Null
    Start-Sleep -Milliseconds 400
    New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
    $args2 = @('-y','-f','gdigrab','-framerate','30','-draw_mouse','0','-offset_x',"$RX",'-offset_y',"$RY",'-video_size',"${RW}x${RH}",'-i','desktop','-t',"$Seconds",'-c:v','libx264','-preset','veryfast','-crf','17','-pix_fmt','yuv420p',$Out)
    $p = Start-Process ffmpeg -ArgumentList $args2 -PassThru -WindowStyle Hidden
    if ($Refresh) { Start-Sleep -Milliseconds ([int]($RefreshAt*1000)); [System.Windows.Forms.SendKeys]::SendWait('{F5}') }
    $p.WaitForExit()
    "RECORDED $Out (exit $($p.ExitCode))"
  }
  'shot' {
    $w = Get-Win; [W32]::SetForegroundWindow([IntPtr]$w.HWND) | Out-Null; Start-Sleep -Milliseconds 500
    ffmpeg -y -v error -f gdigrab -offset_x $RX -offset_y $RY -video_size "${RW}x${RH}" -i desktop -frames:v 1 $Out
    "SHOT $Out"
  }
  'close' { $w = Get-Win; if ($w) { $w.Quit() }; 'CLOSED' }
}
