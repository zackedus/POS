> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Citra, Fajar, Dimas, Budi, Fitri

# Sprint 11 — UAT Final Checklist

> **Tanggal:** 2 Juni 2026  
> **Status:** **CLOSED** — tervalidasi tanpa blocker P0  
> **Owner uji:** Citra (QA), Fajar (Backend/API), Dimas (Frontend), Eko (Algorithm), Budi (Orchestrator)

---

## Scope UAT Final

1. **Sync queue API** — `POST /api/v1/sync/queue`, `GET /sync/status`, `GET /sync/conflicts`; idempotensi `clientRequestId`; replay in-process stub.
2. **PWA shell** — manifest, service worker (`sw.js`), cache `/pos` + `/login`.
3. **Antrean offline (IndexedDB)** — checkout tunai & split saat offline; status `pending` / `syncing` / `failed`.
4. **Sinkron ulang** — PWA memanggil `POST /sync/queue` (bukan checkout langsung); auto-sync saat `online`; tombol **Sinkronkan Sekarang**.
5. **Banner koneksi & antrean** — indikator offline, jumlah pending, pesan hasil sync.
6. **Regresi Sprint 10** — void, struk, checkout idempoten (smoke via test suite).

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|------|-------|-------------|
| POST /sync/queue enqueue + replay | ✅ PASS | SCR-O01…SCR-O06 + `sync.service.test.ts` |
| GET /sync/status counts | ✅ PASS | SCR-O03 |
| GET /sync/conflicts | ✅ PASS | SCR-O04 |
| Idempotensi clientRequestId | ✅ PASS | SCR-O02, SCR-O05 |
| RBAC kasir akses sync | ✅ PASS | SCR-O06 smoke |
| PWA manifest + SW | ✅ PASS | `public/manifest.webmanifest`, `sw.js`, `pwa-register.ts` |
| IndexedDB antrean | ✅ PASS | `offline-queue.test.ts` |
| Sync via API (bukan checkout langsung) | ✅ PASS | `offline-sync.test.ts` → `/sync/queue` |
| Banner offline + CTA sync | ✅ PASS | `OfflineBanner.test.tsx`, `page.offline.test.tsx` |
| Integrasi kasir `/pos` | ✅ PASS | `page.test.tsx`, `page.offline.test.tsx` |
| Regresi void/struk | ✅ PASS | SCR-V01…SCR-V06 masih hijau di suite API |

---

## Bukti Verifikasi Teknis (Re-run Final — 2 Juni 2026)

### Database

- `npm run db:generate` ✅
- Migration `20260602180000_sprint11_offline_sync_queue` ✅ diterapkan (`sync_queue_entries`)
- Catatan: `prisma migrate deploy` sempat timeout advisory lock setelah `migrate dev` terinterrupt — tabel sudah ada; jalankan ulang deploy jika lock masih aktif.

### API (`@barokah/api`)

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run test -w @barokah/api` | ✅ **61/61** |
| `npm run build -w @barokah/api` | ✅ |

### Web (`@barokah/web`)

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web` | ✅ **50/50** |
| `npm run build -w @barokah/web` | ✅ (⚠ warning ESLint plugin Next.js — non-blocking, carry-over) |

### Perbaikan saat audit penutupan

| Item | Tindakan |
|------|----------|
| Frontend memanggil checkout langsung | **Diperbaiki** — `offline-sync.ts` kini `POST /sync/queue` |
| Test plan 38 TC | Tetap valid; eksekusi via automated + manual smoke |

---

## Checklist UAT Final (Pak Zaki)

- [x] Login **kasir** → `/pos` — DevTools Application: manifest + SW terdaftar.
- [x] **Network → Offline** → checkout tunai → pesan antrean offline + banner pending.
- [x] **Online** kembali → auto-sync atau **Sinkronkan Sekarang** → transaksi muncul di **Transaksi Terakhir**.
- [x] Replay `clientRequestId` sama tidak double-charge (API idempoten + server queue).
- [x] `GET /sync/status` menampilkan ringkasan antrian server.
- [x] Regresi: void + struk Sprint 10 masih berfungsi (smoke test suite).

---

## Yang Bisa Langsung Dites (Dev)

**Prasyarat:** API port **3000**, web port **3001**, PostgreSQL + seed (`npm run docker:up` + `npm run db:seed`).

| Layar / Endpoint | URL |
|------------------|-----|
| Login | http://localhost:3001/login |
| Kasir PWA | http://localhost:3001/pos |
| Manifest | http://localhost:3001/manifest.webmanifest |
| Service worker | http://localhost:3001/sw.js |
| Sync queue | http://localhost:3000/api/v1/sync/queue |
| Sync status | http://localhost:3000/api/v1/sync/status |
| Sync conflicts | http://localhost:3000/api/v1/sync/conflicts |

**Kredensial dev:** `kasir@barokah.local` / `Kasir123!` — buka shift sebelum checkout.

---

## Item Defer (Non-blocking)

| Item | Sprint berikutnya |
|------|-------------------|
| Hold/recall offline | Sprint 12+ |
| Katalog produk full offline | Sprint 12+ |
| BullMQ + Redis worker | Sprint 12 (Fajar + Yoga) |
| Banner resolve konflik manual (`GET /conflicts`) | Sprint 12 |
| Void/refund dari antrean offline | Defer |
| Printer thermal fisik | Fase 2 |
| Epic J online storefront | Discovery |

---

## Keputusan QA

**Sprint 11 dinyatakan CLOSED** — semua lane (algorithm, backend, frontend, QA) deliverable P0 tervalidasi; tidak ada blocker deploy staging.

**Referensi:** [SPRINT-11-TEST-PLAN.md](./SPRINT-11-TEST-PLAN.md), [SPRINT-11-CLOSURE.md](../sprint/SPRINT-11-CLOSURE.md), [docs/api/SYNC.md](../api/SYNC.md), [algorithm/OFFLINE-SYNC.md](../algorithm/OFFLINE-SYNC.md)
