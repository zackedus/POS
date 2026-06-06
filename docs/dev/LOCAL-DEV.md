# Panduan Dev Lokal — Barokah Core POS

Satu perintah untuk menjalankan **infra + API + Web** dengan **hot reload**.

## Prasyarat

- **Node.js 22 LTS** + npm
- **Docker Desktop** (disarankan) — PostgreSQL + Redis via compose
- Salin `.env.example` → `.env` (sesuaikan `DATABASE_URL` jika perlu)

## Satu Perintah (Disarankan)

Dari root monorepo:

```powershell
npm install
npm run dev
```

Alias yang sama:

```bash
npm run dev:all
```

### Apa yang Dijalankan (Urutan)

1. **Docker infra** — `postgres` + `redis` dari `docker/docker-compose.dev.yml` (skip jika sudah jalan)
2. **Health wait** — tunggu port `5433` (Postgres) dan `6379` (Redis)
3. **Migrasi DB** — `prisma migrate deploy` (non-interaktif)
4. **API + Web paralel** — dengan penanganan konflik port:
   - API: `nest start --watch` → http://localhost:3000
   - Web: `next dev` → http://localhost:3001

### Hot Reload

| Service | Perintah internal | Hot reload |
|---------|-------------------|------------|
| API | `nest start --watch` | ✅ otomatis saat file `.ts` berubah |
| Web | `next dev` | ✅ Fast Refresh Next.js |

Docker **hanya** untuk Postgres + Redis — **bukan** production container untuk API/Web.

## URL Dev

| Service | URL |
|---------|-----|
| Web (kasir) | http://localhost:3001 |
| API | http://localhost:3000/api/v1 |
| Health | http://localhost:3000/api/v1/health |
| PostgreSQL (Docker) | `localhost:5433` |
| Redis (Docker) | `localhost:6379` |

## Variabel `.env` Penting

```env
DATABASE_URL=postgresql://barokah:barokah@localhost:5433/barokah_pos
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:3000
API_PORT=3000
```

> Port Postgres Docker dev = **5433** (bukan 5432) agar tidak bentrok dengan PostgreSQL lokal.

## Opsi Tambahan

```powershell
# Sertakan Expo mobile
npm run dev:all:mobile

# Lewati Docker (Postgres/Redis lokal)
node scripts/dev-all-launcher.mjs -SkipDocker

# Lewati migrasi otomatis
node scripts/dev-all-launcher.mjs -SkipMigrate

# Tanpa fallback port (gagal jika port bentrok)
node scripts/dev-all-launcher.mjs -NoFallback
```

## Redis (Cache & BullMQ Queue)

Redis dipakai untuk **BullMQ sync replay queue** (modul sync offline). Tanpa Redis, API otomatis fallback ke **inline processor** — tetap jalan, hanya tanpa antrian background.

### Startup Otomatis via `npm run dev`

1. Script memulai container `barokah-redis` via `docker/docker-compose.dev.yml`
2. Menunggu port **6379** siap (max ~60 detik) sebelum API start
3. Jika Docker tidak jalan atau Redis gagal ready → **`REDIS_DISABLED=true`** diset otomatis untuk sesi tersebut (API tidak spam `ECONNREFUSED`)

### Perintah Manual

```powershell
# Hanya infra (Postgres + Redis) + verifikasi health
npm run docker:up

# Cek container
docker ps --filter "name=barokah-redis"
```

### Tanpa Docker

| Situasi | Solusi |
|---------|--------|
| Docker Desktop mati/error | Jalankan Docker Desktop → `npm run dev` ulang |
| Redis lokal di port 6379 | `npm run dev` dengan `-SkipDocker` |
| Tidak punya Redis sama sekali | Otomatis `REDIS_DISABLED=true`, atau set manual di `.env` |

### Verifikasi Redis Aktif

```powershell
# Health API — field services.redis harus "up"
curl http://localhost:3000/api/v1/health

# Sync status — processor "bullmq" jika Redis OK
curl http://localhost:3000/api/v1/sync/status -H "Authorization: Bearer <token>"
```

> **Catatan:** `REDIS_DISABLED=true` di `.env` selalu menang atas auto-detect dev script (berguna untuk CI/test).

## Fallback Tanpa Docker

Jika Docker tidak terpasang atau daemon tidak jalan:

1. Script tetap melanjutkan dengan **peringatan**
2. Pastikan PostgreSQL & Redis lokal aktif, atau set `REDIS_DISABLED=true`
3. Setup Postgres lokal (Windows): `scripts/setup-local-postgres.ps1`
4. Sesuaikan `DATABASE_URL` di `.env` (mis. port `5432` untuk Postgres native)

## Perintah Individual (Tetap Tersedia)

| Perintah | Fungsi |
|----------|--------|
| `npm run docker:up` | Postgres + Redis + verifikasi port health |
| `npm run dev:api:fallback` | API saja + port safe |
| `npm run dev:web:clean` | Web saja — hapus `apps/web/.next` lalu `next dev` (cegah ChunkLoadError) |
| `npm run dev:web:fallback` | Web saja + port safe |
| `npm run dev:mobile` | Expo saja |
| `npm run dev:turbo` | Turbo dev (api+web+shared+ui, tanpa infra) |
| `npm run db:migrate` | Migrasi interaktif (`prisma migrate dev`) |
| `npm run db:seed` | Seed data demo |

