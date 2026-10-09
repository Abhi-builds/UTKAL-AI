Write-Host "Starting UTKAL PostgreSQL server on 127.0.0.1:5433..."
$dataDir = "d:\UTKAL AI\pgdata"
$bin = "d:\UTKAL AI\pgsql\bin\postgres.exe"

if (-not (Test-Path $dataDir)) {
    Write-Host "Initializing PostgreSQL cluster at $dataDir..."
    & "d:\UTKAL AI\pgsql\bin\initdb.exe" -D $dataDir -U postgres --auth=trust
}

Start-Process -FilePath $bin -ArgumentList "-D `"$dataDir`" -p 5433" -WindowStyle Hidden
Start-Sleep -Seconds 2

& "d:\UTKAL AI\pgsql\bin\psql.exe" -h 127.0.0.1 -p 5433 -U postgres -c "SELECT version();"
if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL is running and accessible." -ForegroundColor Green
} else {
    Write-Host "Could not confirm PostgreSQL status." -ForegroundColor Yellow
}
