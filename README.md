# Barokah Core POS

[![CI](https://github.com/zackedus/POS/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/zackedus/POS/actions/workflows/ci.yml)

Professional Point of Sale system — Web + Mobile.

**Repository:** [github.com/zackedus/POS](https://github.com/zackedus/POS)  
**Perusahaan:** Barokah Core  
**Pemilik Proyek:** Pak Zaki  
**CEO:** Budi Santoso  
**Stack:** Node.js 22 · NestJS · PostgreSQL · Prisma · Next.js · Expo

> **Bahasa:** Tim agent berkomunikasi dengan pemilik proyek (**Pak Zaki**) dalam **Bahasa Indonesia**. CEO **Budi Santoso** mengoordinasi tim dan melaporkan ke Pak Zaki. Kode dan dokumentasi teknis internal tetap **English**.

## Quick Start

```bash
# 1. Clone & install
npm install

# 2. Environment
cp .env.example .env

# 3. Start database
npm run docker:up

# 4. Database migrate & seed
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Run all apps
npm run dev
```

### Database migrate (production / CI)

```bash
npm run db:migrate:deploy
npm run db:seed   # optional — dev/demo data only
```

### Troubleshooting migration P3006 (ghost migration)

Jika `prisma migrate dev` gagal dengan error `Migration 20260605185140_new` dan kolom `is_purchase_unit` tidak ada:

1. Hapus folder lokal jika masih ada: `packages/database/prisma/migrations/20260605185140_new`
2. Bersihkan entri hantu di database:
   ```sql
   DELETE FROM "_prisma_migrations" WHERE migration_name = '20260605185140_new';
   ```
3. Reset dev DB (menghapus semua data) lalu terapkan ulang rantai migrasi yang sudah diperbaiki:
   ```bash
   cd packages/database
   npx prisma migrate reset --force
   npm run seed --workspace=@barokah/database
   ```

Rantai migrasi saat ini: index `is_purchase_unit` digabung ke `20260606140000_multi_unit_conversion`; `online_order_expired_status` dipindah ke timestamp `20260606140200` agar tidak bentrok urutan.

| App | URL | Port |
|-----|-----|------|
| API | http://localhost:3000 | 3000 |
| Web | http://localhost:3001 | 3001 |
| Mobile | Expo DevTools | — |

## CI & Testing

GitHub Actions menjalankan `lint`, `typecheck`, `test`, dan `build` pada push/PR ke `main`, `master`, atau `develop`.

```bash
npm run lint && npm run typecheck && npm run test && npm run build
npm run smoke          # API health (butuh API :3000)
npm run test:e2e:install   # sekali — install browser Playwright
PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e   # butuh web :3001 + API :3000 + seed
```

E2E smoke (3 path): login owner → dashboard, login kasir → `/pos`, storefront katalog.

## Deployment (Docker / Staging)

Stack lengkap via Docker Compose — pola **Yoga**:

```bash
# Infra saja (Postgres + Redis) — dev lokal
npm run docker:up

# Full stack: postgres + redis + migrate + seed + api + web
npm run docker:full:up
```

| Service | URL (default) | Catatan |
|---------|---------------|---------|
| API | http://localhost:3000 | Health: `/api/v1/health` |
| Web | http://localhost:3001 | `NEXT_PUBLIC_API_URL` → API |
| Postgres | localhost:5433 | User/pass/db: `barokah` / `barokah` / `barokah_pos` |

**Staging checklist:**

1. Set `JWT_SECRET`, `JWT_REFRESH_SECRET` (bukan default dev)
2. `npm run db:migrate:deploy` (otomatis via service `db-migrate` di compose)
3. Seed opsional: `SEED_DATABASE=true` (default) — matikan di prod
4. Smoke: `npm run smoke` + login web manual

Log container: `npm run docker:full:logs` · Stop: `npm run docker:full:down`

## Standar Saat Port API Bentrok (Windows PowerShell)

Jika muncul error runtime Nest `EADDRINUSE:3000`, gunakan alur standar berikut:

```powershell
# 1) Bersihkan proses pemakai port 3000 lalu jalankan API
npm run dev:api:clean

# 2) Jika port tetap bentrok, jalankan fallback otomatis
npm run dev:api:fallback
```

Keterangan:
- `dev:api:clean` akan cek proses di `API_PORT` (default `3000`), menghentikan proses bentrok, lalu menjalankan API.
- `dev:api:fallback` akan mencoba `3000`, dan jika masih dipakai API otomatis pindah ke port kosong berikutnya (mis. `3001`, `3002`, dst).
- API juga punya fallback internal saat startup (`API_PORT_FALLBACK=true` secara default). Set `API_PORT_FALLBACK=false` jika ingin strict hanya di satu port.

Untuk cek/bersihkan port saja (tanpa start API):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-api-safe.ps1 -Port 3000 -KillOnly
```

## Tim Agent

Lihat [AGENTS.md](./AGENTS.md) untuk struktur tim (**11 anggota**), protokol komunikasi, dan cara memanggil agent spesialis.

**Stack frontend (keputusan Pak Zaki, 1 Jun 2026):** Tetap **React** — Next.js 15 + Expo SDK 52. Vue/Nuxt tidak digunakan. Lihat [ADR-001](docs/decisions/ADR-001-REACT-STACK.md).

| Nama | Agent ID | Fokus |
|------|----------|-------|
| **Budi Santoso** (CEO) | `@budi` | Koordinasi & arsitektur |
| **Rina Wulandari** | `@pos-expert` | Checklist kebutuhan POS |
| **Dewi Kartika** | `@analyst` | User story & AC |
| **Hendra Pratama** | `@planner` | Sprint & roadmap |
| **Fitri Nugroho** | `@docs` | Dokumentasi |
| **Arif Hidayat** | `@integration` | Payment & hardware |
| **Eko Susilo** | `@algorithm` | Pricing & stok |
| **Maya Anggraini** | `@ui-ux` | Wireframe & UX kasir |
| **Fajar Ramadhan** | `@senior-dev` | Backend API, Prisma, kontrak API |
| **Dimas Pratama** | `@frontend` | Next.js & Expo — implementasi UI |
| **Yoga Permana** | `@devops` | CI/CD & deploy |

## Struktur Proyek

```
apps/api      → NestJS backend
apps/web      → Next.js web POS
apps/mobile   → Expo mobile POS
packages/shared    → Shared types & constants
packages/database  → Prisma schema
docs/         → Architecture, requirements, API docs
.cursor/skills/    → Agent skills
```

## Dokumentasi

> 📚 **[Indeks Dokumentasi Lengkap](./docs/INDEX.md)** — pintu masuk utama; navigasi per role, kategori, dan tag.

- [Indeks Dokumentasi (INDEX.md)](./docs/INDEX.md)
- [Folder docs/](./docs/README.md)
- [Arsitektur](./docs/architecture/OVERVIEW.md)
- [MVP Checklist](./docs/requirements/MVP-CHECKLIST.md)

## License

Proprietary — Barokah Core © 2026