## Konflik Port (EADDRINUSE)

Script `dev-api-safe.ps1` dan `dev-web-safe.ps1`:

- Menghentikan proses yang memakai port **3000** / **3001**
- Mode `-AutoFallback`: pindah ke port kosong berikutnya jika masih bentrok

API juga punya fallback built-in via `API_PORT` + `API_PORT_FALLBACK`.

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `ECONNREFUSED :6379` di log API | Jalankan Docker Desktop → `npm run docker:up` atau `npm run dev` ulang; atau set `REDIS_DISABLED=true` |
| `Docker tidak tersedia` | Start Docker Desktop; dev script otomatis set `REDIS_DISABLED=true` agar API tetap jalan |
| Migrasi gagal | Cek `DATABASE_URL`, pastikan Postgres jalan, lalu `npm run db:migrate:deploy` |
| Web tidak connect API | Pastikan `NEXT_PUBLIC_API_URL=http://localhost:3000` |
| Port 5433 bentrok | Stop container lain atau ubah mapping di `docker-compose.dev.yml` |
| Perlu reset DB Docker | `npm run docker:down` lalu `docker volume rm pos_postgres_data` (nama volume bisa beda) |
| **ChunkLoadError** / `GET .../_next/static/chunks/app/{login\|pos}/...` **404** | Cache build dev **kedaluwarsa** (browser masih minta chunk lama setelah hot reload / restart dev). **Perbaikan cepat:** (1) hentikan dev server (`Ctrl+C`), (2) hapus folder `apps/web/.next`, (3) jalankan ulang `npm run dev:web:clean` atau `npm run dev`. Halaman `/login` dan `/pos/*` otomatis reload sekali jika chunk gagal dimuat; jika masih error, hard refresh browser (`Ctrl+Shift+R`). Pastikan hanya **satu** dev server web di port 3001. |
| Hydration warning di konsol Next.js (`bis_skin_checked`, `bis_register`, `__processed_...`) | **Bukan bug aplikasi** — atribut ini disuntikkan **browser extension** (Bitdefender, antivirus, ad blocker, dll.) ke `<html>` / `<body>` / `<div>`. React membandingkan HTML server vs DOM klien dan melaporkan mismatch. **Verifikasi:** buka http://localhost:3001 di **jendela incognito/private** (tanpa extension) — warning extension seharusnya hilang. Root layout + halaman login memakai `suppressHydrationWarning` untuk meredam noise extension. Mismatch dari kode app (SKU auto-generate, tanggal/jam di render awal) sudah ditangani dengan pola `isMounted` + `useEffect`. |

### Hydration mismatch — app vs extension

| Sumber | Gejala tipikal | Cara bedakan |
|--------|----------------|--------------|
| **Browser extension** | `bis_skin_checked`, `bis_register`, `__processed_*` pada `<html>`, `<body>`, atau `<div hidden>` | Hilang di incognito / browser tanpa extension |
| **Kode aplikasi** | Perbedaan teks/value input (SKU, no. referensi EXP-*, jam cache katalog) antara SSR dan klien | Muncul juga di incognito; perbaiki dengan defer ke `useEffect` setelah mount |

> Jika masih ada warning **hanya** di browser normal (bukan incognito), aman diabaikan selama UI berfungsi — itu noise extension, bukan regresi POS.

### Windows — Docker Desktop macet / hang

Gejala umum saat daemon Docker Desktop stuck (sering HTTP 500 di log Docker, atau `docker info` tidak pernah selesai):

1. **`npm run dev` tidak hang lagi** — `scripts/dev-all.ps1` menunggu `docker info` maksimal **10 detik**, lalu **fallback otomatis** ke perilaku `-SkipDocker` (API/Web tetap start).
2. **Perbaikan manual (disarankan):** buka **Docker Desktop** → **Restart** dari menu system tray, atau **Quit Docker Desktop** lalu buka lagi. Tunggu status *Engine running* sebelum `npm run dev` ulang.
3. **Jika masih macet:** Settings → Troubleshoot → **Clean / Purge data** (hati-hati: volume dev bisa hilang) — lihat juga [DOCKER.md — Troubleshooting](./DOCKER.md#troubleshooting).
4. **Tanpa Docker sementara:** pastikan Postgres lokal aktif (`scripts/setup-local-postgres.ps1`) lalu:
   ```powershell
   npm run dev -- -SkipDocker
   ```
5. **Verifikasi cepat:** `docker info` harus selesai < 10 detik. Jika hang, restart Docker Desktop dulu — bukan bug aplikasi POS.

> Detail mode infra vs full stack Docker: **[DOCKER.md](./DOCKER.md)** · hybrid dev workflow di section *Workflow Dev Hybrid*.

## File Terkait

- `scripts/dev-all.ps1` — orchestrator Windows
- `scripts/dev-all-launcher.mjs` — entry cross-platform
- `scripts/docker-up.mjs` — infra postgres + redis + health wait
- `scripts/dev-api-safe.ps1` / `scripts/dev-web-safe.ps1` — port safety
- `docs/dev/DOCKER.md` — mode Docker full stack

Maintainer: **Yoga** (DevOps) · **Fajar** (API) · **Dimas** (Web)
