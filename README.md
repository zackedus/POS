# Barokah Core POS

Professional Point of Sale system — Web + Mobile.

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

# 4. Database migrate
npm run db:generate
npm run db:migrate

# 5. Run all apps
npm run dev
```

| App | URL | Port |
|-----|-----|------|
| API | http://localhost:3000 | 3000 |
| Web | http://localhost:3001 | 3001 |
| Mobile | Expo DevTools | — |

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
