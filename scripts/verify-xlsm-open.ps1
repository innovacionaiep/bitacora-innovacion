$ErrorActionPreference = "Stop"
$path = "c:\Users\Paul\Documents\CURSOR\gestor-proyectos\src\lib\excel-import\assets\test-plantilla-proyectos.xlsm"
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
  $wb = $xl.Workbooks.Open($path)
  $names = @()
  foreach ($ws in $wb.Worksheets) { $names += $ws.Name }
  Write-Output ("Sheets: " + ($names -join ", "))
  $code = $wb.VBProject.VBComponents.Item("ThisWorkbook").CodeModule
  Write-Output ("VBA lines: " + $code.CountOfLines)
  if ($code.CountOfLines -gt 0) {
    Write-Output ($code.Lines(1, [Math]::Min(5, $code.CountOfLines)))
  }
  $wb.Close($false)
  Write-Output "OPEN_OK"
} catch {
  Write-Output ("ERROR: " + $_.Exception.Message)
  throw
} finally {
  $xl.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
