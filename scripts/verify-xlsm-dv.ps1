$ErrorActionPreference = "Stop"
$path = "c:\Users\Paul\Documents\CURSOR\gestor-proyectos\src\lib\excel-import\assets\test-plantilla-proyectos.xlsm"
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
  $wb = $xl.Workbooks.Open($path)
  $ws = $wb.Worksheets.Item("Proyectos")
  # Column E = Sedes (5)
  $cell = $ws.Cells.Item(2, 5)
  $cell.Value2 = "Sede Norte"
  # Simulate second selection via invoking the event is hard; call logic by setting and Undo won't work the same.
  # Instead verify dropdown exists
  $hasDv = $false
  try {
    $null = $cell.Validation.Formula1
    $hasDv = $true
  } catch {}
  Write-Output ("Sedes DV: " + $hasDv)
  Write-Output ("Formula1: " + $cell.Validation.Formula1)
  $wb.Close($false)
  Write-Output "DV_OK"
} catch {
  Write-Output ("ERROR: " + $_.Exception.Message)
  throw
} finally {
  $xl.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
