# Business Logic Audit — Retail Bahan Bangunan SMB

> **Tanggal:** 6 Juni 2026  
> **Auditor:** Rina Wulandari (domain) + Eko Susilo (algoritma)  
> **Scope:** Core retail flows Phase 7 · automated tests + code review

## Ringkasan

| Flow | Status | Catatan |
|------|--------|---------|
| Multi-unit buy dus / sell kg | **PASS** | PO receive → base kg, POS sell kg/dus, HPP `deriveBaseCostFromPurchaseCost` |
| Seng roll/meter | **PASS** | Stock deduct base meter; roll = 50m; pricing `resolveSellUnitPrice` |
| VARIANT pricing | **PASS** | SKU varian punya `price` sendiri; parent `hasVariants` ditolak checkout/hold/validate |
| PO distributor | **PASS** | DRAFT → ORDERED → receive → HPP update + stock movement |
| PO return | **PASS** | Retur setelah receive; stock decrease base unit |
| Promo at checkout | **PASS** | `promoRuleId` → diskon di `transaction.discount`; margin warning pre-diskon |
| Hold/recall multi-unit | **PASS** | `sellUnitId` persisted; recall cek base stock |
| Shift close | **PASS** | `expectedCash = opening + cashSales` (split payment aware) |
| Online order | **PASS** | Mock pay → PAID queue; TTL 60m → EXPIRED job |

## Detail per flow

### 1. Multi-unit (dus/kg) — PASS

- **PO:** `purchase-orders.service.test.ts` — receive dus → stock +25 kg per dus, HPP base updated
- **POS:** `transactions.service.test.ts` — sell 2.5 kg ecer, sell 1 dus (20 kg deduct)
- **Margin:** `derivePurchaseCostFromBaseCost` pada sell unit non-base

### 2. Seng roll/meter — PASS

- Sell 12.5 m → deduct 12.5 base
- Sell 1 roll → deduct 50 m
- Insufficient stock message menampilkan m dan roll (`40 m (0,8 roll)`)

### 3. VARIANT pricing — PASS

- Grid POS mengecualikan parent (`hasVariants: true`)
- Checkout variant SKU menggunakan `product.price` varian (test: 125.000 × 2)
- **Fix Phase 7:** `validateCart` sekarang menolak parent varian (sebelumnya gap P1)

### 4. PO distributor — PASS

- Create draft → submit ORDERED → partial receive → RECEIVED
- Print/export via UI dashboard PO (verified Phase 3)

### 5. PO return — PASS

- `createPurchaseOrderReturn` — validasi qty retur ≤ received − returned
- Stock movement `PURCHASE_RETURN`

### 6. Promo checkout — PASS

- `PromoService.validateWithItems` — percent/fixed/category/product scope
- Checkout: diskon mengurangi total; split payment assert total setelah diskon
- Margin warning tetap pada harga jual per line (bisnis: alert sebelum diskon)

### 7. Hold/recall multi-unit — PASS

- Hold roll seng: total 2.250.000, `sellUnitId: unit-roll`
- Recall: restore cart dengan sellUnitId; stock check base

### 8. Shift close — PASS

- `shifts.service.test.ts` — opening 100k + cash sales 150k = expected 250k
- Split cash: hanya komponen CASH dijumlahkan

### 9. Online order — PASS

- Mock Midtrans redirect (`midtrans.service.test.ts`)
- TTL `paymentExpiresAt` 60 menit (`online-order.util.test.ts`)
- `expirePendingOrders` → status EXPIRED
- Kasir queue `/pos/online-orders`

## Bugs fixed (Phase 7)

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| BL-07-01 | P1 | `validateCart` tidak menolak parent varian | Guard `hasVariants` di `validateCart` + test |

## Defer Phase 8

- Post-promo margin recalc per line (warning only today)
- Weighted average HPP across partial receives (current: last receive overwrites)
- Scheduled analytics export / email

*Audit closed: Rina + Eko · 6 Juni 2026*
