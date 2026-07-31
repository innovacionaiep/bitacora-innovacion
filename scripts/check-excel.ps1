try {
  $xl = New-Object -ComObject Excel.Application
  Write-Output ("Excel OK: " + $xl.Version)
  $xl.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
} catch {
  Write-Output ("NO_EXCEL: " + $_.Exception.Message)
}
