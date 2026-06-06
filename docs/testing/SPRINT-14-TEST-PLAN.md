> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Citra, Fajar, Dimas, Pak Zaki

# Sprint 14 — Test Plan (Epic J Online Orders Live)

> **Status:** **CLOSED** — UAT final 5 Juni 2026  
> **Epic:** J — US-J-01 … US-J-07 (P0)  
> **RFC:** [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md) (APPROVED)  
> **Owner:** Citra Lestari (QA)

---

## Scope UAT P0

| Area | User Story | Prioritas | Status UAT |
|------|------------|-----------|------------|
| Katalog publik API + UI | US-J-01 | P0 | ✅ PASS |
| PDP | US-J-02 | P0 | ✅ PASS |
| Keranjang + validasi MOQ | US-J-03 | P0 | ✅ PASS |
| Checkout pickup | US-J-04 | P0 | ✅ PASS |
| Midtrans Snap + webhook | US-J-06 | P0 | ✅ PASS (mock mode) |
| Antrian fulfillment kasir | US-J-07 | P0 | ✅ PASS |

**Out of scope Sprint 14 UAT:**

| Item | Status |
|------|--------|
| US-J-05 delivery checkout | N/A — Sprint 15 |
| US-J-08 notifikasi real-time Socket.io | N/A — Sprint 15 |
| Owner UI kelola `sellOnline` | N/A — Sprint 15 |
| Rate limit storefront publik | N/A — Sprint 15 |
| Midtrans sandbox live (perlu env) | Manual smoke — langkah di UAT final |

---

## Test Cases — API (Fajar / Citra)

### TC-S14-API-01 — Storefront outlets
- **Given** tenant aktif dengan slug valid
- **When** `GET /api/v1/store/:slug/outlets`
- **Then** daftar outlet aktif; tenant nonaktif → 404 `ONLINE_STORE_NOT_FOUND`
- **Bukti:** `storefront.service.ts` — `resolveTenant()`, `listOutlets()`; ErrorCodes `ONLINE_STORE_NOT_FOUND`

### TC-S14-API-02 — Katalog produk
- **Given** produk `sellOnline=true`, `outletId` valid
- **When** `GET …/catalog/products?outletId=…`
- **Then** hanya produk web aktif; `stockStatus` AVAILABLE/OUT_OF_STOCK
- **Bukti:** `storefront.service.ts` — filter `sellOnline: true`, `hasVariants: false`; cache TTL 60 detik

### TC-S14-API-03 — Checkout idempotent
- **Given** `clientRequestId` sama
- **When** `POST …/orders` dua kali
- **Then** order sama dikembalikan; tidak double row
- **Bukti:** `storefront.service.ts` L252–270 — unique `(tenantId, clientRequestId)`; migrasi `online_orders`

### TC-S14-API-04 — Stok final check
- **Given** qty > stok outlet
- **When** `POST …/orders`
- **Then** 409 `INSUFFICIENT_STOCK`
- **Bukti:** `storefront.service.ts` L327–354 — `stockIssues` + `ConflictException`

### TC-S14-API-05 — Webhook PAID idempotent
- **Given** order `PENDING_PAYMENT`
- **When** webhook settlement dua kali dengan `transaction_id` sama
- **Then** status `PAID` sekali; stok deduct sekali (`SALE_ONLINE`)
- **Bukti:** `online-orders.service.test.ts` — "webhook ignores already paid order"; `markOrderPaid()` L299–328 `stockMovement.type = SALE_ONLINE`

### TC-S14-API-06 — Fulfillment queue
- **Given** kasir JWT + outlet scope
- **When** `GET /api/v1/online-orders/fulfillment`
- **Then** order `PAID|CONFIRMED|READY` muncul
- **Bukti:** `online-orders.service.ts` — `listFulfillment()` default filter `PAID,CONFIRMED,READY`

