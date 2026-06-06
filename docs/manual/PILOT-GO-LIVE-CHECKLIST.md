# Pilot Go-Live Checklist — Toko Bahan Bangunan Pak Zaki

> 📚 [Indeks Dokumentasi](../INDEX.md) | Owner: **Yoga** · **Fitri** · **Citra** · **Budi**

Checklist langkah demi langkah sebelum operasional harian di toko fisik.

---

## Smoke staging (pre-flight)

Jalankan dari **root monorepo** (`barokah-pos`), **bukan** dari `packages/database`:

```powershell
cd "g:\\baru 2026\\juni\\pos"
npm run smoke:staging
# Dev lokal (API port 3000, tanpa Docker staging):
npm run smoke:dev
```

**Prasyarat:** API staging/dev sudah jalan (`smoke:staging` → port **3010**; `smoke:dev` → auto-detect **3000** lalu **3010**), DB migrate + seed.

| Variabel opsional | Default |
|-------------------|---------|
| `STAGING_API_URL` | `http://localhost:3010/api/v1` |
| `STAGING_SMOKE_EMAIL` | `kasir@barokah.local` |
| `STAGING_SMOKE_PASSWORD` | `Kasir123!` (dev seed) |
| `STAGING_TENANT_SLUG` | `barokah-bangunan` |

Skrip memeriksa: health, storefront outlets, login, `/auth/me`, daftar produk, shift aktif.

---

## Kredensial & URL Dev (seed)

| Role | Email | Password | URL utama |
|------|-------|----------|-----------|
| Owner | `owner@barokah.local` | `Owner123!` | `http://localhost:3001/dashboard` |
| Manager | `manager@barokah.local` | `Manager123!` | `http://localhost:3001/dashboard` |
| Kasir | `kasir@barokah.local` | `Kasir123!` | `http://localhost:3001/pos` |
| Storefront publik | — (guest) | — | `http://localhost:3001/store/barokah-bangunan` |

> Web dev default port **3001**, API **3000**. Sesuaikan jika launcher memakai port fallback.

---

## UAT Interaktif — Skenario Klik di Browser (Citra + Fitri)

Gunakan urutan berikut saat UAT pilot. Centang setiap langkah setelah **hasil aktual = expected**.

### Skenario A — Login & RBAC (5 menit)

| # | Langkah | Expected |
|---|---------|----------|
| A1 | Buka `http://localhost:3001/login` | Form login tampil |
| A2 | Login `kasir@barokah.local` / `Kasir123!` | Redirect ke `/pos` |
| A3 | Buka tab baru → `/dashboard` | Redirect ke POS atau forbidden (kasir tidak akses dashboard owner) |
| A4 | Logout → login `owner@barokah.local` / `Owner123!` | Redirect ke `/dashboard` |
| A5 | Buka `/pos` | Kasir screen tampil (owner boleh akses POS) |

### Skenario B — Shift & Checkout Tunai (10 menit)

| # | Langkah | Expected |
|---|---------|----------|
| B1 | Login kasir → `/pos` | Banner shift: belum aktif |
| B2 | Buka shift, saldo awal `500000` | Shift aktif, indikator hijau |
| B3 | Tap produk **Semen** (atau produk seed) | Item masuk keranjang, subtotal naik |
| B4 | Ubah qty ke `2` | Subtotal = 2 × harga |
| B5 | Mode **Tunai**, bayar ≥ total | Checkout sukses, struk/preview muncul |
| B6 | Accordion **Transaksi Terakhir** | Transaksi baru tampil |

### Skenario C — Hold / Recall (5 menit)

| # | Langkah | Expected |
|---|---------|----------|
| C1 | Tambah item ke keranjang | Keranjang tidak kosong |
| C2 | Klik **Hold** | Pesan sukses hold |
| C3 | Kosongkan keranjang (hapus item) | Keranjang kosong |
| C4 | Accordion **Daftar Hold** → **Recall** | Item kembali ke keranjang |
| C5 | Checkout tunai | Transaksi selesai |

### Skenario D — Promo + Poin + PPN (10 menit)

| # | Langkah | Expected |
|---|---------|----------|
| D1 | Owner → `/dashboard/settings` → aktifkan **PPN 11%** | Setting tersimpan |
| D2 | Kasir → keranjang 1 produk ≥ Rp 100.000 | Subtotal tampil |
| D3 | Isi pelanggan: nama + HP `081234567890` | Estimasi poin muncul (jika eligible) |
| D4 | Pilih promo aktif (dropdown) | Diskon promo terpotong di breakdown |
| D5 | Isi tukar poin (jika saldo ada) | Diskon poin **tambahan** (bukan stack 2 promo) |
| D6 | Periksa breakdown: Subtotal → Diskon → PPN → **Total** | Angka konsisten dengan `computePosTax` |
| D7 | Checkout tunai | Total checkout = total di panel |

### Skenario E — Split Payment (5 menit)

| # | Langkah | Expected |
|---|---------|----------|
| E1 | Keranjang ≥ 1 item, mode **Split** | Form cash + transfer |
| E2 | Isi cash `60000` + transfer `51000` untuk total `111000` (contoh PPN) | Tombol checkout aktif |
| E3 | Ubah transfer jadi `50999` | Error: total split ≠ total transaksi |
| E4 | Perbaiki nominal → checkout | Transaksi sukses |

### Skenario F — Void (Manager) (5 menit)

| # | Langkah | Expected |
|---|---------|----------|
| F1 | Login manager → `/pos` | POS tampil |
| F2 | Void transaksi terakhir dari accordion | Prompt approval |
| F3 | Konfirmasi void | Status void, stok produk naik kembali |

### Skenario G — Inventory & PO (10 menit)

