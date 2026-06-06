# Sprint 1 — Progress Report

> **Tanggal:** 1 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Status:** Foundation P0 — implementasi kode selesai; infra DB menunggu Docker

---
**Budi** · CEO  
Halo Pak Zaki, koordinasi update: Fajar menyelesaikan health check DB + RBAC smoke, Dimas menyelesaikan polish login dan tombol logout `/pos`.
---

---

## Update Lanjutan — 2 Juni 2026 (Sprint 1 Closure)

| Item Sprint 1 tersisa | Status | Bukti verifikasi |
|---|---|---|
| Health endpoint + DB check | ✅ Selesai | `GET /api/v1/health` → `success: true`, `services.database: up` |
| RBAC smoke kasir ke owner-only | ✅ Selesai | `GET /api/v1/auth/owner-only` oleh kasir → `INSUFFICIENT_PERMISSION` |
| Login UI polish (Bahasa + loading) | ✅ Selesai | Label Indonesia + tombol disabled/loading saat submit |
| Logout button di `/pos` | ✅ Selesai | Logout clear token dan redirect ke `/login` |
| Build monorepo | ✅ Selesai | `npm run build` PASS |
| Lint monorepo | ✅ Selesai | `npm run lint` PASS (setelah bersih file JS hasil compile) |

### Status Sprint 1

- **Sprint 1 engineering scope: DONE**
- Docker Desktop masih bermasalah (API 500), namun Sprint 1 tidak terblokir karena PostgreSQL lokal sudah dipakai untuk verifikasi E2E.

---

## Koordinasi Tim

| Agent | Peran Sprint 1 | Deliverable hari ini |
|-------|----------------|----------------------|
| **Yoga** · DevOps | Infra | `.env` dari template, `docker:up` (blocked) |
| **Fajar** · Senior Developer | Backend | Prisma seed, migration `init`, Auth API + guards |
| **Dimas** · Senior Frontend | Web | Halaman `/login`, integrasi token localStorage |
| **Budi** · CEO | Orchestration | Eksekusi Sprint 1, dokumen ini |

---

## Yang Sudah Selesai

### Phase A — Infrastructure (Yoga)

- [x] `.env` dibuat dari `.env.example` (root + `packages/database/.env` untuk Prisma CLI)
- [ ] `npm run docker:up` — **BLOCKED** (Docker Desktop API 500 — lihat Blockers)
- [x] `npm run db:generate` — Prisma client generated
- [x] Migration SQL `init` dibuat: `packages/database/prisma/migrations/20260601000000_init/`
- [ ] `npm run db:migrate` — menunggu PostgreSQL aktif
- [ ] Verifikasi health Docker — menunggu Docker

### Phase B — Database Seed (Fajar)

- [x] `packages/database/prisma/seed.ts` — tenant, outlet, 3 user (bcrypt)
- [x] Script `npm run db:seed` di root + workspace database
- [ ] Seed dijalankan — menunggu migrate

**Kredensial dev (hanya seed comment + dokumen ini):**

| Email | Role | Password |
|-------|------|----------|
| owner@barokah.local | OWNER | Owner123! |
| manager@barokah.local | MANAGER | Manager123! |
| kasir@barokah.local | CASHIER | Kasir123! |

### Phase C — Auth API (Fajar)

- [x] `apps/api/src/modules/auth/` — login, refresh, me, owner-only probe
- [x] `POST /api/v1/auth/login` — access + refresh token
- [x] `POST /api/v1/auth/refresh`
- [x] `GET /api/v1/auth/me`
- [x] `JwtAuthGuard`, `RolesGuard`
- [x] `DatabaseModule` + `PrismaService`
- [x] DTO class-validator, envelope error existing
- [x] `AuthModule` registered di `AppModule`
- [x] `GET /api/v1/health` — sudah ada sebelumnya

### Phase D — Login UI (Dimas)

- [x] `apps/web/src/app/login/page.tsx`
- [x] `@barokah/ui` Button + Input
- [x] `apps/web/src/lib/auth.ts` — API client
- [x] Token: **localStorage** (`barokah_access_token`, `barokah_refresh_token`) — dev MVP; production → httpOnly cookie
- [x] Redirect sukses → `/pos`
- [x] Error inline Bahasa Indonesia
- [x] Home: tombol **Masuk** → `/login`

