# Web Completion — Progress Pass 4 (Phase 4 Parallel)

> **Tanggal:** 6 Juni 2026  
> **Plan:** [WEB-COMPLETION-PLAN.md](./WEB-COMPLETION-PLAN.md)  
> **Phase:** 4 Pass 1 — **DONE** (lanes A–F paralel)  
> **Owner:** Dimas (web) · Fajar (API) · Eko (promo algo) · Fitri (docs)

---

## Ringkasan Pass

| Lane | Deliverable | Status |
|------|-------------|--------|
| **A** | Promo apply di POS checkout + validate API | ✅ Done |
| **B** | Storefront `/store/[slug]/orders` cek status | ✅ Done |
| **C** | httpOnly auth production + middleware + RBAC flash fix | ✅ Done |
| **D** | Expired online orders job + filter + label Kedaluwarsa | ✅ Done |
| **E** | Dashboard `mapApiError` + konsistensi UX | ✅ Done |
| **F** | Docs INDEX + UAT checklist Phase 4 | ✅ Done |

---

## Backend (Fajar + Eko)

| Endpoint / Module | Change |
|-------------------|--------|
| `GET /promotions/active` | Promo aktif untuk kasir |
| `POST /promotions/validate` | Validasi diskon keranjang |
| `checkout-cash` / `checkout-split` | Field `promoRuleId`, diskon di `transaction.discount` |
| `packages/shared` `promo-calculator` | Algoritma percent/fixed, pick best promo |
| `POST /online-orders/maintenance/expire-pending` | Mark PENDING_PAYMENT → EXPIRED |
| Prisma | `OnlineOrderStatus.EXPIRED` migration |

---

## Frontend (Dimas)

| File / Route | Change |
|--------------|--------|
| `/pos` | Dropdown promo, subtotal/diskon/total, kirim `promoRuleId` |
| `/store/[slug]/orders` | Cek status pesanan (orderNo + HP) |
| `StoreHeader` | Link "Pesanan Saya" |
| `/api/auth/login|refresh|logout` | httpOnly cookies (production path) |
| `/api/proxy/[...path]` | BFF authenticated requests |
| Dashboard pages | `mapApiError` inventory, expenses, outlets, promotions, analytics, PO |

---

## Migrations

| Migration | Status |
|-----------|--------|
| `20260606230000_tenant_settings` | Pending user-side apply |
| `20260606140000_online_order_expired_status` | New — EXPIRED enum |

---

## Test Results (Pass 4)

| Suite | Result |
|-------|--------|
| `@barokah/api` | ✅ 159/159 |
| `@barokah/web` | ✅ 130/130 |
| `typecheck` | ✅ |
| `lint` | ✅ |

---

*Pass 4 closed: Dimas + Fajar + tim · 6 Juni 2026*
