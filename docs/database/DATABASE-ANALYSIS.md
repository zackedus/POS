> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Database | Audience: Fajar, Eko

# Analisis Database — Barokah Core POS

> **Versi:** 1.0 MVP | **Tanggal:** Juni 2026  
> **Database:** PostgreSQL 16 | **ORM:** Prisma 6  
> **Penyusun:** Tim Database / @senior-dev

---

## 1. Ringkasan Eksekutif

Barokah Core POS adalah sistem Point of Sale multi-tenant untuk UMKM dan retail kecil-menengah. Database dirancang dengan prinsip **isolasi tenant**, **immutability transaksi penjualan**, dan **jejak audit lengkap** untuk operasi kasir sehari-hari.

Desain ini mencakup **22 tabel** dalam **7 domain bisnis**: tenant, auth, katalog, inventory, transaksi, shift, dan pembayaran — plus entitas pendukung MVP (supplier, promo minimal, hold bill, audit log).

**Keputusan arsitektural utama:**

| Keputusan | Alasan |
|-----------|--------|
| `tenant_id` di semua master data | Isolasi multi-tenant; composite unique key mencegah collision antar bisnis |
| Stok per outlet (`inventory_items`) | Multi-outlet Phase 2 ready; stok tidak global |
| Snapshot harga/nama di line item | Transaksi immutable; perubahan master produk tidak mengubah histori |
| `stock_movements` sebagai ledger | Audit trail stok terpisah dari snapshot; mendukung opname & transfer |
| `transaction_adjustments` terpisah | Void/refund tidak mengubah header transaksi asli (compliance & audit) |
| `held_transactions` dengan TTL | Hold bill MVP dengan auto-expire 30 menit |
| `audit_logs` append-only | Memenuhi NFR audit void/refund dan perubahan sensitif |

---

## 2. Analisis Entitas per Domain

### 2.1 Domain Tenant

| Entitas | Fungsi | Kardinalitas |
|---------|--------|--------------|
| `tenants` | Organisasi/bisnis (1 akun SaaS) | 1 tenant → N outlet, N user, N produk |
| `outlets` | Cabang toko | N outlet per tenant; kode unik per tenant |

**Aturan bisnis:**
- Slug tenant unik global (subdomain/identifikasi).
- Kode outlet unik per tenant (`tenant_id + code`).
- Soft-delete via `is_active`; hard delete diblokir (`onDelete: Restrict`).

**Volume estimasi SMB:** 1 tenant, 1–5 outlet.

---

### 2.2 Domain Auth & RBAC

| Entitas | Fungsi | Kardinalitas |
|---------|--------|--------------|
| `users` | Akun pengguna | N user per tenant; email unik per tenant |
| `user_outlets` | Akses outlet per user | N:M user ↔ outlet |

**Aturan bisnis:**
- Role enum: `OWNER`, `MANAGER`, `CASHIER`, `INVENTORY`, `ACCOUNTANT`.
- Owner akses semua outlet; kasir/manager dibatasi via `user_outlets`.
- Password disimpan sebagai hash (bcrypt/argon2 di application layer).
- Granular permission matrix ditunda Phase 2; role enum cukup untuk MVP.

**Volume estimasi SMB:** 3–15 user per tenant.

---

### 2.3 Domain Katalog

| Entitas | Fungsi | Kardinalitas |
|---------|--------|--------------|
| `categories` | Hierarki kategori produk | Self-referencing tree; N kategori per tenant |
| `units` | Satuan (pcs, kg, liter) | N unit per tenant |
| `suppliers` | Master supplier | N supplier per tenant |
| `products` | Master produk | N produk per tenant; SKU unik per tenant |

**Aturan bisnis:**
- SKU wajib unik per tenant; barcode opsional tapi di-index untuk scan cepat.
- Harga jual (`price`) dan harga modal (`cost_price`) disimpan di master; di-copy ke line item saat transaksi.
- `tax_inclusive` flag menentukan apakah harga sudah termasuk PPN.
- Kategori hierarkis via `parent_id` (nullable = root category).

**Volume estimasi SMB:** 100–5.000 SKU per tenant.

---

### 2.4 Domain Inventory

| Entitas | Fungsi | Kardinalitas |
|---------|--------|--------------|
| `inventory_items` | Snapshot stok per outlet | 1 record per (outlet, product) |
| `stock_movements` | Ledger pergerakan stok | N movement per produk/outlet |

**Aturan bisnis:**
- `inventory_items.quantity` = stok saat ini; di-update atomically saat sale/adjustment.
- Setiap perubahan stok wajib punya record `stock_movements` dengan `quantity_before/after`.
- Tipe movement: `SALE`, `PURCHASE`, `ADJUSTMENT`, `TRANSFER_IN/OUT`, `VOID_RESTORE`, `OPNAME`.
- Stok negatif: dikontrol di application layer (config per tenant, Phase 2).
- Hold bill **tidak** mengurangi stok (reserve stok ditunda Phase 2).

