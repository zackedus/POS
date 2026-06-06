# Alur Order Distributor (PO) — Barokah Core POS

> **Owner domain:** Rina · **API:** Fajar · **UI:** Dimas  
> **Status:** Implemented P0 (Jun 2026)

## Ringkasan Bisnis

Alur lengkap order ke distributor untuk retail bahan bangunan:

1. **Buat order** — manager/owner susun barang, qty, harga beli per satuan distributor
2. **Kirim & cetak** — order status ORDERED, cetak PO untuk dikirim ke supplier
3. **Terima barang** — saat pengiriman tiba (bisa hari berbeda), checklist qty diterima
4. **Update stok & HPP** — stok masuk ledger `PURCHASE`, `Product.costPrice` diperbarui dari harga beli aktual

## Status Lifecycle

| Status | Arti | Aksi UI |
|--------|------|---------|
| `DRAFT` | Order sedang disusun | Edit, kirim, batalkan |
| `ORDERED` | Sudah dikirim ke distributor | Cetak, terima barang, batalkan |
| `PARTIALLY_RECEIVED` | Sebagian barang sudah diterima | Terima lagi, cetak |
| `RECEIVED` | Semua barang diterima | Lihat saja |
| `CANCELLED` | Dibatalkan | — |

## Tanggal Penting

- `orderedAt` — saat order dikirim (contoh: Senin)
- `expectedDeliveryAt` — perkiraan tiba (opsional)
- `receivedAt` — saat semua baris lunas diterima (contoh: Rabu)
- `PurchaseOrderReceipt.receivedAt` — per batch penerimaan partial

## HPP on Receive

- Harga beli disimpan per **satuan order** (dus, roll, sak)
- Saat terima barang: `deriveBaseCostFromPurchaseCost(unitCost, conversionToBase)` → update `products.cost_price`
- HPP **tidak** berubah saat draft/submit — hanya saat penerimaan aktual

## API Endpoints (OWNER/MANAGER)

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/v1/purchase-orders` | List PO per outlet |
| POST | `/api/v1/purchase-orders` | Buat draft |
| GET | `/api/v1/purchase-orders/:id` | Detail + data cetak |
| PATCH | `/api/v1/purchase-orders/:id` | Update draft |
| POST | `/api/v1/purchase-orders/:id/submit` | DRAFT → ORDERED |
| POST | `/api/v1/purchase-orders/:id/cancel` | Batalkan |
| POST | `/api/v1/purchase-orders/:id/receive` | Terima barang (partial OK) |
| POST | `/api/v1/purchase-orders/receive` | Ad-hoc receive (legacy) |

## UI Web

| Route | Fungsi |
|-------|--------|
| `/dashboard/purchase-orders` | List PO + kelola supplier |
| `/dashboard/purchase-orders/new` | Buat order distributor |
| `/dashboard/purchase-orders/[id]` | Detail, kirim, cetak, terima |
| `/dashboard/purchase-orders/[id]/receive` | Checklist penerimaan |
| `/dashboard/purchase-orders/[id]/print` | Halaman cetak PO |

## Audit Trail

- `stock_movements.type = PURCHASE` (penerimaan)
- `stock_movements.type = PURCHASE_RETURN` (retur ke distributor)
- `reference_type = purchase_order`, `reference_id = PO id` (receive)
- `reference_type = purchase_order_return`, `reference_id = return id` (retur)
- `purchase_order_receipts` + `purchase_order_receipt_lines` untuk histori partial receive
- `purchase_order_returns` + `purchase_order_return_lines` untuk histori retur

## Retur Barang (Retur ke Distributor)

> **Scenario 1:** Barang sudah diterima, dikembalikan ke distributor (rusak, salah kirim, kelebihan).

```
Terima Barang (receive) → Retur Barang → Cetak Dokumen Retur → Stok −qty (base unit)
```

| Langkah | Aksi | Efek |
|---------|------|------|
| 1 | Buka PO dengan status PARTIALLY_RECEIVED / RECEIVED | Tombol **Retur Barang** muncul jika ada qty returnable |
| 2 | Pilih baris, qty retur, alasan (rusak/salah kirim/kelebihan/lainnya) | Preview dampak stok base |
| 3 | Konfirmasi retur | `PurchaseOrderReturn` + lines; stok berkurang; `returnedQuantity` naik |
| 4 | Cetak retur | Kirim ke distributor sebagai bukti retur |

**Validasi bisnis:**
- Qty retur ≤ `receivedQuantity − returnedQuantity` per baris
- Stok outlet harus cukup (tidak bisa retur jika stok fisik kurang)
- Multi-unit: retur dalam satuan order (dus/roll), stok dikurangi dalam satuan base

**Keputusan HPP (SMB retail):** `Product.costPrice` **tidak di-reverse** saat retur — HPP tetap harga beli terakhir saat penerimaan. Retur hanya mengurangi stok fisik dan mencatat nilai retur untuk distributor.

## Retur / Batalkan Sisa Order

> **Scenario 2:** Barang di order belum datang — batalkan sisa qty yang belum diterima.

| Status PO | Aksi | Efek |
|-----------|------|------|
| ORDERED (belum terima) | **Batalkan** (full) atau **Batalkan Sisa Order** | Order dibatalkan / ordered qty diset = received |
| PARTIALLY_RECEIVED | **Batalkan Sisa Order** | Sisa qty order dikurangi ke qty diterima; status → RECEIVED jika lunas |

```
Order 10 sak → Terima 4 sak → Batalkan Sisa Order → ordered qty = 4, sisa 6 batal
```

## API Endpoints Retur (OWNER/MANAGER)

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/v1/purchase-orders/:id/returns` | List retur per PO |
| POST | `/api/v1/purchase-orders/:id/returns` | Buat retur barang diterima |
| GET | `/api/v1/purchase-order-returns/:id` | Detail + data cetak retur |
| POST | `/api/v1/purchase-orders/:id/cancel-remaining` | Batalkan sisa order belum datang |

## UI Web (Retur)

| Route | Fungsi |
|-------|--------|
| `/dashboard/purchase-orders/[id]/return` | Form retur barang |
| `/dashboard/purchase-orders/[id]/returns/[returnId]/print` | Cetak dokumen retur |

## Scenario UAT Retur

1. Lanjutkan UAT PO: terima 10 sak semen
2. Buka detail PO → **Retur Barang** → retur 2 sak, alasan Rusak
3. Verifikasi: stok semen −2 sak (base), kolom Retur = 2, riwayat retur muncul
4. Coba retur 11 sak → ditolak (melebihi returnable)
5. Order 10, terima 4 → **Batalkan Sisa Order** → sisa 6 batal, status RECEIVED

## Scenario UAT (Senin → Rabu)

1. Login manager, pilih cabang MAIN
2. **Senin:** Buat Order Distributor ke PT Semen Nusantara — 10 sak semen @ Rp 68.000
3. Simpan & Kirim → status ORDERED, catat `orderedAt`
4. **Cetak Order** → kirim PDF/cetak ke distributor
5. **Rabu:** Buka detail PO → **Terima Barang** — terima 10 sak, konfirmasi
6. Verifikasi: stok semen +10 sak (base unit), HPP produk terupdate, status RECEIVED

## Related

- Multi-unit: [PRODUCT-UNIT-VARIANT-MODEL.md](./PRODUCT-UNIT-VARIANT-MODEL.md)
- Pricing helpers: `packages/shared/src/utils/product-pricing.ts`
