Add-Type -AssemblyName System.IO.Compression.FileSystem
$xlsm = "c:\Users\Paul\Documents\CURSOR\gestor-proyectos\src\lib\excel-import\assets\macro-host.xlsm"
$z = [System.IO.Compression.ZipFile]::OpenRead($xlsm)
$z.Entries | ForEach-Object { $_.FullName }
$ct = $z.GetEntry("[Content_Types].xml")
$sr = New-Object System.IO.StreamReader($ct.Open())
Write-Output "--- Content_Types ---"
Write-Output $sr.ReadToEnd()
$sr.Close()
$rels = $z.GetEntry("xl/_rels/workbook.xml.rels")
$sr2 = New-Object System.IO.StreamReader($rels.Open())
Write-Output "--- workbook.xml.rels ---"
Write-Output $sr2.ReadToEnd()
$sr2.Close()
$wb = $z.GetEntry("xl/workbook.xml")
$sr3 = New-Object System.IO.StreamReader($wb.Open())
Write-Output "--- workbook.xml ---"
Write-Output $sr3.ReadToEnd()
$sr3.Close()
$z.Dispose()