**Volume estimasi SMB:** 5.000 inventory_items (1 outlet × 5.000 SKU); ~500 movement/hari.

---

### 2.5 Domain Transaksi

| Entitas | Fungsi | Kardinalitas |
|---------|--------|--------------|
| `transactions` | Header penjualan | N transaksi per outlet/shift |
| `transaction_items` | Line item | N item per transaksi |
| `transaction_adjustments` | Void/refund record | 0–N per transaksi |
| `held_transactions` | Bill ditahan | N hold per outlet/kasir |
| `held_transaction_items` | Item hold bill | N item per hold |
| `promo_rules` | Aturan diskon minimal | N rule per tenant |

**Aturan bisnis:**
- Nomor struk (`receipt_no`) unik per outlet.
- `client_request_id` (UUID dari client) untuk idempotency checkout offline mobile.
- Status: `PENDING` → `COMPLETED` | `VOID` | `REFUNDED`.
- Transaksi `COMPLETED` **immutable** — void/refund via `transaction_adjustments` + update status.
- Void wajib approval manager (`approved_by_id`).
- Snapshot `product_name`, `unit_price` di `transaction_items`.
- Hold bill TTL default 30 menit (`expires_at`); cleanup via scheduled job.

**Volume estimasi SMB:** 50–300 transaksi/hari/outlet; ~100.000 transaksi/tahun/outlet.

---

### 2.6 Domain Shift

| Entitas | Fungsi | Kardinalitas |
|---------|--------|--------------|
| `shifts` | Shift kasir | N shift per kasir/outlet |

**Aturan bisnis:**
- Satu shift terbuka per kasir per outlet (enforced di app layer).
- `opening_cash` wajib saat buka; `closing_cash` + `expected_cash` saat tutup.
- `difference = closing_cash - expected_cash` dihitung saat close.
- Transaksi ter-link ke `shift_id` untuk laporan harian.

**Volume estimasi SMB:** 2 shift/hari/kasir × 2 kasir = 4 shift/hari/outlet.

---

### 2.7 Domain Pembayaran

| Entitas | Fungsi | Kardinalitas |
|---------|--------|--------------|
| `payments` | Pembayaran per transaksi | 1–N payment per transaksi (split payment) |

**Aturan bisnis:**
- Split payment: jumlah `payments.amount` harus = `transactions.total` (validated di app).
- Metode MVP: `CASH`, `TRANSFER`, `QRIS`; `E_WALLET`, `CARD` siap struktur.
- `reference` untuk ID transfer/QRIS Midtrans; tidak simpan data kartu (PCI-aware).
- Cascade delete dari transaction hanya untuk cleanup data test; production transaksi tidak di-delete.

---

### 2.8 Domain Audit

| Entitas | Fungsi | Kardinalitas |
|---------|--------|--------------|
| `audit_logs` | Jejak audit sistem | N log per tenant; append-only |

**Aturan bisnis:**
- Log void, refund, perubahan harga, login gagal, dll.
- `metadata` JSON untuk before/after snapshot.
- Tidak pernah di-update atau di-delete.

---

## 3. Pemetaan Aturan Bisnis → Constraint Database

| Aturan Bisnis | Implementasi DB |
|---------------|-----------------|
| SKU unik per bisnis | `UNIQUE(tenant_id, sku)` |
| Email unik per bisnis | `UNIQUE(tenant_id, email)` |
| Kode outlet unik per bisnis | `UNIQUE(tenant_id, code)` |
| Nomor struk unik per outlet | `UNIQUE(outlet_id, receipt_no)` |
| Satu record stok per produk-outlet | `UNIQUE(outlet_id, product_id)` |
| Idempotency checkout mobile | `UNIQUE(client_request_id)` |
| Transaksi immutable | No UPDATE on completed items; adjustment table |
| Void butuh approval | `transaction_adjustments.approved_by_id` NOT NULL enforced di app |
| Split payment | Multiple `payments` rows; sum validated di app |
| Hold bill expire | `held_transactions.expires_at` + index untuk cleanup job |
| Audit trail | `audit_logs` append-only; `stock_movements` immutable |
| Multi-tenant isolation | Composite unique keys + `tenant_id` FK + app middleware |

---

## 4. Normalisasi — Justifikasi 3NF

Database dirancang pada **Third Normal Form (3NF)**:

1. **1NF:** Semua kolom atomic; tidak ada array/repeating groups (kecuali `metadata` JSON di audit log yang sengaja denormalized untuk fleksibilitas).
2. **2NF:** Semua non-key attributes fully dependent on primary key. Line item snapshot (`product_name`, `unit_price`) sengaja denormalized untuk immutability histori — trade-off documented, bukan pelanggaran fungsional.
3. **3NF:** Tidak ada transitive dependency. Contoh: `tenant_id` tidak disimpan di `transactions` (diakses via `outlet.tenant_id`) kecuali jika diperlukan untuk query performance — saat ini via join outlet.

