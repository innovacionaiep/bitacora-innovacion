# Genera plantilla-proyectos-macros.xlsm con VBA de multi-select y extrae vbaProject.bin
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $root "src\lib\excel-import\assets"
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
$xlsmPath = Join-Path $assetsDir "macro-host.xlsm"
$binPath = Join-Path $assetsDir "vbaProject.bin"
$vbaPath = Join-Path $assetsDir "MultiSelectImport.bas.txt"

$vbaCode = @'
Attribute VB_Name = "ThisWorkbook"
Private Sub Workbook_SheetChange(ByVal Sh As Object, ByVal Target As Range)
    On Error GoTo CleanExit
    If Target Is Nothing Then GoTo CleanExit
    If Target.CountLarge <> 1 Then GoTo CleanExit
    If Target.Row < 2 Then GoTo CleanExit
    If Sh Is Nothing Then GoTo CleanExit

    Dim sheetName As String
    sheetName = CStr(Sh.Name)
    If StrComp(sheetName, "Proyectos", vbTextCompare) <> 0 _
       And StrComp(sheetName, "Participantes", vbTextCompare) <> 0 Then
        GoTo CleanExit
    End If

    Dim hdr As String
    hdr = Trim$(CStr(Sh.Cells(1, Target.Column).Value2))
    If hdr = "" Then GoTo CleanExit

    Dim multi As Boolean
    multi = False
    Select Case LCase$(hdr)
        Case "sedes", "comunas", "escuelas", "carreras", "asignaturas", "gruposinteres"
            multi = True
    End Select
    If Not multi Then GoTo CleanExit

    Dim newVal As String
    Dim oldVal As String
    newVal = Trim$(CStr(Target.Value2))

    Application.EnableEvents = False
    Application.Undo
    oldVal = Trim$(CStr(Target.Value2))

    If newVal = "" Then
        Target.Value = oldVal
        GoTo CleanExit
    End If

    If oldVal = "" Then
        Target.Value = newVal
        GoTo CleanExit
    End If

    Dim parts() As String
    parts = Split(oldVal, ";")
    Dim found As Boolean
    Dim out As String
    Dim i As Long
    Dim token As String
    found = False
    out = ""
    For i = LBound(parts) To UBound(parts)
        token = Trim$(CStr(parts(i)))
        If token <> "" Then
            If StrComp(token, newVal, vbTextCompare) = 0 Then
                found = True
            Else
                If out <> "" Then out = out & "; "
                out = out & token
            End If
        End If
    Next i

    If found Then
        Target.Value = out
    Else
        Target.Value = oldVal & "; " & newVal
    End If

CleanExit:
    Application.EnableEvents = True
End Sub
'@

Set-Content -Path $vbaPath -Value $vbaCode -Encoding ASCII

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
$xl.AskToUpdateLinks = $false

try {
  # Trust access to VBA project model is required
  $wb = $xl.Workbooks.Add()
  $ws = $wb.Worksheets.Item(1)
  $ws.Name = "Proyectos"
  $ws.Cells.Item(1, 1).Value2 = "Nombre"
  $ws.Cells.Item(1, 5).Value2 = "Sedes"

  # Add a second sheet name placeholder
  $ws2 = $wb.Worksheets.Add()
  $ws2.Name = "Instrucciones"
  $ws2.Cells.Item(1, 1).Value2 = "Multi-select macro host"

  $vbProj = $wb.VBProject
  $thisWb = $vbProj.VBComponents.Item("ThisWorkbook")
  $codeMod = $thisWb.CodeModule
  if ($codeMod.CountOfLines -gt 0) {
    $codeMod.DeleteLines(1, $codeMod.CountOfLines)
  }
  # Skip Attribute line when injecting via CodeModule
  $inject = ($vbaCode -split "`r?`n" | Where-Object { $_ -notmatch '^Attribute VB_Name' }) -join "`r`n"
  $codeMod.AddFromString($inject)

  if (Test-Path $xlsmPath) { Remove-Item $xlsmPath -Force }
  # 52 = xlOpenXMLWorkbookMacroEnabled
  $wb.SaveAs($xlsmPath, 52)
  $wb.Close($false)

  Write-Output "Saved: $xlsmPath"
} catch {
  Write-Output ("ERROR: " + $_.Exception.Message)
  if ($_.Exception.Message -match "programmatic access|VBProject|trusted") {
    Write-Output "HINT: Enable Excel Trust Center > Macro Settings > Trust access to the VBA project object model"
  }
  throw
} finally {
  $xl.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

# Extract vbaProject.bin from xlsm (zip)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$tmp = Join-Path $env:TEMP ("xlsm-extract-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  [System.IO.Compression.ZipFile]::ExtractToDirectory($xlsmPath, $tmp)
  $srcBin = Join-Path $tmp "xl\vbaProject.bin"
  if (-not (Test-Path $srcBin)) { throw "vbaProject.bin not found in xlsm" }
  Copy-Item $srcBin $binPath -Force
  Write-Output "Extracted: $binPath"
  Write-Output ("Size: " + (Get-Item $binPath).Length)
} finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
