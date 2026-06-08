> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Database | Audience: Fajar, Dewi, Eko

# Data Dictionary — Barokah Core POS

> **Versi:** 1.0 MVP | **Bahasa:** Indonesia  
> **Schema source:** `packages/database/prisma/schema.prisma`

Legenda nullable: **Ya** = boleh NULL, **Tidak** = NOT NULL.

---

## tenants

Organisasi/bisnis yang menggunakan sistem POS ( satu entitas SaaS ).

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key unik tenant |
| name | String | Tidak | Nama bisnis/usaha |
| slug | String | Tidak | Identifier unik global untuk subdomain atau routing |
| contact_phone | String | Ya | Telepon kontak tenant (struk/storefront) |
| logo_url | String | Ya | URL logo tenant (stub upload — Fase 2) |
| is_active | Boolean | Tidak | Status aktif tenant; false = dinonaktifkan (soft delete) |
| created_at | DateTime | Tidak | Waktu pendaftaran tenant |
| updated_at | DateTime | Tidak | Waktu terakhir data tenant diubah |

---

## outlets

Cabang/toko fisik di bawah satu tenant.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key unik outlet |
| tenant_id | UUID | Tidak | FK ke tenants; pemilik bisnis |
| name | String | Tidak | Nama cabang/toko |
| code | String | Tidak | Kode singkat outlet; unik per tenant (contoh: "OUT01") |
| address | String | Ya | Alamat lengkap outlet |
| phone | String | Ya | Nomor telepon cabang |
| operating_hours | String | Ya | Jam operasional (teks bebas, contoh: Sen–Sab 08:00–17:00) |
| is_default | Boolean | Tidak | Cabang utama/default tenant (satu per tenant) |
| is_active | Boolean | Tidak | Status aktif outlet |
| created_at | DateTime | Tidak | Waktu outlet dibuat |
| updated_at | DateTime | Tidak | Waktu terakhir outlet diubah |

---

## users

Akun pengguna sistem dengan role RBAC.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key unik user |
| tenant_id | UUID | Tidak | FK ke tenants; tenant induk user |
| email | String | Tidak | Email login; unik per tenant |
| password_hash | String | Tidak | Hash password (bcrypt/argon2); bukan plain text |
| full_name | String | Tidak | Nama lengkap pengguna |
| role | UserRole | Tidak | Peran: OWNER, MANAGER, CASHIER, INVENTORY, ACCOUNTANT |
| is_active | Boolean | Tidak | Status aktif akun |
| created_at | DateTime | Tidak | Waktu akun dibuat |
| updated_at | DateTime | Tidak | Waktu terakhir akun diubah |

---

## user_outlets

Tabel junction akses user ke outlet tertentu.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| user_id | UUID | Tidak | FK ke users |
| outlet_id | UUID | Tidak | FK ke outlets |

---

## units

Master satuan produk (pcs, kg, liter, dll.).

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| tenant_id | UUID | Tidak | FK ke tenants |
| name | String | Tidak | Nama satuan lengkap (contoh: "Pieces") |
| symbol | String | Tidak | Simbol singkat; unik per tenant (contoh: "pcs") |
| created_at | DateTime | Tidak | Waktu satuan dibuat |

---

## categories

Kategori produk dengan dukungan hierarki (parent-child).

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| tenant_id | UUID | Tidak | FK ke tenants |
| name | String | Tidak | Nama kategori |
| parent_id | UUID | Ya | FK ke categories; null = kategori root |
| sort_order | Int | Tidak | Urutan tampil di UI |
| created_at | DateTime | Tidak | Waktu kategori dibuat |

---

## suppliers

Master data supplier/pemasok produk.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| tenant_id | UUID | Tidak | FK ke tenants |
| name | String | Tidak | Nama supplier |
| phone | String | Ya | Nomor telepon supplier |
| email | String | Ya | Email supplier |
| address | String | Ya | Alamat supplier |
| is_active | Boolean | Tidak | Status aktif supplier |
| created_at | DateTime | Tidak | Waktu supplier dibuat |
| updated_at | DateTime | Tidak | Waktu terakhir supplier diubah |

---

## products

