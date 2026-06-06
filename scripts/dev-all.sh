#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker/docker-compose.dev.yml"

SKIP_DOCKER=false
SKIP_MIGRATE=false
WITH_MOBILE=false
NO_FALLBACK=false

for arg in "$@"; do
  case "$arg" in
    --skip-docker) SKIP_DOCKER=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
    --with-mobile) WITH_MOBILE=true ;;
    --no-fallback) NO_FALLBACK=true ;;
  esac
done

echo ""
echo "========================================"
echo " Barokah Core POS — Local Dev (All)"
echo "========================================"
echo ""

cd "$ROOT"

docker_available() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

wait_for_port() {
  local name="$1"
  local port="$2"
  local attempts="${3:-30}"
  local delay="${4:-2}"

  for ((i = 1; i <= attempts; i++)); do
    if (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1; then
      echo "[dev-all] $name siap (port $port)."
      return 0
    fi
    echo "[dev-all] Menunggu $name pada port $port... ($i/$attempts)"
    sleep "$delay"
  done
  return 1
}

enable_redis_disabled_fallback() {
  export REDIS_DISABLED=true
  echo "[dev-all] WARNING: $1"
  echo "[dev-all] WARNING: REDIS_DISABLED=true untuk sesi ini — API memakai inline queue (tanpa BullMQ)."
}

REDIS_READY=false

if [[ "$SKIP_DOCKER" == "false" ]]; then
  if docker_available; then
    if docker ps --filter "name=barokah-postgres" --filter "status=running" -q | grep -q . \
      && docker ps --filter "name=barokah-redis" --filter "status=running" -q | grep -q .; then
      echo "[dev-all] Docker infra (postgres + redis) sudah berjalan."
    else
      echo "[dev-all] Memulai Docker infra: postgres + redis..."
      docker compose -f "$COMPOSE_FILE" up -d --wait postgres redis || echo "[dev-all] WARNING: docker compose up gagal — coba: npm run docker:up"
    fi

    wait_for_port "PostgreSQL" 5433 || echo "[dev-all] WARNING: PostgreSQL belum merespons di port 5433."
    if wait_for_port "Redis" 6379; then
      REDIS_READY=true
    else
      enable_redis_disabled_fallback "Redis belum merespons di port 6379 setelah menunggu."
    fi
  else
    echo "[dev-all] WARNING: Docker tidak tersedia atau daemon tidak jalan."
    echo "[dev-all] WARNING: Jalankan Docker Desktop, lalu ulangi: npm run dev"
    enable_redis_disabled_fallback "Docker tidak tersedia — Redis diabaikan untuk sesi dev."
  fi
else
  echo "[dev-all] Lewati Docker (--skip-docker)."
  if wait_for_port "Redis" 6379 1 1; then
    REDIS_READY=true
  else
    enable_redis_disabled_fallback "Redis tidak terdeteksi di port 6379 (--skip-docker)."
  fi
fi

if [[ "$SKIP_MIGRATE" == "false" ]]; then
  echo "[dev-all] Menjalankan prisma migrate deploy..."
  npm run db:migrate:deploy || echo "[dev-all] WARNING: Migrasi gagal — cek DATABASE_URL."
else
  echo "[dev-all] Lewati migrasi (--skip-migrate)."
fi

if [[ "$NO_FALLBACK" == "true" ]]; then
  APPS_SCRIPT="dev:apps:strict"
else
  APPS_SCRIPT="dev:apps"
fi
if [[ "$WITH_MOBILE" == "true" ]]; then
  APPS_SCRIPT="dev:apps:mobile"
fi

echo ""
echo "[dev-all] Hot reload: API (nest --watch) + Web (next dev)"
echo "[dev-all] URL: API http://localhost:3000/api/v1 | Web http://localhost:3001"
echo ""

npm run "$APPS_SCRIPT"
