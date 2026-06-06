> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Progress | Audience: Pak Zaki, Dimas, Bima, Citra, Fitri

# Sprint 12 — Progress (Offline PWA Lanjutan — Frontend)

> **Tanggal update:** 2 Juni 2026  
> **Status jalur:** **COMPLETE** (Sprint 12 gabungan **CLOSED** — lihat [SPRINT-12-CLOSURE.md](./SPRINT-12-CLOSURE.md))  
> **Backend lane:** [SPRINT-12-PROGRESS.md](./SPRINT-12-PROGRESS.md) · **Kebijakan:** [OFFLINE-SYNC.md](../algorithm/OFFLINE-SYNC.md)

---

## Status Ringkas

| Jalur | Owner | Progress | Status |
|-------|-------|----------|--------|
| **Frontend** — konflik UI, hold offline, katalog cache | **Dimas + Bima** | 100% | ✅ COMPLETE |

---

## Deliverables

| # | Item | Path | Status |
|---|------|------|--------|
| 1 | Banner konflik + aksi resolve | `components/pos/OfflineBanner.tsx`, `lib/sync-conflicts.ts` | ✅ |
| 2 | `GET /sync/conflicts` | `hooks/useOfflinePos.ts` | ✅ |
| 3 | Hold antrean IndexedDB + sync | `lib/offline-hold-queue.ts`, `lib/offline-hold-sync.ts` | ✅ |
| 4 | Katalog cache (read-only) | `lib/catalog-cache.ts`, `app/pos/page.tsx` | ✅ |
| 5 | IndexedDB v2 multi-store | `lib/offline-db.ts` | ✅ |
| 6 | Vitest | 6 file test baru + update banner/pos | ✅ |

---

## Verifikasi Teknis (`@barokah/web` — 2 Juni 2026)

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web` | ✅ **57/57** |
| `npm run build -w @barokah/web` | ✅ |

---

## Koordinasi API

| Fitur | Endpoint |
|-------|----------|
| Konflik | `GET /api/v1/sync/conflicts` |
| Transaksi antrean | `POST /api/v1/sync/queue` |
| Hold drain | `POST /api/v1/transactions/hold` |
| Katalog online | `GET /api/v1/products/grid` |

---

## Known Limits

- Resolve konflik server-only tanpa antrean lokal: RETRY terbatas; CANCEL/ESCALATE dismiss UI.
- Hold offline belum idempotent di API (`clientRequestId` — handoff Fajar).
- Katalog: snapshot penuh grid, bukan delta `catalog/snapshot`.
