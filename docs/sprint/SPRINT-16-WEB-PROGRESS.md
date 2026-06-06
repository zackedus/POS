> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Progress | Audience: Pak Zaki, Budi, Dimas, Citra

# Sprint 16 Web — Progress

> **Tanggal update:** 6 Juni 2026  
> **Status:** **CLOSED** — UAT PASS (Midtrans mock-only per keputusan Pak Zaki)  
> **Plan:** [SPRINT-16-WEB-PLAN.md](./SPRINT-16-WEB-PLAN.md)  
> **UAT:** [SPRINT-16-UAT-FINAL.md](../testing/SPRINT-16-UAT-FINAL.md)  
> **Owner frontend:** Dimas Pratama · **Owner API:** Fajar Ramadhan · **QA gate:** Citra Lestari

---

## Sprint Close Summary

| Gate | Hasil |
|------|-------|
| API tests | ✅ **117/117** |
| Web tests | ✅ **97/97** |
| Typecheck | ✅ 9/9 packages |
| UAT Midtrans | ✅ **Mock mode only** (keputusan Pak Zaki — live sandbox defer) |
| UAT delivery checkout | ✅ PASS |
| UAT rate limit 429 UI | ✅ PASS |
| Socket.io real-time | ⏸ Defer Sprint 17 |

---

## Ringkasan Pass 4 (6 Jun 2026)

| Prioritas | Fitur | Status | Catatan |
|-----------|-------|--------|---------|
| **P0** | Midtrans mock → PAID → kasir queue | ✅ Done | `POST …/mock-pay` + success page auto-confirm mock |
| **P0** | Midtrans sandbox live smoke | ⏸ Defer | Kode Snap live ada; UAT live **bukan gate** sprint close |
| **P1** | Rate limit storefront 429 UI | ✅ Done | Guard 10 req/menit/IP+slug; pesan ID di storefront |
| **P1** | Socket.io real-time | ⏸ Defer | Infrastruktur gateway belum ada; polling 15s + toast tetap |

---

## Ringkasan Pass 3 (6 Jun 2026)

| Prioritas | Fitur | Status | Catatan |
|-----------|-------|--------|---------|
| **P0** | Delivery API aktif | ✅ Done | Hapus `ONLINE_DELIVERY_NOT_AVAILABLE`; `shippingFee` + `deliveryAddress` |
| **P0** | Storefront checkout delivery wired | ✅ Done | Tab Delivery → live API; ongkir flat Rp25.000 |
| **P0** | Kasir antrian delivery | ✅ Done | Badge 🚚 Antar + snippet alamat + ongkir |
| **P1** | Polling toast kasir | ✅ Done | `useOnlineOrderBadge` + banner non-blocking di `/pos` |
| **P1** | Admin `sellOnline` + `imageUrl` | ✅ Verified | `ProductFormWizard` → catalog API → storefront catalog |
| **P1** | Rate limit storefront 429 UI | ✅ Done | Pass 4 — guard API + `RATE_LIMIT_EXCEEDED` di web |

---

## Perubahan Pass 4

### Backend (Fajar)
- Midtrans: mock mode (`MIDTRANS_SERVER_KEY` kosong) vs sandbox Snap live (kode siap, UAT live defer)
- `POST /store/:slug/orders/:orderNo/mock-pay` — konfirmasi mock → webhook internal → status PAID
- Rate limit `POST /store/:slug/orders`: 10 req/menit per IP + `tenantSlug`
- Error `429` + `RATE_LIMIT_EXCEEDED` di envelope
- Test: `midtrans.service.test.ts`, `storefront-rate-limit.guard.test.ts`

### Frontend (Dimas)
- Success page: auto `confirmMockPayment` saat `?mockPaid=1`
- `publicApiJson` / `toUserFacingError`: pesan 429 Bahasa Indonesia
- Test: `api.test.ts`, `api-client.test.ts`

### Env (`.env.example`)
- `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`
- `MIDTRANS_WEBHOOK_SKIP_VERIFY`, `STOREFRONT_BASE_URL`

---

## Perubahan Teknis (Pass 3)

### Backend (Fajar)
- `POST /store/:slug/orders` menerima `fulfillmentType: DELIVERY` + `deliveryAddress`
- Ongkir flat `ONLINE_DELIVERY_FLAT_FEE` (Rp25.000) dari `@barokah/shared`
- Kolom Prisma `shipping_fee` + `delivery_address` sudah ada — tanpa migrasi baru
- Test: `storefront.service.test.ts` (PICKUP + DELIVERY)

### Frontend (Dimas)
- Checkout: submit delivery ke API live; ringkasan ongkir di `OrderSummary`
- Success page: label pickup vs delivery
- Kasir `/pos/online-orders`: badge antar + alamat singkat
- Kasir `/pos`: toast saat antrian bertambah (polling fallback)

### Shared
- Konstanta `ONLINE_DELIVERY_FLAT_FEE` di `packages/shared/src/constants/online-orders.ts`

---

## URL Review (Dev)

| Route | Role | Catatan |
|-------|------|---------|
| `/store/barokah-bangunan/checkout` | Publik | Tab Delivery submit → Midtrans mock |
| `/store/.../order/.../success` | Publik | Label fulfillment Delivery/Pickup |
| `/pos` | Kasir | Badge + toast order web baru |
| `/pos/online-orders` | Kasir | Antrian dengan badge 🚚 + alamat |

---

## Defer → Sprint 17+

- **Midtrans sandbox UAT live** dengan credential Pak Zaki (keputusan defer sprint close)
- **Socket.io** `online-order:paid` (butuh gateway NestJS + client)
- E2E test middleware redirect tanpa cookie
- httpOnly cookie prod migration (P2)

---

*Disusun: Dimas Pratama · 6 Juni 2026 · UAT sign-off: Citra · Sprint close: Budi*
