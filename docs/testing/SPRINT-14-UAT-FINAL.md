> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Citra, Fajar, Dimas, Arif, Budi, Fitri

# Sprint 14 — UAT Final Checklist

> **Tanggal:** 5 Juni 2026  
> **Status:** **CLOSED** — tervalidasi tanpa blocker P0  
> **Owner uji:** Citra (QA), Fajar (Backend/API), Dimas (Frontend), Arif (Integrasi), Budi (Orchestrator)

---

## Scope UAT Final

1. **Modul API `online_orders`** — migrasi Prisma, storefront publik, fulfillment kasir, webhook Midtrans.
2. **Storefront live wiring** — `/store/[slug]` konsumsi API (ganti mock Sprint 13).
3. **Midtrans mock mode** — checkout tanpa env; webhook idempotent `PAID` + stok `SALE_ONLINE`.
4. **Antrian fulfillment kasir** — `/pos/online-orders` transisi PAID→CONFIRMED→READY→COMPLETED.
5. **Regresi Sprint 12–13** — offline sync, hold idempotency, kasir walk-in.

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|------|-------|-------------|
| Storefront API publik (US-J-01–04) | ✅ PASS | `storefront.service.ts`, migrasi `20260605100000_sprint14_online_orders` |
| Midtrans mock + webhook (US-J-06) | ✅ PASS | `midtrans.service.ts`, `online-orders.service.test.ts` |
| Fulfillment kasir (US-J-07) | ✅ PASS | `online-orders.service.ts`, `pos/online-orders/page.tsx` |
| Storefront web live (US-J-01–04) | ✅ PASS | `store-api.ts`, `store-api.test.ts` (1/1) |
| Regresi offline PWA + kasir | ✅ PASS | `sync.s12.test.ts`, `pos/page.test.tsx` (8/8) |
| Delivery checkout (US-J-05) | N/A | Defer Sprint 15 — `ONLINE_DELIVERY_NOT_AVAILABLE` |

---

## Bukti Verifikasi Teknis (Re-run Final — 5 Juni 2026)

### Database

| Perintah | Hasil |
|----------|-------|
| `npm run db:generate` | ✅ |
| `npm run db:migrate` | ✅ — schema in sync |
| `npm run db:seed` | ✅ — tenant `barokah-bangunan`, 7 produk |

### API (`@barokah/api`)

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run test -w @barokah/api` | ✅ **75/75** |
| `npm run build -w @barokah/api` | ✅ |

### Web (`@barokah/web`)

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web -- --run` | ✅ **60/60** |

**Delta test vs Sprint 13:** API +6 (4 util + 2 service online-orders), Web +1 (`store-api.test.ts`).

---

## Mapping Test Case → Hasil

### Track A — API Online Orders (TC-S14-API)

| ID | Hasil | Bukti |
|----|-------|-------|
| TC-S14-API-01 | ✅ PASS | `storefront.service.ts` — `resolveTenant()`, `ONLINE_STORE_NOT_FOUND` |
| TC-S14-API-02 | ✅ PASS | Filter `sellOnline: true`; `stockStatus` dari inventory outlet |
| TC-S14-API-03 | ✅ PASS | `createOrder()` replay `clientRequestId` — unique `(tenantId, clientRequestId)` |
| TC-S14-API-04 | ✅ PASS | `createOrder()` L345–354 — 409 `INSUFFICIENT_STOCK` + details |
| TC-S14-API-05 | ✅ PASS | `online-orders.service.test.ts` — idempotency PAID; `markOrderPaid()` `SALE_ONLINE` |
| TC-S14-API-06 | ✅ PASS | `listFulfillment()` — filter default `PAID,CONFIRMED,READY` |
| TC-S14-API-07 | ✅ PASS | `online-orders.service.test.ts` — invalid transition 422 |
| TC-S14-API-08 | ✅ PASS | `createOrder()` — `ONLINE_DELIVERY_NOT_AVAILABLE` |
| TC-S14-API-09 | ✅ PASS | `midtrans.service.ts` — `isMockMode()` tanpa `MIDTRANS_SERVER_KEY` |

### Track B — Web Storefront Live (TC-S14-WEB)

| ID | Hasil | Bukti |
|----|-------|-------|
| TC-S14-WEB-01 | ✅ PASS | `store-api.test.ts` — mapping katalog + URL API live |
| TC-S14-WEB-02 | ✅ PASS | `store-api.ts` — `createOrder()` + payment redirect |
| TC-S14-WEB-03 | ✅ PASS | `fetchOrderStatus()` — verifikasi HP 4 digit terakhir |
| TC-S14-WEB-04 | ✅ PASS | `pos/online-orders/page.tsx` — `NEXT_STATUS` + `updateOrderStatus()` |
| TC-S14-WEB-05 | ✅ PASS | `store/pricing.test.ts` (2/2) — PPN 11% regresi |

### Track C — User Story Traceability (US-J-01 … US-J-07)

