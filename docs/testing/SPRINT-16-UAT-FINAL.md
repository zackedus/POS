> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Citra, Fajar, Dimas, Arif, Budi, Fitri

# Sprint 16 — UAT Final Checklist

> **Tanggal:** 6 Juni 2026  
> **Status:** **CLOSED** — tervalidasi tanpa blocker P0 (Midtrans **mock mode only**)  
> **Owner uji:** Citra (QA), Fajar (Backend/API), Dimas (Frontend), Arif (Integrasi), Budi (Orchestrator)

---

## Keputusan Pemilik Proyek

> **Pak Zaki (6 Jun 2026):** UAT Midtrans **mock mode saja cukup** untuk tutup Sprint 16. Live Midtrans sandbox UAT **tidak wajib** untuk sprint close — didefer ke sprint berikutnya.

UAT final Sprint 16 dinyatakan **PASS** berdasarkan keputusan di atas, verifikasi unit test, dan code review alur end-to-end.

---

## Scope UAT Final

1. **Storefront checkout pickup + delivery** — tab Delivery wired ke API live; ongkir flat Rp25.000.
2. **Midtrans mock mode** — redirect mock + `POST …/mock-pay` → status `PAID` → stok `SALE_ONLINE`.
3. **Antrian fulfillment kasir** — `/pos/online-orders` dengan badge 🚚 delivery + snippet alamat.
4. **Rate limit storefront 429 UI** — throttle 10 req/menit per IP+slug; pesan Bahasa Indonesia di web.
5. **Routing & auth hardening** (carry-over Sprint 15) — redirect master, middleware session, `not-found` role-aware.
6. **Admin katalog web** — toggle `sellOnline` + `imageUrl` tercermin di katalog publik.

**Di luar scope UAT sprint close:** Midtrans sandbox Snap live dengan credential, Socket.io real-time kasir.

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|------|-------|-------------|
| Delivery checkout API (US-J-05) | ✅ PASS | `storefront.service.test.ts` — DELIVERY + flat fee Rp25.000 |
| Storefront checkout pickup + delivery | ✅ PASS | Checkout tab Delivery/Pickup; `OrderSummary` ongkir |
| Midtrans mock → PAID (US-J-06) | ✅ PASS | `midtrans.service.test.ts`, `online-orders.service.test.ts` |
| Mock-pay endpoint | ✅ PASS | `POST /store/:slug/orders/:orderNo/mock-pay` |
| Kasir antrian + badge delivery (US-J-07) | ✅ PASS | `/pos/online-orders` — badge 🚚 + alamat |
| Polling toast kasir (fallback) | ✅ PASS | `useOnlineOrderBadge` + banner non-blocking di `/pos` |
| Rate limit 429 API + UI | ✅ PASS | `storefront-rate-limit.guard.test.ts`, `api.test.ts` |
| Admin `sellOnline` + gambar | ✅ PASS | `ProductFormWizard.test.tsx` (16/16) |
| Routing/middleware hardening | ✅ PASS | Redirect `/dashboard/categories` → `/master/categories`; middleware session |
| Regresi Epic J + offline PWA + kasir walk-in | ✅ PASS | `pos/page.test.tsx` (8/8), `page.offline.test.tsx`, `sync.s12.test.ts` |
| Midtrans sandbox Snap live | ⏸ DEFER | Keputusan Pak Zaki — bukan gate Sprint 16 |
| Socket.io `online-order:paid` | ⏸ DEFER | Infrastruktur gateway belum ada; polling 15s tetap |

---

## Bukti Verifikasi Teknis (Re-run Final — 6 Juni 2026)

### API (`@barokah/api`)

| Perintah | Hasil |
|----------|-------|
| `npm run test -w @barokah/api` | ✅ **117/117** |
| `npm run typecheck -w @barokah/api` | ✅ |

### Web (`@barokah/web`)

| Perintah | Hasil |
|----------|-------|
| `npm run test -w @barokah/web` | ✅ **97/97** |
| `npm run typecheck -w @barokah/web` | ✅ |

### Monorepo

| Perintah | Hasil |
|----------|-------|
| `npm run typecheck` | ✅ 9/9 packages |

**Delta test vs Sprint 14:** API +42 (Midtrans, rate limit, delivery storefront), Web +37 (admin wizard, API client 429, regresi).

---

## Mapping Test Case → Hasil

### Track A — Delivery & Storefront API (TC-S16-API)

