# Outlet Data Integrity Audit — 6 Jun 2026

> **Auditor:** Rina (POS Domain) · Eko (Algorithm) · Fajar (Backend) · Dimas (Frontend) · Citra (QA)  
> **Scope:** Konsistensi data per cabang (`outletId`) — produk, stok, transaksi POS, PO, transfer, order online, laporan.  
> **Baseline commits:** `6b40a79`, `c1cad90`, `e5d7d29`

## Ringkasan Eksekutif

Audit end-to-end menemukan **celah isolasi outlet** terutama di **Purchase Order (akses detail/receive)** dan **frontend POS (cabang aktif tidak konsisten)**. Backend inti (checkout stok, PO receive, transfer, laporan) sudah memakai `resolveOutletId` + filter `outletId`; perbaikan P0/P1 diterapkan + 5 test isolasi baru.

## Matriks Temuan

| ID | Modul | Severity | Temuan | Status | Perbaikan |
|----|-------|----------|--------|--------|-----------|
| ODI-01 | PO | **P0** | `getPurchaseOrder` / receive / return via ID tanpa cek `user.outletIds` — manager cabang A bisa akses PO cabang B | **Fixed** | `assertPoOutletAccess()` di `findPurchaseOrderOrThrow` + return detail |
| ODI-02 | POS Web | **P0** | Halaman `/pos` selalu pakai `outletIds[0]` — stok grid, shift, checkout, hold, QRIS tidak selaras cabang terpilih | **Fixed** | Integrasi `useOutletSelection`, `outletId` di semua payload API |
| ODI-03 | Shift Web | **P1** | Buka shift tanpa `outletId` — multi-outlet owner gagal / shift salah cabang | **Fixed** | Picker cabang + query param di `/shift/open` |
| ODI-04 | Checkout API | **P1** | `inventoryItem.update` gagal jika row belum ada (edge race) | **Fixed** | `upsert` saat deduct stok checkout |
| ODI-05 | POS Web | **P1** | Validasi keranjang & held/recent tanpa `outletId` | **Fixed** | Query/body scoped ke `activeOutletId` |
| ODI-06 | Catalog grid | P2 | Tanpa `outletId`, stok grid kosong (by design) | OK | `tryResolveGridOutlet` + wajib param multi-outlet |
| ODI-07 | Product cost | P2 | HPP weighted average tenant-level (bukan per outlet) | **Defer** | ADR future: outlet-specific cost jika bisnis minta |
| ODI-08 | Expense | P2 | `outletId` nullable (tenant-wide expense) | OK | By design — filter laporan tetap scoped |
| ODI-09 | Owner RBAC | Info | Owner bypass `outletIds` filter (full tenant) | OK | Sesuai RBAC seed |

## Trace Modul (Post-Fix)

| Modul | Scope mechanism | Catatan |
|-------|-----------------|---------|
| Products / Catalog | Tenant-level SKU; stok grid via `inventoryItem.outletId` | Bundle policy per outlet |
| Inventory | `resolveOutletId` + `outletId_productId` unique | Transfer atomic `$transaction` |
| Transactions / POS | Shift + stock + txn same `outletId`; idempotent `clientRequestId` per outlet | Immutable setelah COMPLETED |
| Purchase Orders | PO.outletId; receive menulis stok ke PO outlet | Access guard baru |
| Shifts | Satu shift open per kasir per outlet | Mismatch warning di POS UI |
| Online Orders | `outletId` fulfillment; stok deduct on complete | Midtrans scoped tenant |
| Reports | `resolveOutletId` on all query DTOs | Cross-outlet stock excludes current |
| Held transactions | Scoped `outletId`; recall checks stock cabang yang sama | TTL enforced |
| Sync queue | Unique `(outletId, clientRequestId)` | Offline replay idempotent |

## Test Coverage (Baru)

File: `apps/api/src/modules/outlet-data-integrity.test.ts`

1. PO detail blocked for outlet outside user scope  
2. Checkout outlet A tidak mengurangi stok outlet B  
3. Checkout ditolak tanpa shift aktif (`SHIFT_NOT_OPEN`)  
4. PO receive menambah stok ke outlet PO  
5. Transfer antar outlet atomic  

## Frontend Checklist (Dimas)

- [x] POS: picker cabang + badge di `PosShiftBar`  
- [x] POS: `outletId` pada checkout / hold / recall / validate-cart / QRIS  
- [x] POS layout: init `outletSelection` + shift scoped  
- [x] Shift open: picker + `outletId` body  
- [x] Warning shift mismatch vs cabang terpilih  

## Verifikasi Manual (Seed)

Login: `owner@barokah.local` / `Owner123!`

1. Pilih **Cabang Utara** di picker → grid stok berbeda dari Cabang Utama  
2. Buka shift di Cabang Utara → checkout deduct stok Cabang Utara saja  
3. PO Cabang Utama → manager single-outlet tidak bisa akses (403)  
4. Transfer 3 unit Main → North → stok Main −3, North +3  
5. Laporan dashboard filter mengikuti cabang terpilih  

## Handoff Log

| From | To | Task | Parallel OK? |
|------|-----|------|--------------|
| Rina · Domain | Citra · QA | Regression UAT multi-outlet dari AC di atas | Ya |
| Fajar · Backend | Fitri · Docs | Update INDEX jika release note user-facing | Ya |
| Dimas · Frontend | Maya · UX | Review warning shift mismatch copy | Ya |

---

*Dokumen ini melengkapi `docs/domain/FINANCE-ECONOMICS-POS.md` dan standar auth tenant+outlet di `ERROR-HANDLING-VALIDATION.md`.*