| Story | Hasil | Catatan |
|-------|-------|---------|
| US-J-01 Katalog publik | ✅ PASS | API filter `sellOnline`; UI `fetchProducts` live |
| US-J-02 PDP | ✅ PASS | Route `p/[productId]/page.tsx` + API detail produk |
| US-J-03 Keranjang | ✅ PASS | `cart-context.tsx` localStorage 24 jam; validasi MOQ |
| US-J-04 Checkout pickup | ✅ PASS | Form guest + `createOrder` pickup; nomor `WEB-YYYYMMDD-####` |
| US-J-05 Delivery | N/A | P1 — diblokir API; target Sprint 15 |
| US-J-06 Midtrans | ✅ PASS (mock) | Mock mode lulus; sandbox live = manual smoke |
| US-J-07 Antrian POS | ✅ PASS | `/pos/online-orders` + API fulfillment |

### Track D — Regression

| ID | Hasil | Bukti |
|----|-------|-------|
| SCR-S12-01–05 | ✅ PASS | `sync.s12.test.ts` — BullMQ + replay |
| SCR-S13-H01–H08 | ✅ PASS | `transactions.service.test.ts` — hold idempotency |
| SCR-S13-P01–P04 | ✅ PASS | `offline-hold-sync.test.ts` (1/1) |
| SCR-S13-B01–B06 | ✅ PASS | `sync.service.test.ts` SCR-O03, `sync.s12.test.ts` SCR-S12-05 |
| SCR-S14-POS-01 | ✅ PASS | `pos/page.test.tsx` (8/8) — walk-in tidak regresi |
| SCR-S14-POS-02 | ✅ PASS | `page.offline.test.tsx` (1/1) — offline checkout |

---

## Checklist UAT Final (Pak Zaki)

- [x] Migrasi `online_orders` + kolom produk web (`sellOnline`, `moq`, `orderStep`) diterapkan.
- [x] Storefront `/store/[slug]` memakai API live — bukan mock Sprint 13.
- [x] Checkout pickup guest + `clientRequestId` idempotent.
- [x] Webhook Midtrans idempotent → status `PAID` + stok `SALE_ONLINE`.
- [x] Antrian fulfillment kasir `/pos/online-orders` transisi status valid.
- [x] Midtrans mock mode berfungsi tanpa env credential.
- [x] Regresi Sprint 12–13 (sync, hold, kasir walk-in) hijau.
- [x] API **75/75**, Web **60/60**, lint/typecheck/build lulus.
- [ ] Midtrans sandbox Snap live — **manual smoke** (butuh env, non-blocker P0).
- [ ] Produk seed `sellOnline=true` — **manual setup** untuk demo storefront (non-blocker unit test).

---

## Yang Bisa Langsung Dites (Dev)

**Prasyarat:** API port **3000**, web port **3001**, PostgreSQL + seed (`npm run docker:up` + `npm run db:seed`).

**Setup produk online (sekali):**

```sql
UPDATE products SET sell_online = true WHERE sku IN ('SMN-001', 'PPA-001', 'KRM-001');
```

| Layar / Endpoint | URL |
|------------------|-----|
| Storefront live | http://localhost:3001/store/barokah-bangunan |
| PDP | http://localhost:3001/store/barokah-bangunan/p/{productId} |
| Keranjang | http://localhost:3001/store/barokah-bangunan/cart |
| Checkout pickup | http://localhost:3001/store/barokah-bangunan/checkout |
| Antrian kasir | http://localhost:3001/pos/online-orders |
| Webhook Midtrans (dev) | POST http://localhost:3000/api/v1/webhooks/midtrans/online |

**Kredensial dev:** `kasir@barokah.local` / `Kasir123!`

**Smoke manual Midtrans sandbox (opsional):**

1. Set `.env`: `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION=false`, `MIDTRANS_WEBHOOK_SKIP_VERIFY=true`
2. Checkout order → redirect Snap sandbox
3. Bayar di sandbox → webhook POST → status `PAID` + stok berkurang
4. Replay webhook sama → respons `Already paid` / `Duplicate webhook`

**Smoke manual fulfillment:**

1. Login kasir → buka shift
2. Buka `/pos/online-orders`
3. Klik **Konfirmasi** → **Tandai siap** → **Selesai / diserahkan**

---

## Item Defer (Non-blocking)

| Item | Target | Status UAT |
|------|--------|------------|
| US-J-05 Delivery checkout | Sprint 15 | N/A |
| Midtrans sandbox live (env) | Sprint 15 | Manual smoke documented |
| Rate limit storefront | Sprint 15 | N/A |
| Owner UI `sellOnline` / gambar | Sprint 15 | N/A |
| Socket.io notifikasi kasir US-J-08 | Sprint 15 | N/A |
| CAPTCHA guest checkout | Backlog P1 | N/A |
| Payment expired auto-cancel job | Sprint 15 | N/A |

---

## Keputusan QA

**Sprint 14 UAT dinyatakan PASS — tidak ada blocker P0.** Semua gate otomatis hijau (API 75/75, Web 60/60). Epic J P0 (US-J-01–04, J-06, J-07) tervalidasi via unit test + verifikasi kode. Item P1 dan integrasi sandbox live didefer ke Sprint 15 dengan langkah manual smoke terdokumentasi.

---

*Disusun: Citra Lestari · 5 Juni 2026 · Review: Fajar, Dimas, Budi*
