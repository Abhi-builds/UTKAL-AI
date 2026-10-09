param(
    [string]$OutputFile = "d:\UTKAL AI\utkal_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
)

Write-Host "Creating backup of utkal_db to $OutputFile..."
& "d:\UTKAL AI\pgsql\bin\pg_dump.exe" -h 127.0.0.1 -p 5433 -U postgres -d utkal_db -F p -f $OutputFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully: $OutputFile" -ForegroundColor Green
} else {
    Write-Host "Backup failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