### TC-S14-API-07 — Status transition
- **When** `PATCH …/status` PAID→CONFIRMED→READY→COMPLETED
- **Then** berhasil; transisi ilegal → 422
- **Bukti:** `online-orders.service.test.ts` — "updateStatus rejects invalid transition"; `ALLOWED_STATUS_TRANSITIONS`

### TC-S14-API-08 — Delivery checkout diblokir
- **When** `POST …/orders` dengan `fulfillmentType: DELIVERY`
- **Then** 422 `ONLINE_DELIVERY_NOT_AVAILABLE`
- **Bukti:** `storefront.service.ts` L244–249

### TC-S14-API-09 — Midtrans mock mode
- **Given** `MIDTRANS_SERVER_KEY` kosong
- **When** checkout order baru
- **Then** `snapToken` mock + `redirectUrl` lokal; tidak call API Midtrans
- **Bukti:** `midtrans.service.ts` — `isMockMode()`, `createSnapPayment()` mock branch

---

## Test Cases — Web (Dimas / Citra)

### TC-S14-WEB-01 — Katalog live
- Buka `/store/{slug}`; produk dari API; filter kategori & pencarian
- **Bukti:** `store-api.ts` — `fetchProducts()`, `fetchCategories()`; `store-api.test.ts` (1/1 PASS)

### TC-S14-WEB-02 — Checkout → mock/sandbox payment
- Keranjang → checkout → redirect success / Snap
- **Bukti:** `store-api.ts` — `createOrder()`; route `checkout/page.tsx` konsumsi API live

### TC-S14-WEB-03 — Order status guest
- Halaman success menampilkan status dari API (verifikasi HP)
- **Bukti:** `store-api.ts` — `fetchOrderStatus()`; route `order/[orderId]/success/page.tsx`

### TC-S14-WEB-04 — Kasir antrian
- Login kasir → `/pos/online-orders` → advance status
- **Bukti:** `pos/online-orders/page.tsx` — `NEXT_STATUS` PAID→CONFIRMED→READY→COMPLETED; `online-orders-api.ts`

### TC-S14-WEB-05 — Pricing PPN 11%
- Subtotal + PPN = total konsisten kasir
- **Bukti:** `store/pricing.test.ts` (2/2 PASS) — regresi Sprint 13

---

## Regression

| ID | Deskripsi | Hasil |
|----|-----------|-------|
| SCR-S12-01–05 | Offline sync + BullMQ | ✅ PASS — `sync.s12.test.ts`, `sync.service.test.ts` |
| SCR-S13-H/P/B | Hold idempotency + BullMQ metrics | ✅ PASS — `transactions.service.test.ts`, `offline-hold-sync.test.ts` |
| SCR-S13-J→S14 | Storefront mock diganti API live | ✅ PASS — `store-api.test.ts`; tidak ada import `mock-api.ts` |
| SCR-S14-POS | Kasir walk-in `/pos` tidak terpengaruh | ✅ PASS — `pos/page.test.tsx` (8/8), `page.offline.test.tsx` (1/1) |

---

## Environment

| Variable | Dev / Sandbox |
|----------|---------------|
| `MIDTRANS_SERVER_KEY` | Kosong = mock mode; isi = sandbox Snap |
| `MIDTRANS_IS_PRODUCTION` | `false` |
| `STOREFRONT_BASE_URL` | `http://localhost:3001` |
| `MIDTRANS_WEBHOOK_SKIP_VERIFY` | `true` (dev only) |

**Prasyarat manual smoke:** `npm run docker:up` + `npm run db:seed`; set `sellOnline=true` pada produk uji via Prisma Studio atau SQL.

---

## Gate Otomatis (5 Juni 2026)

| Package | Target | Hasil |
|---------|--------|-------|
| `@barokah/api` test | ≥ 69 | ✅ **75/75** |
| `@barokah/api` lint/typecheck/build | lulus | ✅ |
| `@barokah/web` test | ≥ 59 | ✅ **60/60** |
| `@barokah/web` lint/typecheck | lulus | ✅ |

---

*Owner: Citra Lestari · Finalisasi: 5 Juni 2026*
