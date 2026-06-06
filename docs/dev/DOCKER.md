# Menjalankan Barokah Core POS dengan Docker

Panduan singkat untuk menjalankan seluruh stack (PostgreSQL, Redis, API NestJS, Web Next.js) di Docker.

## Prasyarat

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) atau Docker Engine + Compose v2
- Node.js **tidak wajib** jika hanya menjalankan full stack via Docker

## Dua Mode Docker

| Mode | Perintah | Isi |
|------|----------|-----|
| **Infra saja** | `npm run docker:up` | PostgreSQL + Redis (dev lokal: API/Web di host dengan `npm run dev`) |
| **Full stack** | `npm run docker:full:up` | PostgreSQL + Redis + API + Web |

File compose:

- Infra: `docker/docker-compose.dev.yml`
- Full stack: `docker/docker-compose.yml`

## Full Stack — Langkah Cepat

Dari root monorepo:

```bash
# 1. Build & jalankan semua service
npm run docker:full:up

# 2. Tunggu hingga healthy (±2–5 menit pertama kali karena build image)
docker compose -f docker/docker-compose.yml ps
```

### URL Akses

| Service | URL |
|---------|-----|
| Web (kasir / admin) | http://localhost:3001 |
| API | http://localhost:3000/api/v1 |
| Health check API | http://localhost:3000/api/v1/health |
| PostgreSQL (dari host) | `localhost:5433` |
| Redis (dari host) | `localhost:6379` |

### Kredensial Login (Dev Seed)

Setelah container `db-migrate` selesai, data demo tersedia:

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@barokah.local` | `Owner123!` |
| Manager | `manager@barokah.local` | `Manager123!` |
| Kasir | `kasir@barokah.local` | `Kasir123!` |

> **Peringatan:** Password di atas hanya untuk development/demo. Jangan dipakai di production.

## Migrasi & Seed Database

Full stack menjalankan otomatis saat startup:

1. **`db-migrate`** — `prisma migrate deploy` + seed (jika `SEED_DATABASE=true`, default)
2. **`api`** — start setelah migrate sukses
3. **`web`** — start setelah API healthy

Nonaktifkan seed (mis. production-like):

```bash
SEED_DATABASE=false npm run docker:full:up
```

Jalankan seed manual ulang:

```bash
docker compose -f docker/docker-compose.yml run --rm db-migrate sh -c "npx tsx prisma/seed.ts"
```

## Variabel Lingkungan

Salin `.env.example` ke `.env` jika perlu override. Untuk full stack Docker, compose sudah set default internal:

| Variabel | Default (Docker) | Keterangan |
|----------|------------------|------------|
| `DATABASE_URL` | `postgresql://barokah:barokah@postgres:5432/barokah_pos` | Internal network |
| `REDIS_URL` | `redis://redis:6379` | Internal network |
| `JWT_SECRET` | `dev-docker-secret-change-me` | Ganti di production |
| `JWT_REFRESH_SECRET` | `dev-docker-refresh-secret-change-me` | Ganti di production |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | URL API dari browser host |
| `SEED_DATABASE` | `true` | Seed demo saat migrate |

Port PostgreSQL di-host **`5433`** (bukan 5432) agar tidak bentrok dengan PostgreSQL lokal.

## Perintah Berguna

```bash
# Lihat log semua service
npm run docker:full:logs

# Stop full stack (data DB tetap di volume)
npm run docker:full:down

# Stop + hapus volume (reset database)
docker compose -f docker/docker-compose.yml down -v

# Rebuild image saja
npm run docker:full:build

# Validasi file compose
docker compose -f docker/docker-compose.yml config
```

## Workflow Dev Hybrid (Disarankan Tim)

**Satu perintah** (infra + migrate + API + Web hot reload):

```bash
npm install
npm run dev          # alias: npm run dev:all
```

Detail lengkap: **[LOCAL-DEV.md](./LOCAL-DEV.md)**

Atau langkah manual:

```bash
npm run docker:up          # postgres + redis saja
npm install
npm run db:migrate
npm run db:seed
npm run dev:apps           # API + Web hot-reload (tanpa auto-docker)
```

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Port 3000/3001/5433/6379 sudah dipakai | Stop proses lain atau ubah mapping port di `docker/docker-compose.yml` |
| `db-migrate` gagal | Cek log: `docker compose -f docker/docker-compose.yml logs db-migrate` |
| Web tidak bisa login | Pastikan `NEXT_PUBLIC_API_URL=http://localhost:3000` (bukan hostname internal `api`) |
| Build lambat pertama kali | Normal — multi-stage build monorepo; build berikutnya pakai cache Docker |
| **`docker info` hang / HTTP 500 (Windows)** | Restart Docker Desktop; `npm run dev` fallback otomatis setelah timeout — lihat **[LOCAL-DEV.md — Windows Docker](./LOCAL-DEV.md#windows--docker-desktop-macet--hang)** |
| Hanya butuh Postgres + Redis (tanpa build image) | `npm run docker:up` + hybrid dev — **[LOCAL-DEV.md](./LOCAL-DEV.md)** |

## File Terkait

- `apps/api/Dockerfile` — image API (multi-stage + target `migrator`)
- `apps/web/Dockerfile` — image Web (Next.js standalone)
- `docker/docker-compose.dev.yml` — infra dev
- `docker/docker-compose.yml` — full stack

Maintainer: **Yoga** (DevOps)
