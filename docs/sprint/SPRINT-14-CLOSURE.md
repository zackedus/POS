> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Closure | Audience: Pak Zaki, Budi, Fitri, Hendra

# Sprint 14 — Closure (Epic J Online Orders Live)

> **Tanggal closure:** 5 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Status:** **CLOSED** (Backend API · Frontend storefront · Integrasi Midtrans mock · QA)  
> **Referensi:** [SPRINT-14-PLAN.md](../requirements/SPRINT-14-PLAN.md), [SPRINT-14-PROGRESS.md](./SPRINT-14-PROGRESS.md), [SPRINT-14-UAT-FINAL.md](../testing/SPRINT-14-UAT-FINAL.md), [SPRINT-13-CLOSURE.md](./SPRINT-13-CLOSURE.md)

---

## Status Sprint

- **Status akhir:** **CLOSED** — tidak ada blocker P0 pada semua lane aktif
- **Fokus:** Epic J P0 end-to-end — API `online_orders`, storefront live, webhook Midtrans mock, antrian fulfillment kasir
- **Lanes:** Fajar (API) · Dimas (storefront + kasir queue) · Arif→Fajar (Midtrans) · Citra (QA) · Fitri (docs)

---

## Status Akhir per Area

| Area | Hasil |
|------|-------|
| Prisma migration `20260605100000_sprint14_online_orders` | ✅ |
| Modul NestJS `online-orders` (storefront + fulfillment + webhook) | ✅ |
| ErrorCodes Epic J di `@barokah/shared` | ✅ |
| Storefront `/store/[slug]` → API live (`store-api.ts`) | ✅ |
| Midtrans mock mode (tanpa env) | ✅ |
| Webhook idempotent PAID + stok `SALE_ONLINE` | ✅ |
| Antrian fulfillment `/pos/online-orders` | ✅ |
| Regresi Sprint 12–13 (sync, hold, kasir walk-in) | ✅ |
| Test API | ✅ **75/75** (+6) |
| Test web | ✅ **60/60** (+1) |
| UAT final | ✅ **PASS** |
| Docs PLAN / PROGRESS / CLOSURE / UAT | ✅ |

---

## Verifikasi Teknis (5 Juni 2026 — re-run resmi penutupan)

### Database

| Perintah | Hasil |
|----------|-------|
| `npm run db:generate` | ✅ |
| `npm run db:migrate` | ✅ |
| `npm run db:seed` | ✅ |

### `@barokah/api`

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run test -w @barokah/api` | ✅ **75/75** |
| `npm run build -w @barokah/api` | ✅ |

### `@barokah/web`

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web -- --run` | ✅ **60/60** |

---

## Perubahan Utama vs Sprint 13

| Komponen | Sprint 13 | Sprint 14 |
|----------|-----------|-----------|
| Storefront data | Mock `mock-api.ts` | API live `store-api.ts` |
| Online orders | RFC approved, scaffold UI | Modul API + migrasi Prisma produksi |
| Pembayaran web | Mock redirect | Midtrans mock/sandbox + webhook |
| Fulfillment kasir | N/A | `/pos/online-orders` PAID→COMPLETED |
| Test API | 69/69 | **75/75** (+6 online-orders) |
| Test web | 59/59 | **60/60** (+1 store-api) |

---

## Defer — Non-blocking

| Item | Target |
|------|--------|
| US-J-05 Delivery checkout | **Sprint 15** |
| Midtrans sandbox live (env credential) | Sprint 15 — manual smoke documented |
| Rate limit storefront publik | Sprint 15 |
| Owner UI kelola `sellOnline` / gambar produk | Sprint 15 |
| Socket.io notifikasi kasir US-J-08 | Sprint 15 |
| Payment expired auto-cancel (TTL 60 menit) | Sprint 15 |
| CAPTCHA guest checkout | Backlog P1 |

---

## Handoff — Prioritas Sprint 15

| # | Prioritas | Owner | Catatan |
|---|-----------|-------|---------|
| 1 | Delivery checkout US-J-05 | **Fajar** + **Dimas** | Aktifkan `fulfillmentType: DELIVERY` |
| 2 | Midtrans sandbox live + env docs | **Arif** → **Fajar** | Credential `.env` + smoke sign-off |
| 3 | Owner UI `sellOnline` / gambar | **Dimas** + **Maya** | Wireframe admin katalog web |
| 4 | Socket.io notifikasi kasir | **Fajar** + **Dimas** | US-J-08 real-time |
| 5 | Rate limit + CAPTCHA guest | **Fajar** + **Yoga** | Hardening storefront publik |
| 6 | UAT regression Sprint 15 gate | **Citra** | AC dari Dewi |

**Rencana:** Hendra assign `SPRINT-15-PLAN.md` post-closure.

---

## Handoff Log

| From | To | Task | Parallel OK? |
|------|-----|------|--------------|
| Budi | Hendra | Finalisasi Sprint 15 allocation | Tidak — setelah closure |
| Fajar | Andi | Delivery API + payment expiry job | Ya — setelah contract freeze |
| Fajar | Dimas | Kontrak delivery untuk storefront | Tidak — tunggu API |
| Arif | Fajar | Midtrans sandbox credential + smoke | Tidak |
| Citra | Tim | Regression Sprint 15 gate | Ya — setelah staging |
| Fitri | — | INDEX + UAT final Sprint 14 | ✅ |

---

## Keputusan

**Sprint 14 dinyatakan CLOSED.** Epic J P0 live: pelanggan guest dapat browsing katalog API, checkout pickup, pembayaran mock Midtrans, dan kasir memproses antrian fulfillment. Stok berkurang pada `PAID` via `SALE_ONLINE`. Regresi offline PWA dan kasir walk-in tidak terpengaruh.

**Sprint berikutnya:** delivery checkout, integrasi Midtrans sandbox live, admin `sellOnline`, notifikasi real-time.

---

*Disusun: Budi Santoso (CEO) · 5 Juni 2026 · QA sign-off: Citra Lestari*
