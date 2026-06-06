param(
  [Parameter(Mandatory = $true)]
  [string]$PostgresPassword,
  [string]$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe",
  [int]$Port = 5432
)

$env:PGPASSWORD = $PostgresPassword
$psql = @(
  "-U", "postgres", "-h", "localhost", "-p", "$Port", "-v", "ON_ERROR_STOP=1"
)

& $PsqlPath @psql -c "CREATE USER barokah WITH PASSWORD 'barokah';" 2>$null
& $PsqlPath @psql -c "ALTER USER barokah WITH PASSWORD 'barokah';" 2>$null
& $PsqlPath @psql -c "ALTER USER barokah CREATEDB;" 2>$null
$dbExists = & $PsqlPath @psql -tAc "SELECT 1 FROM pg_database WHERE datname='barokah_pos';"
if ($dbExists -ne "1") {
  & $PsqlPath @psql -c "CREATE DATABASE barokah_pos OWNER barokah;"
}
Write-Host "Selesai. DATABASE_URL=postgresql://barokah:barokah@localhost:$Port/barokah_pos"