Master data produk/barange jual.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| tenant_id | UUID | Tidak | FK ke tenants |
| category_id | UUID | Ya | FK ke categories |
| unit_id | UUID | Ya | FK ke units; satuan jual |
| supplier_id | UUID | Ya | FK ke suppliers |
| sku | String | Tidak | Stock Keeping Unit; unik per tenant |
| barcode | String | Ya | Kode barcode untuk scan kasir |
| name | String | Tidak | Nama produk |
| price | Decimal(15,2) | Tidak | Harga jual ke customer |
| cost_price | Decimal(15,2) | Tidak | Harga pokok/modal (HPP) |
| tax_inclusive | Boolean | Tidak | True = harga sudah termasuk PPN |
| is_active | Boolean | Tidak | Status aktif produk (nonaktif = tidak tampil di kasir) |
| created_at | DateTime | Tidak | Waktu produk dibuat |
| updated_at | DateTime | Tidak | Waktu terakhir produk diubah |

---

## inventory_items

Snapshot stok produk per outlet (current quantity).

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| outlet_id | UUID | Tidak | FK ke outlets |
| product_id | UUID | Tidak | FK ke products |
| quantity | Decimal(15,3) | Tidak | Jumlah stok saat ini |
| min_stock | Decimal(15,3) | Tidak | Batas minimum stok untuk alert |
| updated_at | DateTime | Tidak | Waktu terakhir stok diupdate |

---

## stock_movements

Ledger immutable pergerakan stok (audit trail inventory).

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| outlet_id | UUID | Tidak | FK ke outlets |
| product_id | UUID | Tidak | FK ke products |
| type | StockMovementType | Tidak | Tipe: SALE, PURCHASE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, VOID_RESTORE, OPNAME |
| quantity | Decimal(15,3) | Tidak | Jumlah perubahan; positif = masuk, negatif = keluar |
| quantity_before | Decimal(15,3) | Tidak | Stok sebelum perubahan |
| quantity_after | Decimal(15,3) | Tidak | Stok setelah perubahan |
| reference_type | String | Ya | Tipe referensi polimorfik (contoh: "transaction") |
| reference_id | UUID | Ya | ID referensi polimorfik |
| notes | String | Ya | Catatan/keterangan movement |
| created_by_id | UUID | Tidak | FK ke users; siapa yang memicu movement |
| created_at | DateTime | Tidak | Waktu movement dicatat (immutable) |

---

## promo_rules

Aturan promosi/diskon minimal untuk MVP.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| tenant_id | UUID | Tidak | FK ke tenants |
| name | String | Tidak | Nama promo (contoh: "Diskon Lebaran 10%") |
| type | PromoType | Tidak | PERCENTAGE atau FIXED_AMOUNT |
| value | Decimal(15,2) | Tidak | Nilai diskon (% 0–100 atau nominal Rp) |
| apply_to | PromoApplyTo | Tidak | Cakupan: ALL, CATEGORY, atau PRODUCT |
| category_id | UUID | Ya | FK ke categories; wajib jika apply_to = CATEGORY |
| product_id | UUID | Ya | FK ke products; wajib jika apply_to = PRODUCT |
| min_purchase | Decimal(15,2) | Ya | Minimum subtotal transaksi untuk promo berlaku |
| is_active | Boolean | Tidak | Status aktif promo |
| starts_at | DateTime | Ya | Waktu mulai promo |
| ends_at | DateTime | Ya | Waktu berakhir promo |
| created_at | DateTime | Tidak | Waktu promo dibuat |
| updated_at | DateTime | Tidak | Waktu terakhir promo diubah |

---

## transactions

Header transaksi penjualan POS.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| outlet_id | UUID | Tidak | FK ke outlets; lokasi transaksi |
| cashier_id | UUID | Tidak | FK ke users; kasir yang melayani |
| shift_id | UUID | Ya | FK ke shifts; shift aktif saat transaksi |
| receipt_no | String | Tidak | Nomor struk; unik per outlet |
| client_request_id | UUID | Ya | UUID dari client untuk idempotency (offline mobile) |
| status | TransactionStatus | Tidak | PENDING, COMPLETED, VOID, REFUNDED |
| subtotal | Decimal(15,2) | Tidak | Total sebelum diskon dan pajak |
| discount | Decimal(15,2) | Tidak | Total diskon transaksi |
| tax | Decimal(15,2) | Tidak | Total PPN/pajak |
| total | Decimal(15,2) | Tidak | Total akhir yang harus dibayar |
| notes | String | Ya | Catatan transaksi |
| created_at | DateTime | Tidak | Waktu transaksi dibuat |
| completed_at | DateTime | Ya | Waktu checkout selesai |

---

## transaction_items

Detail line item per produk dalam transaksi.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| transaction_id | UUID | Tidak | FK ke transactions |
| product_id | UUID | Tidak | FK ke products |
| product_name | String | Tidak | Snapshot nama produk saat transaksi |
| quantity | Decimal(15,3) | Tidak | Jumlah item dibeli |
| unit_price | Decimal(15,2) | Tidak | Snapshot harga satuan saat transaksi |
| discount | Decimal(15,2) | Tidak | Diskon per line item |
| tax | Decimal(15,2) | Tidak | Pajak per line item |
| subtotal | Decimal(15,2) | Tidak | Subtotal line (qty × harga - diskon + tax) |

