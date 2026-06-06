# Business Logic Audit — Fase 2 Growth (Omnichannel)

> **Tanggal:** 7 Juni 2026  
> **Auditor:** Rina Wulandari (domain) + Eko Susilo (algoritma) + Citra Lestari (QA)  
> **Scope:** Alur Fase 2 — online order, sync stok, offline PWA, QRIS, pelanggan, promo

## Ringkasan

| Flow | Status | Kebijakan / Catatan |
|------|--------|---------------------|
| Online order PAID → stok deduct | **PASS** | Stok berkurang **sekali** saat pembayaran konfirmasi (`markOrderPaid` → `SALE_ONLINE`) |
| Fulfillment COMPLETED → tidak double deduct | **PASS** | `updateStatus(COMPLETED)` **tidak** membuat `stockMovement` baru |
| Fulfillment → realtime stok dashboard | **PASS** | `emitStockChanged` saat COMPLETED + saat PAID |
| Storefront order ↔ POS stok | **PASS** | `inventoryItem.quantity` shared; laporan `GET /reports/stock` reflect online sale |
| Offline PWA sync → tidak duplicate sale | **PASS** | `clientRequestId` unique per outlet + idempotent replay di `SyncService` |
| QRIS mock → single stock movement | **PASS** | `QrisPaymentService` → `checkoutSplit` idempotent; satu `SALE` per request |
| Pelanggan walk-in vs online | **PASS** | Model `Customer` (phone unique per tenant); link ke `Transaction` + `OnlineOrder` |
| Promo stacking | **PASS** | `pickBestPromo` — **satu** promo terbaik; tidak stack ganda |

## Detail per flow

### 1. Online order — stok saat PAID (bukan saat COMPLETED)

**Keputusan bisnis Fase 2:** stok langsung dikurangi saat pembayaran online sukses agar kasir dan storefront melihat stok real-time; fulfillment hanya mengubah status operasional (CONFIRMED → READY → COMPLETED).

- Pembayaran Midtrans mock/live → `OnlineOrdersService.markOrderPaid`
- Movement type: `SALE_ONLINE`, reference `online_order`
- Test: `online-orders.service.test.ts` — webhook idempotent + invalid transition

### 2. Tidak double deduct di fulfillment

Saat kasir menandai order **COMPLETED**, sistem:

1. Update status + `completedAt`
2. Emit socket `stock:changed` (snapshot qty terkini untuk dashboard)
3. **Tidak** insert movement stok baru

### 3. Offline PWA — antrian idempotent

- Enqueue: unique `(outletId, clientRequestId)`
- Replay: jika transaksi sudah ada → status `APPLIED`, `idempotentReplay: true`
- Konflik stok: modal USE_SERVER / KEEP_CLIENT (Phase 8–10 regression)

### 4. Customer record

| Kanal | Perilaku |
|-------|----------|
| Walk-in POS | Opsional: nama + HP → `findOrCreateByPhone` → `Transaction.customerId` |
| Storefront checkout | Wajib nama+HP → `Customer` + `OnlineOrder.customerId` |
| Poin loyalitas | Field `points` stub (0 default) — redeem Fase 3 |

### 5. Promo Phase 2

- Targeting: `PromoApplyTo` ALL / CATEGORY / PRODUCT
- Checkout POS + storefront: **satu** promo via `pickBestPromo` atau `promoRuleId` eksplisit
- Test anti-stack: `promo-calculator.test.ts` — dua fixed promo tidak dijumlahkan

## Bugs fixed (Fase 2 start)

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| BL-F2-01 | P1 | Fulfillment COMPLETED tanpa notifikasi stok realtime | `emitFulfillmentStockSnapshot` + emit saat PAID |
| BL-F2-02 | P1 | Pelanggan online/walk-in tidak terpusat | Model `Customer` + link transaksi/order |
| BL-F2-03 | P2 | SMTP production hanya log console | `MailService` nodemailer + graceful fallback |

## Defer Fase 3

- Marketplace Tokopedia/Shopee sync
- Redeem poin / program loyalitas penuh
- QRIS gateway live (Xendit/Duitku) — interface `QrisProvider` siap
- Midtrans **production keys** (Pak Zaki)
- Multi-outlet analytics enterprise
- Integrasi accounting Jurnal/Accurate

*Audit Fase 2 closed: Rina + Eko + Citra · 7 Juni 2026*