### Phase E — Verify

- [x] `npm run build` — **PASS** (semua workspace)
- [ ] Login E2E curl — menunggu DB + API running
- [x] Dokumen progress ini

---

## Cara Menjalankan (Pak Zaki)

### 1. Perbaiki Docker (jika belum jalan)

```powershell
# Restart Docker Desktop, lalu:
cd "g:\baru 2026\juni\pos"
npm run docker:up
docker ps   # harus ada barokah-postgres + barokah-redis healthy
```

### 2. Database migrate + seed

```powershell
cd "g:\baru 2026\juni\pos"
npm run db:migrate    # apply migration init
npm run db:seed       # data demo
```

### 3. Jalankan API + Web (2 terminal)

```powershell
# Terminal 1 — API (port 3000)
npm run dev --workspace=@barokah/api

# Terminal 2 — Web (port 3001)
npm run dev --workspace=@barokah/web
```

### 4. Test login

**Browser:** http://localhost:3001/login → email `kasir@barokah.local` / password `Kasir123!` → redirect `/pos`

**curl:**

```powershell
curl -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"kasir@barokah.local","password":"Kasir123!"}'
```

**Profil (ganti TOKEN):**

```powershell
curl http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer TOKEN"
```

---

## Blockers

| Blocker | Dampak | Mitigasi |
|---------|--------|----------|
| Docker Desktop API 500 | PostgreSQL/Redis tidak start | Restart Docker Desktop; `docker compose` ulang |
| DB belum migrate | Login API gagal connect | Jalankan langkah 2 setelah Docker OK |

---

## Next Steps (Sprint 1 remainder)

1. Yoga: fix Docker di mesin Pak Zaki, verifikasi `docker compose` healthy
2. Fajar: `db:migrate` + `db:seed`, smoke test auth + RBAC owner-only
3. Dimas: refresh token on 401 (S1-09), protect `/pos` route
4. Fitri: `docs/api/AUTH.md` setelah contract freeze
5. Eko / Arif / Fitri: spec docs parallel (S1-12–S1-14)
6. Budi: demo login E2E untuk sprint review 15 Jun

---

*Dokumen ini di-maintain selama Sprint 1 · Barokah Core POS*

---

## Local Run Verification (1 Jun 2026 — eksekusi agent)

**Mesin:** Windows 10, Node v22.22.0, npm 11.12.1

| Langkah | Hasil | Catatan |
|---------|--------|---------|
| `.env` | OK | Sudah ada (tidak perlu copy) |
| `npm run docker:up` | **GAGAL** | Docker Desktop API **500** (`dockerDesktopLinuxEngine` — `docker version` / pull image gagal) |
| Port 5432 | **Konflik potensial** | **PostgreSQL 18 lokal** (`postgres.exe` PID 6312) sudah listen; bukan container `barokah-postgres` |
| `npm run db:generate` | **OK** | Prisma client generated |
| `npm run db:migrate` | **GAGAL** | P1000 — user `barokah` / password dari `.env.example` tidak valid di PostgreSQL lokal |
| `npm run db:seed` | **GAGAL** | Sama (auth DB) |
| `npm run dev --workspace=@barokah/web` | **JALAN** | http://localhost:3001 — `/login` HTTP **200** |
| `npm run dev --workspace=@barokah/api` | **GAGAL** | `nest start --watch` cari `dist/main` (output build nested: `dist/apps/api/src/main.js`) |
| API (workaround tsx) | **Hampir OK** | Nest bootstrap + route map OK; crash saat Prisma connect (P1000 auth) |
| `POST /auth/login` curl | **Tidak diuji** | API tidak stay-up tanpa DB |
| Redis `:6379` | **Tidak aktif** | Container Redis tidak jalan (Docker down) |

### URL

- Web (jalan): **http://localhost:3001/login**
- API (target): **http://localhost:3000/api/v1/health** — tidak tersedia sampai DB OK

### Perbaikan sementara saat run (belum commit)

- `JwtStrategy`: `@Inject(ConfigService)` — perbaiki DI PassportStrategy
- `AuthModule`: import `ConfigModule` eksplisit

### Workaround DB (pilih salah satu)

**A — Docker (disarankan setelah Docker Desktop sehat):**

