# ADR-001: Tetap pada Stack React (Next.js + Expo)

> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Keputusan Arsitektur | Audience: semua tim, Pak Zaki

| Field | Nilai |
|-------|-------|
| **Status** | Diterima |
| **Tanggal** | 1 Juni 2026 |
| **Pemutus** | Pak Zaki (pemilik proyek) |
| **Dokumentasi** | CEO Budi Santoso, tim teknis |

---

## Konteks

Pada fase awal MVP Barokah Core POS, tim meninjau apakah frontend web dan mobile perlu bermigrasi ke ekosistem **Vue** (misalnya Nuxt 3 untuk web dan alternatif non-React untuk mobile), atau tetap memakai **React** yang sudah di-scaffold di monorepo (`apps/web`, `apps/mobile`).

Proyek saat ini menggunakan:

- **Web:** Next.js 15 (App Router), React 19
- **Mobile:** Expo SDK 52 (React Native)
- **Shared:** `@barokah/shared`, `@barokah/ui` di Turborepo npm workspaces

---

## Keputusan

**Tetap menggunakan React** sebagai fondasi frontend:

| Aplikasi | Teknologi | Versi target |
|----------|-----------|--------------|
| Web POS | Next.js (App Router) | 15.x |
| Mobile POS | Expo (React Native) | SDK 52+ |

**Tidak** mengadopsi Vue, Nuxt, atau rewrite frontend paralel.

Tim merekrut **Senior Frontend Developer** (**Dimas Pratama**, `@frontend`) sebagai owner implementasi `apps/web` dan `apps/mobile`. **Fajar Ramadhan** (`@senior-dev`) tetap owner backend NestJS, Prisma, kontrak API, dan review arsitektur integrasi.

---

## Alternatif yang Ditolak

### Vue / Nuxt migration

| Aspek | Alasan penolakan |
|-------|------------------|
| Monorepo & types | `@barokah/shared` dan pola import sudah dipakai API + web + mobile; migrasi memecah konsistensi |
| Biaya waktu | MVP 8 minggu — rewrite UI tidak menambah fitur bisnis |
| Tim & skill | Scaffold dan dokumentasi sudah React; hiring Vue paralel menambah koordinasi |
| Mobile | Expo/RN adalah standar industri POS mobile; tidak ada pengganti setara dalam ekosistem Vue tanpa risiko besar |
| Design system | `packages/ui` sudah React; rebuild komponen = delay Maya → implement |

---

## Dampak Positif (Rationale)

1. **Satu bahasa UI** — React di web dan mobile mengurangi context switching dev.
2. **Shared types end-to-end** — Prisma → NestJS → `@barokah/shared` → Next/Expo tanpa adapter Vue.
3. **Kapasitas tim** — Fajar fokus API/backend; Dimas fokus frontend; parallel setelah contract freeze.
4. **Dokumentasi & wireframe** — Maya handoff langsung ke implementasi React (`@barokah/ui`).
5. **Keputusan Pak Zaki** — eksplisit: *"Tetap React — rekrut senior frontend jika butuh"* (1 Jun 2026).

---

## Konsekuensi

- Semua task UI Sprint 1+ di-assign ke **Dimas** (login, integrasi auth client, layar kasir).
- **Fajar** tidak menjadi primary owner halaman Next.js kecuali hotfix darurat.
- Cursor skill baru: `.cursor/skills/pos-senior-frontend/SKILL.md`
- Rule opsional: `.cursor/rules/frontend-next-expo.mdc` untuk `apps/web` dan `apps/mobile`
- Vue/Nuxt **tidak** ditambahkan ke roadmap atau dependency

---

## Referensi

- [AGENTS.md](../../AGENTS.md) — struktur tim 11 anggota
- [docs/architecture/OVERVIEW.md](../architecture/OVERVIEW.md) — stack teknologi
- [docs/standards/CODEBASE-STRUCTURE.md](../standards/CODEBASE-STRUCTURE.md) — layout monorepo
- Rapat kickoff: [docs/meetings/2026-06-01-KICKOFF-MEETING.md](../meetings/2026-06-01-KICKOFF-MEETING.md)

---

*Disetujui Pak Zaki · Didokumentasikan Budi Santoso · 1 Juni 2026*
