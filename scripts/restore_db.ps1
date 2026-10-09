param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

if (-not (Test-Path $BackupFile)) {
    Write-Host "Error: File $BackupFile does not exist." -ForegroundColor Red
    exit 1
}

Write-Host "Restoring utkal_db from $BackupFile..."
& "d:\UTKAL AI\pgsql\bin\psql.exe" -h 127.0.0.1 -p 5433 -U postgres -d utkal_db -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database restored successfully." -ForegroundColor Green
} else {
    Write-Host "Restore failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