---

## transaction_adjustments

Record terpisah untuk void dan refund (transaksi asli tetap immutable).

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| transaction_id | UUID | Tidak | FK ke transactions yang di-adjust |
| type | AdjustmentType | Tidak | VOID (batal total) atau REFUND (partial/total) |
| amount | Decimal(15,2) | Tidak | Nominal void/refund |
| reason | String | Tidak | Alasan void/refund (wajib) |
| created_by_id | UUID | Tidak | FK ke users; yang mengajukan |
| approved_by_id | UUID | Ya | FK ke users; manager yang approve (wajib untuk void) |
| created_at | DateTime | Tidak | Waktu adjustment dicatat |

---

## payments

Detail pembayaran per transaksi (mendukung split payment).

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| transaction_id | UUID | Tidak | FK ke transactions |
| method | PaymentMethod | Tidak | CASH, TRANSFER, QRIS, E_WALLET, CARD |
| amount | Decimal(15,2) | Tidak | Nominal pembayaran dengan metode ini |
| reference | String | Ya | Referensi eksternal (no. transfer, QRIS order ID) |
| created_at | DateTime | Tidak | Waktu pembayaran dicatat |

---

## held_transactions

Transaksi ditahan (hold bill) sebelum checkout.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| outlet_id | UUID | Tidak | FK ke outlets |
| cashier_id | UUID | Tidak | FK ke users; kasir yang hold |
| label | String | Ya | Label identifikasi (nama customer/meja) |
| subtotal | Decimal(15,2) | Tidak | Subtotal hold bill |
| discount | Decimal(15,2) | Tidak | Diskon hold bill |
| tax | Decimal(15,2) | Tidak | Pajak hold bill |
| total | Decimal(15,2) | Tidak | Total hold bill |
| expires_at | DateTime | Tidak | Waktu kadaluarsa (default TTL 30 menit) |
| created_at | DateTime | Tidak | Waktu hold dibuat |
| updated_at | DateTime | Tidak | Waktu terakhir hold diubah |

---

## held_transaction_items

Detail item dalam hold bill.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| held_transaction_id | UUID | Tidak | FK ke held_transactions |
| product_id | UUID | Tidak | FK ke products |
| product_name | String | Tidak | Nama produk saat hold |
| quantity | Decimal(15,3) | Tidak | Jumlah item |
| unit_price | Decimal(15,2) | Tidak | Harga satuan saat hold |
| discount | Decimal(15,2) | Tidak | Diskon per item |
| subtotal | Decimal(15,2) | Tidak | Subtotal item |

---

## shifts

Shift kasir untuk rekonsiliasi kas harian.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| outlet_id | UUID | Tidak | FK ke outlets |
| cashier_id | UUID | Tidak | FK ke users; kasir shift |
| opening_cash | Decimal(15,2) | Tidak | Saldo kas awal shift |
| closing_cash | Decimal(15,2) | Ya | Saldo kas fisik saat tutup shift |
| expected_cash | Decimal(15,2) | Ya | Saldo kas menurut sistem |
| difference | Decimal(15,2) | Ya | Selisih = closing_cash - expected_cash |
| opened_at | DateTime | Tidak | Waktu buka shift |
| closed_at | DateTime | Ya | Waktu tutup shift; null = shift masih terbuka |

---

## audit_logs

Log audit append-only untuk aksi sensitif sistem.

| Field | Tipe | Nullable | Deskripsi |
|-------|------|:--------:|-----------|
| id | UUID | Tidak | Primary key |
| tenant_id | UUID | Tidak | FK ke tenants |
| user_id | UUID | Ya | FK ke users; null jika aksi sistem |
| action | String | Tidak | Kode aksi (contoh: TRANSACTION_VOID, PRODUCT_UPDATE) |
| entity_type | String | Tidak | Tipe entitas target (contoh: transaction, product) |
| entity_id | UUID | Ya | ID entitas target |
| metadata | JSON | Ya | Data konteks: before/after, alasan, dll. |
| ip_address | String | Ya | IP address pengguna saat aksi |
| created_at | DateTime | Tidak | Waktu aksi dicatat |

---

## Enumerations

### UserRole