1. Stop/reconfigure PostgreSQL 18 lokal jika port 5432 bentrok, **atau** ubah port mapping di `docker/docker-compose.dev.yml`.
2. `npm run docker:up` → `docker ps` (postgres + redis healthy)
3. `npm run db:migrate` → `npm run db:seed`

**B — PostgreSQL 18 lokal (tanpa Docker):**

Jalankan sebagai superuser `postgres` (password instalasi Anda):

```sql
CREATE USER barokah WITH PASSWORD 'barokah';
CREATE DATABASE barokah_pos OWNER barokah;
GRANT ALL PRIVILEGES ON DATABASE barokah_pos TO barokah;
```

Lalu pastikan `DATABASE_URL=postgresql://barokah:barokah@localhost:5432/barokah_pos` di `.env`.

**C — Kredensial lokal lain:** sesuaikan `DATABASE_URL` di `.env` ke user/password PostgreSQL yang valid.

### Perintah jalankan (setelah DB OK)

```powershell
cd "g:\baru 2026\juni\pos"
npm run db:migrate
npm run db:seed

# Terminal 1 — API (jika nest dev masih gagal dist/main, sementara):
Get-Content ".env" | ForEach-Object { if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.*)$') { Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim().Trim('"') } }
Set-Location apps\api
npx tsx src/main.ts

# Terminal 2 — Web
npm run dev --workspace=@barokah/web
```

**Login dev:** `kasir@barokah.local` / `Kasir123!`

### Status akhir run

| Komponen | Status |
|----------|--------|
| Docker Postgres/Redis | **Blocked** (Docker 500) |
| Database migrate/seed | **Blocked** (auth `barokah`) |
| Web dev server | **Running** (3001) |
| API dev server | **Blocked** (DB + `nest dev` entry path) |
| Login E2E | **Blocked** |


---

## Lanjutan Run (1 Jun 2026 — lanjutkan)

### Perbaikan kode (diterapkan)

| Area | Perubahan |
|------|-----------|
| **API Nest dev** | `nest-cli.json`: `entryFile`, `tsConfigPath: tsconfig.build.json`, `deleteOutDir: false` (hindari race watch) |
| **API build output** | `tsconfig.build.json` + `rootDir: ./src`, `paths: {}` → emit `dist/main.js` |
| **@barokah/shared** | Build **CommonJS** (Nest runtime; sebelumnya ESM pecah di `require`) |
| **Docker dev** | Postgres host port **5433:5432** (hindari bentrok PG 18 di 5432) |
| **.env.example** | Komentar `DATABASE_URL` port 5433 + restore baris DATABASE_URL |
| **Web /pos** | `apps/web/src/app/pos/layout.tsx` — redirect ke `/login` tanpa token |
| **Script** | `scripts/setup-local-postgres.ps1` — buat user/db `barokah` di PG lokal |

### Hasil eksekusi

| Langkah | Hasil |
|---------|--------|
| `docker ps` / `npm run docker:up` | **GAGAL** — Docker Desktop API **500** (sama) |
| Port 5432 | **PG 18 lokal** (PID 6312) masih listen |
| `npm run db:migrate` / `db:seed` | **GAGAL** — P1000 user `barokah` belum ada (butuh password superuser `postgres`) |
| `npm run build` (monorepo) | **PASS** |
| `nest start --watch` (API) | **OK** — route map + bootstrap; crash hanya saat Prisma connect (P1000) |
| Login E2E curl | **Belum** — menunggu DB |
| Web :3001 | Perlu di-start ulang jika terminal ditutup |

### Blocker tersisa (1 langkah manual Pak Zaki)

**Pilih A atau B:**

**A — Docker (setelah Docker Desktop sehat):**

```powershell
cd "g:\baru 2026\juni\pos"
npm run docker:up
# Update .env + packages/database/.env:
# DATABASE_URL=postgresql://barokah:barokah@localhost:5433/barokah_pos
npm run db:migrate
npm run db:seed
```

**B — PostgreSQL 18 lokal (tanpa Docker):**

```powershell
cd "g:\baru 2026\juni\pos"
.\scripts\setup-local-postgres.ps1 -PostgresPassword "PASSWORD_POSTGRES_ANDA"
npm run db:migrate
npm run db:seed
```