| ID | Hasil | Bukti |
|----|-------|-------|
| TC-S16-API-01 | ✅ PASS | `storefront.service.test.ts` — `createOrder DELIVERY` + `shippingFee` Rp25.000 |
| TC-S16-API-02 | ✅ PASS | `storefront.service.test.ts` — `createOrder PICKUP` shipping fee nol |
| TC-S16-API-03 | ✅ PASS | `formatDeliveryAddressSnippet` — snippet alamat untuk kasir |
| TC-S16-API-04 | ✅ PASS | Hapus blokir `ONLINE_DELIVERY_NOT_AVAILABLE` — delivery aktif |

### Track B — Midtrans Mock (TC-S16-MIDTRANS)

| ID | Hasil | Bukti |
|----|-------|-------|
| TC-S16-MID-01 | ✅ PASS | `midtrans.service.test.ts` — `isMockMode()` tanpa `MIDTRANS_SERVER_KEY` |
| TC-S16-MID-02 | ✅ PASS | `createSnapPayment` mock redirect saat mock mode |
| TC-S16-MID-03 | ✅ PASS | `online-orders.service.test.ts` — webhook idempotent PAID |
| TC-S16-MID-04 | ✅ PASS | `mock-pay` → internal webhook → status PAID + stok `SALE_ONLINE` |
| TC-S16-MID-05 | ⏸ DEFER | Live sandbox Snap redirect — **bukan gate sprint close** |

### Track C — Rate Limit (TC-S16-RATE)

| ID | Hasil | Bukti |
|----|-------|-------|
| TC-S16-RATE-01 | ✅ PASS | `storefront-rate-limit.guard.test.ts` — allow ≤10 req/menit |
| TC-S16-RATE-02 | ✅ PASS | Guard blokir request ke-11 → HTTP 429 + `RATE_LIMIT_EXCEEDED` |
| TC-S16-RATE-03 | ✅ PASS | `api.test.ts` — `mapHttpStatusToUserMessage(429)` pesan ID |
| TC-S16-RATE-04 | ✅ PASS | `api-client.test.ts` — envelope 429 ke user-facing error |

### Track D — Web Storefront & Kasir (TC-S16-WEB)

| ID | Hasil | Bukti |
|----|-------|-------|
| TC-S16-WEB-01 | ✅ PASS | Checkout tab Delivery submit ke API live |
| TC-S16-WEB-02 | ✅ PASS | Success page label pickup vs delivery + auto `confirmMockPayment` saat `?mockPaid=1` |
| TC-S16-WEB-03 | ✅ PASS | `/pos/online-orders` — badge 🚚 + snippet alamat + ongkir |
| TC-S16-WEB-04 | ✅ PASS | `/pos` — toast polling saat antrian bertambah |
| TC-S16-WEB-05 | ✅ PASS | `store-api.test.ts` — mapping katalog live |
| TC-S16-WEB-06 | ✅ PASS | `store/pricing.test.ts` — PPN 11% regresi |

### Track E — Admin & Routing (TC-S16-ADMIN)

| ID | Hasil | Bukti |
|----|-------|-------|
| TC-S16-ADM-01 | ✅ PASS | `ProductFormWizard.test.tsx` — toggle `sellOnline`, `imageUrl` |
| TC-S16-ADM-02 | ✅ PASS | Redirect `/dashboard/categories` → `/master/categories` |
| TC-S16-ADM-03 | ✅ PASS | Redirect `/dashboard/bundles` → `/master/bundles` |
| TC-S16-ADM-04 | ✅ PASS | Middleware cookie session + `not-found` role-aware |

### Track F — User Story Traceability (US-J-01 … US-J-07)

| Story | Hasil | Catatan |
|-------|-------|---------|
| US-J-01 Katalog publik | ✅ PASS | Regresi — filter `sellOnline` + admin toggle |
| US-J-02 PDP | ✅ PASS | Regresi Sprint 14 |
| US-J-03 Keranjang | ✅ PASS | Regresi Sprint 14 |
| US-J-04 Checkout pickup | ✅ PASS | Regresi + mock-pay flow |
| US-J-05 Delivery | ✅ PASS | **Aktif Sprint 16** — ongkir flat Rp25.000 |
| US-J-06 Midtrans | ✅ PASS (mock) | Mock mode lulus; **live sandbox defer** per Pak Zaki |
| US-J-07 Antrian POS | ✅ PASS | Badge delivery + fulfillment transisi valid |

### Track G — Regression

| ID | Hasil | Bukti |
|----|-------|-------|
| SCR-S14-POS-01 | ✅ PASS | `pos/page.test.tsx` (8/8) — walk-in tidak regresi |
| SCR-S14-POS-02 | ✅ PASS | `page.offline.test.tsx` (1/1) — offline checkout |
| SCR-S12-01–05 | ✅ PASS | `sync.s12.test.ts` — BullMQ + replay |
| SCR-S13-H01–H08 | ✅ PASS | Hold idempotency regresi |

