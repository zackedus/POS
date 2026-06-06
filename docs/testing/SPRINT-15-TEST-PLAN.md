> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Citra, Fajar, Dimas, Pak Zaki

# Sprint 15 — Test Plan (Epic J Carry-over + Hardening)

> **Status:** **DRAFT — skeleton**  
> **Epic:** J — US-J-05, US-J-08, admin katalog, rate limit, offline PWA polish  
> **RFC:** [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md)  
> **Sprint plan:** [SPRINT-15-PLAN.md](../requirements/SPRINT-15-PLAN.md)  
> **Owner:** Citra Lestari (QA)

---

## Scope UAT

| Area | User Story / Item | Prioritas | Status UAT |
|------|-------------------|-----------|------------|
| Delivery checkout API + UI | US-J-05 | P0 | ☐ TBD |
| Midtrans sandbox Snap live | US-J-06 (live mode) | P0 | ☐ TBD |
| Owner admin `sellOnline` / gambar | ADR-004 Q-J08 | P1 | ☐ TBD |
| Socket.io notifikasi kasir | US-J-08 | P1 | ☐ TBD |
| Rate limit storefront `POST /orders` | RFC § rate limit | P1 | ☐ TBD |
| Offline PWA polish | Sprint 11–12 regresi | P2 | ☐ TBD |
| Payment expired auto-cancel | Sprint 15 P2 | P2 | ☐ TBD |

**Carry regression (wajib PASS):**

| Area | Referensi | Status |
|------|-----------|--------|
| Pickup checkout + fulfillment | [SPRINT-14-TEST-PLAN.md](./SPRINT-14-TEST-PLAN.md) | ☐ TBD |
| Offline sync + hold idempotency | SCR-S12, SCR-O* | ☐ TBD |
| Kasir walk-in | SCR-V* | ☐ TBD |

---

## Test Cases — API (Fajar / Citra)

### TC-S15-API-01 — Delivery checkout happy path
- **Given** outlet mendukung delivery, produk `sellOnline=true`, stok cukup
- **When** `POST /store/:slug/orders` dengan `fulfillmentType: DELIVERY` + alamat valid
- **Then** order `PENDING_PAYMENT`; tidak ada `ONLINE_DELIVERY_NOT_AVAILABLE`
- **Bukti:** _TBD setelah implementasi_

### TC-S15-API-02 — Delivery validation errors
- **When** alamat kosong / di luar area / outlet non-delivery
- **Then** 422 dengan error code sesuai RFC
- **Bukti:** _TBD_

### TC-S15-API-03 — Midtrans sandbox (non-mock)
- **Given** `MIDTRANS_SERVER_KEY` sandbox terisi
- **When** checkout order baru
- **Then** `snapToken` dari API Midtrans; webhook settlement idempotent
- **Bukti:** _TBD — manual smoke Arif_

### TC-S15-API-04 — Rate limit storefront
- **When** > N request `POST /orders` per IP dalam window
- **Then** 429 `RATE_LIMIT_EXCEEDED`
- **Bukti:** _TBD_

### TC-S15-API-05 — Socket.io event on PAID
- **Given** kasir subscribed room outlet
- **When** webhook `PAID`
- **Then** event diterima; antrian fulfillment ter-update
- **Bukti:** _TBD_

### TC-S15-API-06 — Payment expiry job
- **Given** order `PENDING_PAYMENT` > TTL
- **When** job expiry jalan
- **Then** status `EXPIRED` / cancelled; stok tidak terpotong
- **Bukti:** _TBD_

### TC-S15-API-07 — Admin patch sellOnline + imageUrl
- **Given** JWT Owner/Manager
- **When** `PATCH /products/:id` web fields
- **Then** katalog publik reflect perubahan
- **Bukti:** _TBD_

---

## Test Cases — Web (Dimas / Citra)

### TC-S15-WEB-01 — Storefront delivery tab
- Tab Delivery visible; form alamat; submit → payment flow
- **Bukti:** _TBD_

### TC-S15-WEB-02 — Admin katalog web
- Toggle sellOnline, set image; preview di `/store/{slug}`
- **Bukti:** _TBD_

### TC-S15-WEB-03 — Kasir socket notification
- Order paid → toast/list refresh di `/pos/online-orders`
- **Bukti:** _TBD_

### TC-S15-WEB-04 — Offline PWA polish
- Banner offline, hold drain, sync queue — regresi SCR-O*
- **Bukti:** _TBD_

---

## Regression Checklist

| ID | Deskripsi | Hasil |
|----|-----------|-------|
| SCR-S14-* | Epic J pickup + fulfillment | ☐ TBD |
| SCR-S12-* | BullMQ + offline sync | ☐ TBD |
| SCR-O* | Offline hold queue | ☐ TBD |
| SCR-V* | Void / kasir walk-in | ☐ TBD |

---

## Environment & Prasyarat UAT

- [ ] `npm run docker:up` + `npm run db:seed`
- [ ] Produk uji `sellOnline=true` (admin UI atau seed)
- [ ] Midtrans sandbox keys di `.env` (Pak Zaki / Arif)
- [ ] Staging URL documented — _TBD Yoga_

---

## Sign-off

| Role | Nama | Tanggal | Status |
|------|------|---------|--------|
| QA | Citra Lestari | — | ☐ |
| Backend | Fajar Ramadhan | — | ☐ |
| Frontend | Dimas Pratama | — | ☐ |
| CEO | Budi Santoso | — | ☐ |
| Pemilik | Pak Zaki | — | ☐ |

---

*Skeleton: Citra Lestari (QA) · 6 Juni 2026 — detail TC diisi saat staging S15-M3+*