### Jalankan stack (setelah DB OK)

```powershell
cd "g:\baru 2026\juni\pos"
npm run dev --workspace=@barokah/api
npm run dev --workspace=@barokah/web
```

**Test:** `GET http://localhost:3000/api/v1/health` · login `kasir@barokah.local` / `Kasir123!` · http://localhost:3001/login

### Status akhir lanjutan

| Komponen | Status |
|----------|--------|
| Docker Postgres/Redis | **Blocked** (Docker 500) |
| Database migrate/seed | **Blocked** (kredensial `barokah` / setup PG) |
| API `nest dev` | **Fixed** — siap setelah DB |
| Web + guard `/pos` | **Siap** |
| Login E2E | **Blocked** (DB) |


---

## Lanjutan Run (1 Jun 2026 — DB unblock + E2E login)

### Yang dilakukan

| Langkah | Hasil |
|---------|--------|
| `docker ps` / `npm run docker:up` | **GAGAL** — Docker Desktop API **500** (belum pulih) |
| PostgreSQL 18 lokal | **OK** — `scripts/setup-local-postgres.ps1` + `ALTER USER barokah CREATEDB` |
| `prisma migrate deploy` + `npm run db:seed` | **OK** — schema `init` + 3 user demo |
| `npm run dev --workspace=@barokah/api` | **OK** — http://localhost:3000 |
| `npm run dev --workspace=@barokah/web` | **OK** — http://localhost:3001/login |
| `GET /api/v1/health` | **OK** — `{ success, data.status: ok }` |
| `POST /api/v1/auth/login` (kasir) | **OK** — access + refresh token |
| Web auth | **OK** — `authFetch` + refresh on **401** (`apps/web/src/lib/auth.ts`) |

### Konfigurasi DB aktif

- **Tanpa Docker** — PG 18 di **localhost:5432**
- `DATABASE_URL=postgresql://barokah:barokah@localhost:5432/barokah_pos` (root + `packages/database/.env`)
- Jika Docker nanti sehat: port **5433** (lihat `.env.example`)

### Catatan migrate

- `npm run db:migrate` (`migrate dev`) butuh user DB bisa buat shadow DB — script setup sekarang grant **CREATEDB**.
- Jika `migrate dev` gagal EPERM saat generate (API sedang jalan), hentikan API sebentar atau gunakan `npx prisma migrate deploy` di `packages/database`.

### Status akhir (unblock)

| Komponen | Status |
|----------|--------|
| Docker Postgres/Redis | **Blocked** (Docker 500) — **tidak wajib** selama PG lokal dipakai |
| Database migrate/seed | **OK** |
| API dev server | **Running** |
| Web dev server | **Running** |
| Login E2E (curl) | **OK** |
| Refresh on 401 (web) | **Implemented** |

### Untuk Pak Zaki

1. **Docker:** restart Docker Desktop bila ingin Redis + Postgres container (opsional untuk Sprint 1 auth).
2. **Dev stack:** dua terminal — `npm run dev --workspace=@barokah/api` dan `@barokah/web`.
3. **Login:** http://localhost:3001/login — `kasir@barokah.local` / `Kasir123!`

---

## Lanjutan Run (1 Jun 2026 — Sprint 1 complete + Sprint 2 start)

### Sprint 1 remainder (selesai)

| Item | Status | Bukti |
|------|--------|-------|
| Health endpoint dengan DB check | **OK** | `GET /api/v1/health` return `services.database = up` |
| RBAC smoke kasir vs owner-only | **OK** | `GET /api/v1/auth/owner-only` oleh kasir → `INSUFFICIENT_PERMISSION` |
| Login UI polish (Bahasa + loading) | **OK** | Label/placeholder Indonesia + disable submit saat loading |
| Logout button di `/pos` | **OK** | Tombol logout clear token + redirect `/login` |

### Verifikasi cepat

| Perintah | Hasil |
|----------|-------|
| `npm run build` | **PASS** |
| Login kasir + `GET /auth/me` | **PASS** |
| `GET /health` + DB | **PASS** |

### Status Sprint 1

- **Sprint 1 technical foundation: DONE**
- Blocker Docker Desktop tetap ada, namun tidak memblokir auth E2E karena PostgreSQL lokal sudah aktif.
