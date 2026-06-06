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

---

## Phase 8 — Deep Audit Edge Cases (6 Jun 2026)

> **Auditor:** Rina (domain) + Eko (algoritma) + Citra (QA regression)  
> **Scope:** Edge cases deferred from Phase 7 · automated tests + code fixes

| Flow | Status | Catatan |
|------|--------|---------|
| Split payment + promo + multi-unit same cart | **PASS** | `BL-08-01` — kg + dus same SKU, promo reduces total |
| Partial PO receive then return partial | **PASS** | Existing PO tests — partial receive + return qty cap |
| Transfer stok antar cabang + sell from destination | **PASS** | `inventory.service.test` TRANSFER_OUT/IN + POS sell deduct |
| Bundle sell at POS (outlet policy tenant vs outlet) | **PASS** | Phase 7 tests — outlet policy disable bundle |
| Online order delivery + shipping fee in margin/report | **PASS** | `storefront.service.test` flat shipping; margin report excludes shipping (revenue = item subtotal) |
| Shift close with held transactions | **PASS** | `getClosePreview` returns `heldCount` + warning; tidak block close |
| Void transaction stock restore multi-unit | **PASS** | `BL-08-03` — VOID_RESTORE base qty from SALE movement |
| Expense tidak affect stock | **PASS** | `expenses.service.test` — no inventory/stockMovement touch |
| Tax/PPN toggle tenant settings | **PASS** | **Fix BL-08-02** — `computePosTax` + checkout cash/split apply PPN exclusive |

### Bugs fixed (Phase 8)

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| BL-08-02 | P0 | PPN enabled di settings tapi checkout POS `tax: 0` | `computePosTax` di `@barokah/shared` + wire `tenantSettings` di checkout |
| BL-08-05 | P1 | Shift close tidak menampilkan hold aktif | `heldCount` + `heldWarning` di `getClosePreview` + UI tutup shift |

### Defer Phase 9

- Midtrans **live** production keys (butuh Pak Zaki)
- WebUSB thermal driver production (stub connect only)
- Offline PWA bi-directional conflict merge otomatis
- Mobile native QRIS + shift UI
- Weighted average HPP partial receives

---

## Phase 9 — Parallel Lanes Regression (6 Jun 2026)

> **Auditor:** Rina (domain) + Eko (algoritma) + Citra (QA regression)  
> **Scope:** Defer items Phase 8 · lanes A–G

| Flow | Status | Catatan |
|------|--------|---------|
| Weighted average HPP partial PO receive | **PASS** | `BL-09-01` — formula `(q1×c1 + q2×c2)/(q1+q2)`; test 10@68000 + 10@72000 → 70000 |
| Offline conflict resolve (server/client wins) | **PASS** | Modal Bahasa Indonesia + `USE_SERVER` / `KEEP_CLIENT` actions |
| Mobile shift open/close + QRIS stub | **PASS** | SecureStore shift state; QRIS honest "coming soon" |
| Midtrans live production guardrails | **PASS** | Tenant key + strict webhook verify production; mock fallback tanpa key |
| Thermal ESC/POS WebUSB production path | **PASS** | `buildEscPosReceiptFromDto` + `printEscPosWebUsb` transfer |
| Analytics scheduled export (minggu ini) | **PASS** | `GET /reports/analytics/export/scheduled?preset=week` |

### Formula HPP weighted average (Lane A)

```
HPP_baru = (stok_lama × HPP_lama + qty_terima × HPP_terima) / (stok_lama + qty_terima)
```

Implementasi: `computeWeightedAverageBaseCost` di `@barokah/shared` · dipanggil saat `receivePurchaseOrder`.

### Bugs fixed (Phase 9)

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| BL-09-01 | P0 | Partial PO receive overwrite HPP dengan receive terakhir saja | Weighted average pada `costPrice` update |

### Defer Phase 10

- Mobile offline queue + sync penuh
- QRIS native deep link / payment SDK
- Email cron analytics export
- CSP hardening production
- Midtrans live credentials Pak Zaki (production keys)

*Audit Phase 9 closed: Rina + Eko + Citra · 6 Juni 2026*
