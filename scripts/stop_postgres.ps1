Write-Host "Stopping UTKAL PostgreSQL server on port 5433..."
& "d:\UTKAL AI\pgsql\bin\pg_ctl.exe" -D "d:\UTKAL AI\pgdata" stop -m fast
Write-Host "PostgreSQL stopped." -ForegroundColor Green