**Denormalisasi terkontrol (sengaja):**

| Kolom | Alasan |
|-------|--------|
| `transaction_items.product_name` | Snapshot histori; produk bisa di-rename |
| `transaction_items.unit_price` | Snapshot harga saat jual |
| `inventory_items.quantity` | Performance read; di-sync dari movements |
| `audit_logs.metadata` | Fleksibilitas struktur audit tanpa schema migration |

---

## 5. Strategi Index

### Index Existing & Planned

| Tabel | Index | Query Pattern |
|-------|-------|---------------|
| `products` | `(tenant_id, sku)` UNIQUE | Lookup SKU |
| `products` | `(tenant_id, barcode)` | Scan barcode |
| `products` | `(tenant_id, category_id)` | Filter katalog |
| `transactions` | `(outlet_id, created_at)` | Laporan harian |
| `transactions` | `(outlet_id, status)` | Filter void/refund |
| `transactions` | `(cashier_id, created_at)` | Performa kasir |
| `stock_movements` | `(outlet_id, product_id, created_at)` | Histori stok |
| `audit_logs` | `(tenant_id, created_at)` | Audit report |
| `held_transactions` | `(outlet_id, expires_at)` | Cleanup expired holds |
| `shifts` | `(outlet_id, opened_at)` | Laporan shift |

### Rekomendasi Phase 2

- Partial index: `transactions WHERE status = 'COMPLETED'` untuk reporting.
- BRIN index pada `created_at` jika volume > 10 juta rows.
- GIN index pada `audit_logs.metadata` jika full-text search diperlukan.

---

## 6. Skalabilitas — Multi-Tenant & Multi-Outlet

### Isolasi Tenant

```
Application Layer: JWT → tenant_id → Prisma middleware filter
Database Layer:    Composite unique keys, FK constraints
Future Option:     PostgreSQL Row Level Security (RLS) per tenant_id
```

### Multi-Outlet (Phase 2)

- Stok sudah per-outlet via `inventory_items`.
- `user_outlets` sudah siap untuk restrict akses kasir.
- Transfer stok antar outlet via `stock_movements` type `TRANSFER_IN/OUT`.
- Real-time sync via Socket.io + event bus (di luar scope DB).

### Partitioning (Enterprise / Phase 3)

| Tabel | Strategi | Trigger |
|-------|----------|---------|
| `transactions` | Range partition by `created_at` (monthly) | > 5 juta rows/tenant |
| `stock_movements` | Range partition by `created_at` | > 10 juta rows |
| `audit_logs` | Range partition by `created_at` | Retention policy > 2 tahun |

### Connection & Read Replica

- Write: primary PostgreSQL.
- Read-heavy reports: read replica (Phase 2).
- Redis cache: product catalog, active promo rules (TTL 5 menit).

---

## 7. Estimasi Volume Data — SMB POS

Asumsi: **1 tenant, 2 outlet, 3 kasir, 2.000 SKU, 150 transaksi/hari/outlet**

| Tabel | Estimasi Tahun 1 | Growth/Tahun |
|-------|------------------|--------------|
| `tenants` | 1 | — |
| `outlets` | 2 | +0–2 |
| `users` | 8 | +2 |
| `products` | 2.000 | +500 |
| `inventory_items` | 4.000 | +1.000 |
| `transactions` | ~110.000 | +110.000 |
| `transaction_items` | ~330.000 (avg 3 items) | +330.000 |
| `payments` | ~130.000 (split ~15%) | +130.000 |
| `stock_movements` | ~120.000 | +120.000 |
| `shifts` | ~2.200 | +2.200 |
| `audit_logs` | ~50.000 | +50.000 |
| `held_transactions` | ~5.000 (transient) | stable |

**Total storage estimasi Tahun 1:** ~500 MB – 1 GB (termasuk index).

PostgreSQL 16 dengan konfigurasi default (shared_buffers 256MB, SSD) lebih dari cukup untuk profil ini dengan response checkout < 200ms.

---

## 8. Jalur ke Phase 2

| Kebutuhan Phase 2 | Persiapan di Schema MVP |
|-------------------|-------------------------|
| Multi-outlet sync | `inventory_items`, `stock_movements` per outlet |
| Customer & loyalty | Tambah `customers`, `loyalty_points` (new tables) |
| Promo engine advanced | Extend `promo_rules` atau tabel `promo_conditions` |
| Offline mobile sync | `client_request_id`, status `PENDING` |
| Granular RBAC | Tabel `permissions`, `role_permissions` |
| Accounting integration | Export dari `transactions` + `stock_movements` |

---

## 9. Referensi

- Prisma schema: `packages/database/prisma/schema.prisma`
- Relational design: `docs/database/RELATIONAL-DESIGN.md`
- Data dictionary: `docs/database/DATA-DICTIONARY.md`
- MVP requirements: `docs/requirements/MVP-CHECKLIST.md`