| # | Langkah | Expected |
|---|---------|----------|
| G1 | Manager → `/dashboard/inventory` | Daftar stok per outlet |
| G2 | `/dashboard/purchase-orders` → buat PO draft | PO tersimpan DRAFT |
| G3 | Submit → terima partial | HPP weighted average terupdate |
| G4 | Retur qty ≤ qty diterima | Retur sukses, stok turun |
| G5 | Coba retur qty > sisa returnable | Error Bahasa Indonesia |

### Skenario H — Storefront Online (10 menit)

| # | Langkah | Expected |
|---|---------|----------|
| H1 | Buka `/store/barokah-bangunan` | Katalog produk tampil |
| H2 | Pilih cabang + produk → keranjang | Item masuk cart |
| H3 | Checkout: isi nama + HP wajib | Form validasi HP |
| H4 | Mock pay / bayar online | Order status PAID |
| H5 | Kasir → `/pos/online-orders` | Order muncul di antrian |
| H6 | Fulfill → COMPLETED | Stok **tidak** double-deduct |

### Skenario I — Edge Cases (opsional, 5 menit)

| # | Langkah | Expected |
|---|---------|----------|
| I1 | Keranjang qty `-1` atau `0` (via API/manual) | Ditolak — qty invalid |
| I2 | Coba tambah produk induk varian ke cart | Ditolak — pilih varian anak |
| I3 | Spam refresh storefront (>10 req/detik) | HTTP 429 + pesan rate limit ID |

---

## 1. Infrastruktur (Yoga)

- [ ] PostgreSQL 16+ dan Redis 7+ running (Docker Compose staging/prod)
- [ ] Salin `.env.production.example` → `.env`, isi secret kuat (JWT, DB password)
- [ ] `npm run build` sukses di server staging
- [ ] `npm run smoke:staging` dari root repo → semua PASS (lihat bagian Smoke staging di atas)
- [ ] HTTPS aktif (reverse proxy nginx/Caddy)
- [ ] Backup DB otomatis harian dikonfigurasi

## 2. Master Data (Manager)

- [ ] Kategori produk (semen, cat, besi, dll.) lengkap
- [ ] Satuan dasar + multi satuan jual (kg/dus, m/roll) diuji
- [ ] Import CSV produk awal (`GET /products/import/template`)
- [ ] Stok awal per outlet diisi (via import atau adjust)
- [ ] Supplier master untuk PO

## 3. Pengaturan Tenant (Owner)

> **Halaman:** [`/dashboard/settings`](http://localhost:3001/dashboard/settings) — hub pengaturan aplikasi (tab: Toko, Kasir, Loyalty, Promo, Pembayaran, Online, Outlet).

- [ ] Dashboard → **Pengaturan Aplikasi** (`/dashboard/settings`): PPN aktif/nonaktif sesuai kebutuhan PKP
- [ ] Tab **Loyalty**: earn 1 poin / Rp 10.000 (default OK)
- [ ] Tab **Loyalty**: redeem 1 poin = Rp 1.000, maks 50% total (default OK)
- [ ] Tab **Pembayaran** → Midtrans: sandbox key untuk uji online; live key **defer** sampai ready

## 4. Akun & RBAC

- [ ] Owner: Pak Zaki
- [ ] Manager: 1 akun (void approval, tutup shift paksa)
- [ ] Kasir: minimal 2 akun shift bergantian
- [ ] Uji login/logout + outlet scope

## 5. Shift & Kasir Harian

- [ ] Baca [KASIR-QUICK-START](./KASIR-QUICK-START.md)
- [ ] UAT Skenario B–F di atas
- [ ] Rekonsiliasi kas: `expectedCash = opening + cashSales`
- [ ] Thermal printer: PDF fallback OK; WebUSB **stub** — defer hardware prod

## 6. Payment

- [ ] Tunai, transfer manual, split cash+transfer: PASS
- [ ] QRIS mock/sandbox: PASS di staging
- [ ] QRIS live + EDC + E-wallet: **defer** (butuh key Pak Zaki + hardware Arif)

## 7. Inventory & PO

- [ ] UAT Skenario G di atas
- [ ] Transfer stok antar cabang (jika multi-outlet)
- [ ] Opname scan SKU/barcode

## 8. Online (jika aktif Fase 2)

- [ ] UAT Skenario H di atas
- [ ] Order expired TTL 60 menit

## 9. QA Sign-off (Citra)

- [ ] Regresi automated: `npm run test` → 422+ PASS
- [ ] Playwright smoke CI green
- [ ] [BUSINESS-LOGIC-E2E-VERIFICATION](../domain/BUSINESS-LOGIC-E2E-VERIFICATION-2026-06.md) reviewed
- [ ] Skenario UAT A–I di atas dijalankan manual

## 10. Go / No-Go (Budi → Pak Zaki)

| Kriteria | Wajib |
|----------|-------|
| P0 automated tests PASS | Ya |
| Shift + checkout + void PASS manual | Ya |
| Stok tidak double-deduct online | Ya |
| Midtrans live | Tidak (pilot mock/sandbox OK) |
| Thermal prod | Tidak (PDF OK) |
| Fase 3 enterprise | Tidak |

### Defer tersisa (audit Must/Should — bukan blocker pilot)

| Item | Status | Workaround pilot |
|------|--------|------------------|
| E-wallet UI | PARTIAL | Gunakan Tunai/Transfer/QRIS mock |
| Thermal ESC/POS produksi | PARTIAL | Struk PDF/digital |
| QRIS live gateway | PARTIAL | Midtrans sandbox/mock |
| Expo mobile offline parity | PARTIAL | PWA web kasir offline |

**Keputusan pilot:** ☐ GO ☐ NO-GO — tanggal: ___________
