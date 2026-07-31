$ErrorActionPreference = "Stop"
$regPath = "HKCU:\Software\Microsoft\Office\16.0\Excel\Security"
if (-not (Test-Path $regPath)) {
  New-Item -Path $regPath -Force | Out-Null
}
$prev = (Get-ItemProperty -Path $regPath -Name AccessVBOM -ErrorAction SilentlyContinue).AccessVBOM
Set-ItemProperty -Path $regPath -Name AccessVBOM -Value 1 -Type DWord
Write-Output ("AccessVBOM set to 1 (was: " + $prev + ")")

# Also enable VBA macros notifications / don't block
# VBAWarnings: 1=disable all, 2=notify digitally signed, 3=notify all, 4=enable all
$prevWarn = (Get-ItemProperty -Path $regPath -Name VBAWarnings -ErrorAction SilentlyContinue).VBAWarnings
if ($null -eq $prevWarn) { $prevWarn = "unset" }
Set-ItemProperty -Path $regPath -Name VBAWarnings -Value 4 -Type DWord
Write-Output ("VBAWarnings set to 4 enable all (was: " + $prevWarn + ")")