---

## Checklist UAT Final (Pak Zaki)

- [x] Checkout pickup guest + delivery wired ke API live.
- [x] Ongkir flat Rp25.000 (`ONLINE_DELIVERY_FLAT_FEE`) tercermin di order + ringkasan checkout.
- [x] Midtrans mock mode: redirect success + `mock-pay` → status `PAID`.
- [x] Webhook idempotent → stok `SALE_ONLINE`.
- [x] Antrian fulfillment kasir `/pos/online-orders` dengan badge delivery + alamat.
- [x] Rate limit storefront 429 + pesan Bahasa Indonesia di UI.
- [x] Admin toggle `sellOnline` + `imageUrl` tercermin di katalog publik.
- [x] Routing/middleware hardening (redirect master, session cookie).
- [x] Regresi Epic J + offline PWA + kasir walk-in hijau.
- [x] API **117/117**, Web **97/97**, typecheck lulus.
- [ ] Midtrans sandbox Snap live — **defer** (keputusan Pak Zaki, non-blocker P0).
- [ ] Socket.io notifikasi kasir real-time — **defer Sprint 17**.

---

## Yang Bisa Langsung Dites (Dev)

**Prasyarat:** API port **3000**, web port **3001**, PostgreSQL + seed (`npm run docker:up` + `npm run db:seed`). **Jangan set** `MIDTRANS_SERVER_KEY` untuk mock mode.

| Layar / Endpoint | URL |
|------------------|-----|
| Storefront checkout | http://localhost:3001/store/barokah-bangunan/checkout |
| Tab Delivery | Form alamat + ongkir Rp25.000 |
| Success mock | `?mockPaid=1` → auto confirm mock payment |
| Antrian kasir | http://localhost:3001/pos/online-orders |
| Kasir toast | http://localhost:3001/pos (polling 15s) |
| Mock-pay API | POST http://localhost:3000/api/v1/store/:slug/orders/:orderNo/mock-pay |

**Kredensial dev:** `kasir@barokah.local` / `Kasir123!`

**Smoke manual mock payment:**

1. Checkout order (pickup atau delivery) tanpa `MIDTRANS_SERVER_KEY`
2. Redirect ke success page mock
3. Status order `PAID` — muncul di `/pos/online-orders`
4. Kasir: **Konfirmasi** → **Tandai siap** → **Selesai**

**Smoke manual rate limit (opsional):**

1. Submit checkout >10 kali dalam 1 menit dari IP sama
2. Request ke-11 → HTTP 429 + pesan rate limit Bahasa Indonesia di storefront

---

## Item Defer (Non-blocking Sprint 16 Close)

| Item | Target | Status UAT |
|------|--------|------------|
| Midtrans sandbox Snap live (credential) | Sprint 17+ | ⏸ Defer — keputusan Pak Zaki |
| Socket.io `online-order:paid` + badge real-time | Sprint 17 | ⏸ Defer — polling 15s + toast fallback |
| E2E test middleware redirect tanpa cookie | Sprint 17 | ⏸ Defer |
| httpOnly cookie production migration | Sprint 16 P2 / prod deploy | ⏸ Defer |
| CAPTCHA guest checkout | Backlog P1 | N/A |
| Payment expired auto-cancel job | Backlog | N/A |

---

## Sign-off QA

| Peran | Nama | Keputusan | Tanggal |
|-------|------|-----------|---------|
| QA Engineer | **Citra Lestari** | **PASS** — mock-only Midtrans sesuai keputusan Pak Zaki; tidak ada blocker P0 | 6 Jun 2026 |
| Backend/API | **Fajar Ramadhan** | **PASS** — delivery API, mock-pay, rate limit verified | 6 Jun 2026 |
| Frontend | **Dimas Pratama** | **PASS** — checkout delivery, 429 UI, kasir queue verified | 6 Jun 2026 |
| Orchestrator | **Budi Santoso** | **CLOSED** — Sprint 16 ditutup; defer live Midtrans + Socket.io | 6 Jun 2026 |

---

## Keputusan QA

**Sprint 16 UAT dinyatakan PASS — tidak ada blocker P0.** Semua gate otomatis hijau (API 117/117, Web 97/97, typecheck 9/9). Epic J P0 delivery (US-J-05), Midtrans mock (US-J-06), dan antrian kasir (US-J-07) tervalidasi via unit test + verifikasi kode. **Live Midtrans sandbox** dan **Socket.io real-time** didefer ke sprint berikutnya sesuai keputusan Pak Zaki dan scope plan.

---

*Disusun: Citra Lestari · 6 Juni 2026 · Review: Fajar, Dimas, Budi*
