# PowerShell script to restart the backend server
Write-Host "Stopping backend server on port 3000..." -ForegroundColor Yellow

# Find and kill process on port 3000
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Stop-Process -Id $process -Force
    Write-Host "✅ Stopped process $process" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "⚠️  No process found on port 3000" -ForegroundColor Yellow
}

Write-Host "`nStarting backend server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Cyan

# Start the server
npm start

