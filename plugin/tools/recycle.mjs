#!/usr/bin/env node
// easy-session 세션 정리(0.1.6) — 목록 파일(UTF-8, 한 줄에 경로 하나)의 폴더 · 파일을 Windows 휴지통으로 옮긴다(되돌리기 가능, 대화창 없음).
// 휴지통이 받을 수 있을 때만: 모든 드라이브 휴지통의 「바로 지움」(NukeOnDelete)이 꺼져 있고, 지금 휴지통에 든 양 + 옮길 합이 가장 작은 최대 크기(MaxCapacity, MB)
// 안일 때 — 넘으면 Windows 가 옛 휴지통 항목을 말없이 영구히 지운다. 든 양은 모든 드라이브 합이라 넉넉히 막는 쪽이다.
// 아니면 하나도 안 옮기고 「refused=noreg | nuke | full used=<MB> max=<MB> need=<MB> | os」 한 줄로 끝낸다.
// 끝 줄: recycled=<옮김> failed=<못 옮김> already_gone=<이미 없음>. 쓰임: node recycle.mjs <목록 파일> [기록 파일]. 노트 docs/notes/register.md#sessionClean
// PowerShell 글은 ASCII 만 두고 -EncodedCommand(UTF-16LE base64)로 넘긴다 — 5.1 의 코드 페이지 · 따옴표 문제를 피한다. 출력도 영문 코드만(글은 mod 가 씀)
import { execFileSync } from 'node:child_process'
import { platform } from 'node:os'

const [list, log = ''] = process.argv.slice(2)
if (!list) {
  process.stderr.write('쓰임: node recycle.mjs <목록 파일> [기록 파일]\n')
  process.exit(2)
}
if (platform() !== 'win32') {
  process.stdout.write('refused=os\n')
  process.exit(0)
}

// SHFileOperation FO_DELETE + FOF_ALLOWUNDO 0x40 | FOF_NOCONFIRMATION 0x10 | FOF_SILENT 0x4 | FOF_NOERRORUI 0x400 = 0x454
const PS = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class EsRecycle {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct SHFILEOPSTRUCT {
    public IntPtr hwnd; public uint wFunc; public string pFrom; public string pTo; public ushort fFlags;
    [MarshalAs(UnmanagedType.Bool)] public bool fAnyOperationsAborted; public IntPtr hNameMappings; public string lpszProgressTitle;
  }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)] static extern int SHFileOperation(ref SHFILEOPSTRUCT op);
  public static int Send(string path) {
    var op = new SHFILEOPSTRUCT();
    op.wFunc = 3; op.pFrom = path + "\0\0"; op.fFlags = 0x454;
    int r = SHFileOperation(ref op);
    if (r == 0 && op.fAnyOperationsAborted) r = -1;
    return r;
  }
}
"@
$paths = @(Get-Content -LiteralPath $env:ES_LIST -Encoding UTF8 | Where-Object { $_ })
$total = 0
foreach ($p in $paths) {
  if (Test-Path -LiteralPath $p) {
    $sum = (Get-ChildItem -LiteralPath $p -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    if ($sum) { $total += $sum }
  }
}
$totalMb = [math]::Ceiling($total / 1MB)
$used = 0
foreach ($it in (New-Object -ComObject Shell.Application).Namespace(10).Items()) {
  $s = $it.ExtendedProperty('Size')
  if ($s) { $used += [double]$s }
}
$usedMb = [math]::Ceiling($used / 1MB)
$vols = @(Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\BitBucket\Volume' -ErrorAction SilentlyContinue)
if ($vols.Count -eq 0) { 'refused=noreg'; exit 0 }
foreach ($v in $vols) {
  $prop = Get-ItemProperty -LiteralPath $v.PSPath
  if ($prop.NukeOnDelete -eq 1) { 'refused=nuke'; exit 0 }
  if ($null -ne $prop.MaxCapacity -and $prop.MaxCapacity -lt ($usedMb + $totalMb)) { 'refused=full used=' + $usedMb + ' max=' + $prop.MaxCapacity + ' need=' + $totalMb; exit 0 }
}
$ok = 0; $bad = 0; $gone = 0
$out = New-Object System.Collections.Generic.List[string]
foreach ($p in $paths) {
  if (-not (Test-Path -LiteralPath $p)) { $gone++; $out.Add('GONE|' + $p); continue }
  $r = [EsRecycle]::Send($p)
  if ($r -eq 0 -and -not (Test-Path -LiteralPath $p)) { $ok++; $out.Add('OK|' + $p) } else { $bad++; $out.Add('ERR ' + $r + '|' + $p) }
}
if ($env:ES_LOG) { [System.IO.File]::WriteAllLines($env:ES_LOG, $out, (New-Object System.Text.UTF8Encoding($false))) }
'recycled=' + $ok + ' failed=' + $bad + ' already_gone=' + $gone
`

const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(PS, 'utf16le').toString('base64')], {
  env: { ...process.env, ES_LIST: list, ES_LOG: log },
  encoding: 'utf8',
  windowsHide: true,
  maxBuffer: 16 * 1024 * 1024,
})
process.stdout.write(`${out.trim().split(/\r?\n/).at(-1) ?? ''}\n`)