| Value | Deskripsi |
|-------|-----------|
| OWNER | Pemilik bisnis; akses penuh |
| MANAGER | Manager toko; approve void, laporan |
| CASHIER | Kasir; transaksi dan shift |
| INVENTORY | Staff gudang; stok dan movement |
| ACCOUNTANT | Akuntan; laporan keuangan |

### TransactionStatus

| Value | Deskripsi |
|-------|-----------|
| PENDING | Transaksi draft/menunggu (offline sync) |
| COMPLETED | Transaksi selesai dan final |
| VOID | Transaksi dibatalkan total |
| REFUNDED | Transaksi di-refund (partial atau total) |

### PaymentMethod

| Value | Deskripsi |
|-------|-----------|
| CASH | Tunai |
| TRANSFER | Transfer bank manual |
| QRIS | Pembayaran QRIS (Midtrans) |
| E_WALLET | E-wallet (GoPay, OVO, dll.) |
| CARD | Kartu debit/kredit |

### StockMovementType

| Value | Deskripsi |
|-------|-----------|
| SALE | Pengurangan stok karena penjualan |
| PURCHASE | Penambahan stok dari pembelian supplier |
| ADJUSTMENT | Koreksi manual stok |
| TRANSFER_IN | Stok masuk dari outlet lain |
| TRANSFER_OUT | Stok keluar ke outlet lain |
| VOID_RESTORE | Pengembalian stok karena void transaksi |
| OPNAME | Hasil stock opname |

### AdjustmentType

| Value | Deskripsi |
|-------|-----------|
| VOID | Pembatalan transaksi total |
| REFUND | Pengembalian dana (partial atau total) |

### PromoType

| Value | Deskripsi |
|-------|-----------|
| PERCENTAGE | Diskon persentase (value = 0–100) |
| FIXED_AMOUNT | Diskon nominal tetap (Rp) |

### PromoApplyTo

| Value | Deskripsi |
|-------|-----------|
| ALL | Berlaku untuk semua produk |
| CATEGORY | Berlaku untuk kategori tertentu |
| PRODUCT | Berlaku untuk produk tertentu |

---

## Modul Piutang, Utang & Deposit (Fase 2 — Jun 2026)

> Spec lengkap: [`docs/domain/CREDIT-DEPOSIT-MODULE.md`](../domain/CREDIT-DEPOSIT-MODULE.md)

### customers (extended)

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| credit_limit | Decimal(15,2) nullable | Limit kredit tempo; null = unlimited, 0 = tidak boleh tempo |

### receivables

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK | Scope tenant |
| customer_id | UUID FK | Pelanggan berutang |
| outlet_id | UUID FK nullable | Opsional — laporan per cabang |
| transaction_id | UUID FK unique nullable | Transaksi POS kredit |
| amount | Decimal(15,2) | Nominal piutang |
| paid_amount | Decimal(15,2) | Terbayar (derived via payments) |
| status | ReceivableStatus | OPEN, PARTIAL, PAID, VOID |
| due_date | Date nullable | Jatuh tempo |

### receivable_payments

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| receivable_id | UUID FK | |
| amount | Decimal(15,2) | Nominal bayar |
| method | PaymentMethod | CASH, TRANSFER, QRIS, dll. |
| recorded_by_id | UUID FK | User pencatat |

### payables

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| supplier_id | UUID FK | Supplier |
| po_id | UUID FK unique nullable | Satu utang per PO |
| amount / paid_amount / status / due_date | | Mirror receivables pattern |

### customer_deposits

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| customer_id | UUID unique | Satu akun per pelanggan |
| balance | Decimal(15,2) | Saldo cache (sync dengan ledger) |
| status | DepositAccountStatus | ACTIVE, CLOSED |

### deposit_transactions

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| type | DepositTransactionType | TOP_UP, APPLY, REFUND |
| amount | Decimal(15,2) | Nominal mutasi |
| balance_after | Decimal(15,2) | Saldo setelah mutasi |
| reference_type / reference_id | String nullable | e.g. transaction apply |

### PaymentMethod (extended)

| Value | Deskripsi |
|-------|-----------|
| CREDIT | Piutang / jual tempo (POS checkout) |
| DEPOSIT | Apply saldo deposit pelanggan |

### ReceivableStatus / PayableStatus

| Value | Deskripsi |
|-------|-----------|
| OPEN | Belum ada pembayaran |
| PARTIAL | Sebagian terbayar |
| PAID | Lunas |
| VOID | Dibatalkan (void transaksi / manual) |

---

## Referensi

- Analisis database: `docs/database/DATABASE-ANALYSIS.md`
- Relational design: `docs/database/RELATIONAL-DESIGN.md`
- Prisma schema: `packages/database/prisma/schema.prisma`
