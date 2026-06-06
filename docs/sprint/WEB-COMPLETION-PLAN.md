# Web Completion Plan — Barokah Core POS

> **Tanggal:** 6 Juni 2026  
> **Owner:** Dimas Pratama (frontend) · Fajar Ramadhan (API) · Hendra Pratama (planning)  
> **Permintaan Pak Zaki:** Lengkapi semua fitur web bertahap secara paralel  
> **Progress pass:** [WEB-COMPLETION-PROGRESS.md](./WEB-COMPLETION-PROGRESS.md)

---

## Audit Ringkas (32 route `apps/web`)

| Area | Route | Status pre-pass | Target |
|------|-------|-----------------|--------|
| Dashboard | `/dashboard` | Sales report OK, no stock widget | Phase 1 ✅ |
| Dashboard | `/dashboard/reports` | 404 | Redirect → `/dashboard` Phase 1 ✅ |
| Dashboard | `/dashboard/inventory` | Adjust TRANSFER_IN/OUT manual only | Tab Transfer Cabang Phase 1 ✅ |
| Dashboard | `/dashboard/transactions` | List 15 trx, no filter | Filter + pagination Phase 1 ✅ |
| Dashboard | `/dashboard/expenses` | Category filter only | + date range Phase 1 ✅ |
| Dashboard | `/dashboard/users` | CRUD + outlet RBAC | Done (verified) |
| Dashboard | `/dashboard/settings` | Tenant + storefront links | Done (verified) |
| Master | `/master/bundles` | Read-only list | Phase 2 ✅ CRUD |
| Shift | `/shift/open`, `/shift/close` | Functional, basic UI | Phase 2 ✅ polish |
| Storefront | `/store/[slug]/*` | Sprint 16 closed | Phase 2 ✅ variant + cart UX |
| POS | `/pos`, `/pos/online-orders` | Sprint 16 closed | Phase 2 ✅ middleware |

---

## Phase 1 — P0 Operasional (PASS INI)

Parallel lanes setelah audit — **semua lane independen**, kontrak API frozen per lane.

### Lane A — Transfer stok antar cabang

- [x] `POST /api/v1/inventory/transfer` — atomic OUT+IN, ref UUID bersama
- [x] Tab **Transfer Cabang** di `/dashboard/inventory`
- [x] Test API `inventory.service.test.ts`
- [x] Test web tab render

### Lane B — Laporan dashboard (sales + stock)

- [x] `GET /api/v1/reports/stock` — SKU count, low stock, nilai HPP
- [x] Widget **Ringkasan Stok Cabang** di `/dashboard`
- [x] Export CSV/PDF harian (sudah ada — verified)
- [x] Alias `/dashboard/reports` → redirect `/dashboard`

### Lane C — Transaksi admin polish

- [x] Filter status / tanggal / no. struk di `GET /transactions/recent`
- [x] UI filter + pagination + inline receipt di `/dashboard/transactions`

### Lane D — Route & nav fixes

- [x] `/dashboard/stock` redirect (sudah ada)
- [x] Sidebar: **Tutup Shift** → `/shift/close`
- [x] Pengeluaran: filter rentang tanggal

---

## Phase 2 — P1 Growth (PASS 2 — DONE)

| Lane | Fitur | Owner | Status |
|------|-------|-------|--------|
| Storefront | PDP variant selector, cart/checkout inline errors | Dimas | ✅ Done |
| Bundles admin | CRUD wizard bundle di web + API PATCH/DELETE | Dimas + Fajar | ✅ Done |
| Online orders admin | `/dashboard/online-orders` manager view | Dimas + Fajar | ✅ Done |
| Shift UI | Dashboard UI + close preview expected cash | Dimas + Fajar | ✅ Done |
| Auth middleware | `/pos`, `/shift` protected + kasir RBAC | Fajar + Dimas | ✅ Done |
| Settings advanced | PPN toggle, Midtrans mock config display | Dimas + Fajar | ✅ Done (Phase 3) |

---

## Phase 3 — P2 Defer (PASS 3 — DONE)

- [x] Socket.io UI real-time order badge
- [x] Midtrans live config UI (sandbox credential)
- [x] Analytics dashboard / margin per kategori
- [x] Bundle CRUD flexible / promo engine (MVP CRUD admin)
- [x] Dark mode admin
- [x] Settings advanced — PPN toggle, Midtrans mock/live config display

---

## Phase 4 — Parallel Completion (PASS 4 — DONE)

| Lane | Fitur | Owner | Status |
|------|-------|-------|--------|
| A | Promo apply POS checkout | Eko + Fajar + Dimas | ✅ Done |
| B | Storefront cek status pesanan | Dimas | ✅ Done |
| C | httpOnly auth + middleware RBAC polish | Fajar + Dimas | ✅ Done |
| D | Expired online orders | Fajar | ✅ Done |
| E | Dashboard mapApiError UX | Dimas | ✅ Done |
| F | Docs + UAT checklist | Fitri | ✅ Done |

**Definition of Done — Web Completion Plan:** ✅ All phases 1–4 complete (Jun 2026)

---

## Parallel Lane Matrix (Phase 1)

```
Lane A (Transfer)     Lane B (Reports stock)     Lane C (Transactions)     Lane D (Routes)
       │                       │                         │                      │
       ▼                       ▼                         ▼                      ▼
 inventory API            reports/stock API         transactions/recent       sidebar + redirects
       │                       │                         │                      │
       └───────────────────────┴─────────────────────────┴──────────────────────┘
                                         ▼
                              npm test web + api + lint + typecheck
```

---

## Definition of Done — Phase 1

- [x] Semua checkbox Phase 1 di atas
- [x] `docs/sprint/WEB-COMPLETION-PROGRESS.md` updated
- [x] `FEATURE-BACKLOG.md` checkbox transfer + laporan stok
- [x] Tests pass: `@barokah/web`, `@barokah/api`

---

*Disusun: Hendra Pratama · Koordinasi: Budi Santoso · Implement: Dimas + Fajar*
