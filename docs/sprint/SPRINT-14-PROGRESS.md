> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Progress | Audience: Pak Zaki, Budi, tim dev

# Sprint 14 — Progress (Epic J Online Orders)

> **Tanggal update:** 5 Juni 2026  
> **Status:** **CLOSED**  
> **Plan:** [SPRINT-14-PLAN.md](../requirements/SPRINT-14-PLAN.md)  
> **UAT:** [SPRINT-14-UAT-FINAL.md](../testing/SPRINT-14-UAT-FINAL.md)  
> **Closure:** [SPRINT-14-CLOSURE.md](./SPRINT-14-CLOSURE.md)

---

## Status Lane

| Lane | Owner | Status | Catatan |
|------|-------|--------|---------|
| Backend API | Fajar | ✅ Done | Modul `online-orders` + migrasi Prisma |
| Frontend storefront | Dimas | ✅ Done | `store-api.ts` mengganti mock |
| Integration Midtrans | Arif → Fajar | ✅ Done | Mock mode tanpa env; sandbox defer S15 |
| Kasir fulfillment UI | Dimas | ✅ Done | `/pos/online-orders` |
| QA | Citra | ✅ Done | UAT final PASS — tidak ada P0 open |

---

## Deliverable Checklist

| # | Item | Status |
|---|------|--------|
| 1 | `SPRINT-14-PLAN.md` | ✅ |
| 2 | `SPRINT-14-PROGRESS.md` | ✅ |
| 3 | Prisma migration `20260605100000_sprint14_online_orders` | ✅ |
| 4 | `apps/api/src/modules/online-orders/` | ✅ |
| 5 | ErrorCodes Epic J di `@barokah/shared` | ✅ |
| 6 | `apps/web/src/lib/store/store-api.ts` | ✅ |
| 7 | `/pos/online-orders` fulfillment page | ✅ |
| 8 | `SPRINT-14-TEST-PLAN.md` | ✅ |
| 9 | `SPRINT-14-UAT-FINAL.md` | ✅ |
| 10 | `SPRINT-14-CLOSURE.md` | ✅ |
| 11 | Verifikasi `db:generate`, migrate, seed, test, build | ✅ |

---

## Test Count

| Package | Sprint 13 | Sprint 14 |
|---------|-----------|-----------|
| `@barokah/api` | 69/69 | **75/75** (+6) |
| `@barokah/web` | 59/59 | **60/60** (+1) |

### Verifikasi Teknis (5 Jun 2026 — UAT final)

| Perintah | Hasil |
|----------|-------|
| `npm run db:generate` | ✅ |
| `npm run db:migrate` | ✅ |
| `npm run db:seed` | ✅ |
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run test -w @barokah/api` | ✅ **75/75** |
| `npm run build -w @barokah/api` | ✅ |
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web -- --run` | ✅ **60/60** |

---

## Blocker / Risiko (Resolved)

| Risiko | Resolusi |
|--------|----------|
| Midtrans sandbox credential belum di `.env` | Mock mode `MIDTRANS_SERVER_KEY` kosong — PASS UAT P0 |
| Produk belum `sellOnline=true` di seed | Manual smoke SQL documented di UAT final — non-blocker |
| `createdById` stock movement webhook | Pakai user OWNER tenant pertama — implemented |

---

## Carry-over Sprint 15

| Item | Prioritas |
|------|-----------|
| US-J-05 Delivery checkout | P1 |
| Midtrans sandbox live + env docs | P1 |
| Owner UI `sellOnline` / gambar | P1 |
| Socket.io notifikasi kasir US-J-08 | P1 |
| Rate limit storefront | P2 |
| Payment expired auto-cancel job | P2 |

---

*Update final: 5 Juni 2026 — Citra (QA) · Closure: Budi (CEO)*
