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
| H1 | Buka `/store/barokah-bangunan` | Home storefront: hero, picker cabang, CTA katalog |
| H1b | Buka `/store/barokah-bangunan/products` | Grid katalog + filter kategori + sort |
| H2 | Pilih cabang + produk → keranjang | Item masuk cart |
| H3 | Checkout: isi nama + HP wajib | Form validasi HP |
| H4 | Mock pay / bayar online | Order status PAID |
| H5 | Kasir → tab **Order Web** `/pos/online-orders` | Order muncul di antrian (channel WEB) |
| H6 | Fulfill → COMPLETED | Stok **tidak** double-deduct |
| H7 | Kasir → tab **Marketplace** → catat order manual Tokopedia/Shopee | Order masuk antrian marketplace; stok terpotong saat simpan |

### Skenario H-MP — Marketplace Scaffold (5 menit)

| # | Langkah | Expected |
|---|---------|----------|
| MP1 | `/pos/marketplace-orders` → **+ Catat Order** | Form entri manual tampil |
| MP2 | Isi ref marketplace + item + alamat → Simpan | Status PAID; badge tab Marketplace naik |
| MP3 | Konfirmasi → Disiapkan → Selesai | Fulfillment sama order web; label channel di antrian pengiriman |

### Skenario H-DLV — Pengiriman POS ke Proyek (10 menit)

| # | Langkah | Expected |
|---|---------|----------|
| HD1 | Dashboard → **Member & Pelanggan** → buat/edit pelanggan + alamat **Proyek** | Alamat tersimpan di CRM |
| HD2 | Kasir → pilih pelanggan → centang **Antar ke alamat** → pilih alamat proyek | Alamat tampil di panel keranjang |
| HD3 | Checkout tunai sukses | Pesan *"Masuk antrian pengiriman DLV-…"* |
| HD4 | Manager → `/dashboard/deliveries` | Order status **Menunggu** tampil |
| HD5 | Advance status → **Disiapkan** → **Dikirim** → **Selesai** | Transisi sukses; badge sidebar berkurang |
| HD6 | Coba batalkan order aktif tanpa alasan | Error: alasan wajib |

### Skenario I — Edge Cases (opsional, 5 menit)

| # | Langkah | Expected |
|---|---------|----------|
| I1 | Keranjang qty `-1` atau `0` (via API/manual) | Ditolak — qty invalid |
| I2 | Coba tambah produk induk varian ke cart | Ditolak — pilih varian anak |
| I3 | Spam refresh storefront (>10 req/detik) | HTTP 429 + pesan rate limit ID |

### Skenario J — UAT Multi Cabang (15–20 menit)

> **Referensi audit:** [OUTLET-DATA-INTEGRITY-AUDIT-2026-06](../domain/OUTLET-DATA-INTEGRITY-AUDIT-2026-06.md) — isolasi `outletId` per modul (perbaikan commit `8a80454`: picker POS, guard PO, shift scoped, checkout upsert). **RBAC outlet:** commit `1319af0` — Owner & Manager akses semua cabang tenant (`canAccessAnyTenantOutlet`); Kasir tetap terbatas cabang assign.

#### Prasyarat

| # | Prasyarat | Cara verifikasi |
|---|-----------|-----------------|
| P1 | Minimal **2 cabang aktif** (seed: **Cabang Utama** ★, **Cabang Utara**) | Owner → [`/dashboard/outlets`](http://localhost:3001/dashboard/outlets) — kedua cabang status aktif |
| P2 | **Stok berbeda** per cabang pada ≥1 produk uji (mis. Semen) | Inventori → adjust qty Cabang Utama vs Cabang Utara (contoh: 100 vs 85) |
| P3 | **User assign per cabang** — owner & manager akses **semua cabang tenant**; kasir **single-outlet** (cabang assign saja) | [`/dashboard/users`](http://localhost:3001/dashboard/users) — seed: manager & kasir → Cabang Utama (default picker); owner → kedua cabang. Manager/owner tetap bisa operasi PO/inventori cabang lain meski assign terbatas. |
| P4 | API + web dev jalan | `http://localhost:3000` (API), `http://localhost:3001` (web) |

#### Langkah UAT (step-by-step)

| # | Langkah | Expected |
|---|---------|----------|
| **J1** | Login owner → `/dashboard/outlets` | Daftar cabang tampil: **Cabang Utama** (★ cabang utama), **Cabang Utara**, kode & status aktif |
| **J2** | Owner → `/pos` → picker **Cabang Utama** → catat stok grid produk uji (mis. Semen) → ganti picker ke **Cabang Utara** | Grid refresh; qty stok **berbeda** sesuai P2 (bukan salinan cabang sebelumnya) |
| **J3** | Pilih **Cabang Utara** → `/shift` (tab Shift Aktif → Buka Shift) saldo `500000` → checkout 1× produk uji (tunai) | Shift aktif di Cabang Utara; stok produk uji **Cabang Utara −1**; stok **Cabang Utama tidak berubah** |
| **J4** | Tanpa tutup shift Cabang Utara → di POS ganti picker ke **Cabang Utama** | Banner peringatan: *"Shift aktif di cabang lain…"*; checkout **diblokir** sampai buka shift di cabang terpilih atau tutup shift lama |
| **J5** | Login **kasir** (`kasir@barokah.local`) → coba akses PO **Cabang Utara** (owner/manager buat draft dulu) via API atau URL detail PO | HTTP **403 Forbidden** / pesan akses ditolak — kasir hanya scope **Cabang Utama** (cabang assign) |
| **J5b** | Login **manager** atau **owner** → buat/lihat PO **Cabang Utara** → buka detail PO tersebut | **PASS** — manager & owner boleh akses PO cabang mana pun dalam tenant |
| **J6** | Manager → `/dashboard/purchase-orders` → buat PO **Cabang Utama** → Submit → **Terima** partial (mis. 10 unit) → cek `/dashboard/inventory` filter Cabang Utama | Stok Cabang Utama naik +10; stok Cabang Utara **tidak** ikut naik |
| **J7** | Manager → `/dashboard/inventory` → tab **Transfer** → transfer 3 unit produk uji **Cabang Utama → Cabang Utara** | Cabang Utama −3, Cabang Utara +3; riwayat transfer tercatat |
| **J8** | Owner → `/dashboard` → picker/filter cabang **Cabang Utara** → bandingkan ringkasan penjualan/stok dengan **Cabang Utama** | Angka dashboard & laporan harian mengikuti cabang terpilih (bukan agregat semua cabang tanpa filter) |
| **J9** | Login **kasir** (`kasir@barokah.local`) → `/pos` | Picker cabang hanya menampilkan **Cabang Utama** (cabang assign); tidak ada opsi Cabang Utara |
| **J10** | Storefront `/store/barokah-bangunan` → pilih **Cabang Utara** → order 1 produk → bayar mock → kasir `/pos/online-orders` → fulfill | Order terikat `outletId` Cabang Utara; stok berkurang di **Cabang Utara** saat COMPLETED; tidak double-deduct |

#### Checklist centang — Skenario J

- [ ] **J1** — Daftar cabang & cabang utama (★) terverifikasi
- [ ] **J2** — POS: stok grid berbeda per cabang
- [ ] **J3** — Shift + checkout kurangi stok cabang aktif saja
- [ ] **J4** — Switch cabang → peringatan shift mismatch + checkout diblokir
- [ ] **J5** — Kasir single-outlet → PO cabang lain ditolak (403)
- [ ] **J5b** — Manager/owner → PO cabang lain diizinkan (PASS)
- [ ] **J6** — PO terima → stok naik di cabang PO saja
- [ ] **J7** — Transfer antar cabang atomic & saldo benar
- [ ] **J8** — Dashboard/laporan filter per cabang konsisten
- [ ] **J9** — Kasir hanya lihat cabang yang di-assign
- [ ] **J10** — Online order fulfill dari cabang terkait (jika Fase 2 aktif)

#### Go / No-Go — Multi Cabang (Citra → Budi)

| Kriteria multi-outlet | Wajib pilot |
|-----------------------|-------------|
| Isolasi stok checkout per `outletId` (J2–J3) | Ya |
| Shift scoped + warning mismatch (J4) | Ya |
| Guard PO cross-outlet kasir (J5) + manager/owner tenant-wide (J5b) | Ya |
| Transfer antar cabang (J7) | Ya (jika ≥2 cabang operasional) |
| Laporan filter cabang (J8) | Ya |
| RBAC kasir single-outlet (J9) | Ya |
| Online fulfill per cabang (J10) | Tidak (hanya jika storefront aktif) |

**Keputusan multi-outlet:** ☐ GO ☐ NO-GO — tanggal: ___________

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
- [ ] **Cabang/outlet** — [`/dashboard/outlets`](http://localhost:3001/dashboard/outlets): CRUD cabang, cabang utama (★), telepon & jam operasional, nonaktifkan (bukan hapus) jika ada transaksi
- [ ] Assign kasir ke cabang via [`/dashboard/users`](http://localhost:3001/dashboard/users) (manager/owner akses tenant-wide; assign opsional untuk default picker)
- [ ] Transfer stok antar cabang di Inventori → tab Transfer (jika multi-outlet)

## 3. Pengaturan Tenant (Owner)

> **Halaman:** [`/dashboard/settings`](http://localhost:3001/dashboard/settings) — hub pengaturan aplikasi (tab: Toko, Kasir, Loyalty, Promo, Pembayaran, Online, Outlet, **Integrasi**).  
> **Profil toko:** [`/dashboard/store`](http://localhost:3001/dashboard/store) — **hub tunggal** semua pengaturan storefront (identitas, tampilan, katalog, cabang, checkout, pembayaran, SEO, operasional).

- [ ] Dashboard → **Pengaturan Aplikasi** (`/dashboard/settings`): PPN aktif/nonaktif sesuai kebutuhan PKP
- [ ] **Profil Toko** (`/dashboard/store`): 8 tab — identitas, tampilan web, katalog online, cabang & pengiriman, checkout, pembayaran, SEO, operasional
- [ ] Preview storefront dari Profil Toko → `/store/{slug}` (home) dan `/store/{slug}/products` (katalog)
- [ ] Tab **Outlet** di settings → link **Kelola cabang** ke `/dashboard/outlets`
- [ ] Tab **Loyalty**: earn 1 poin / Rp 10.000 (default OK)
- [ ] Tab **Loyalty**: redeem 1 poin = Rp 1.000, maks 50% total (default OK)
- [ ] Tab **Pembayaran** → Midtrans: sandbox key untuk uji online; live key **defer** sampai ready

## 4. Akun & RBAC

- [ ] Owner: Pak Zaki
- [ ] Manager: 1 akun (void approval, tutup shift paksa)
- [ ] Kasir: minimal 2 akun shift bergantian
- [ ] Uji login/logout + outlet scope (kasir = cabang assign; manager/owner = semua cabang tenant)
- [ ] **Pusat Admin** (`/dashboard/admin`) — Owner/Manager only; Kasir redirect `/pos`
- [ ] **Pengguna & Peran** (`/dashboard/users`, tab Peran & Izin) — Owner buat semua role via wizard `/dashboard/users/new` (3 langkah: identitas → peran/cabang → review); Manager buat kasir saja; matriks RBAC di tab roles; staff ≠ member CRM
- [ ] **Member & Pelanggan** (`/dashboard/customers`) — list poin/piutang/deposit; detail tab profil/alamat/poin/piutang/deposit/kartu member
- [ ] **Kartu member** — preview digital + cetak dari tab Kartu Member; scan QR di POS kasir
- [ ] **Integrasi & API** (`/dashboard/settings?tab=integrasi`) — webhook Midtrans URL, tes koneksi sandbox
- [ ] **Member storefront** (`/store/barokah-bangunan/register`) — publik; bukan self-register admin staff

## 5. Shift & Kasir Harian

- [ ] Baca [KASIR-QUICK-START](./KASIR-QUICK-START.md)
- [ ] UAT Skenario B–F di atas
- [ ] **Pengiriman toko langsung (POS):** pelanggan + alamat CRM → mode **Kirim ke alamat** → checkout → antrian `DLV-…` otomatis
- [ ] **Antrian kasir (baca saja):** `/pos/deliveries` — badge tab Pengiriman, filter hari ini WIB
- [ ] **Dashboard pengiriman:** `/dashboard/deliveries` — summary cards, filter tipe/channel/status/tanggal, ubah status + modal konfirmasi
- [ ] **Order web/marketplace:** fulfillment POS → delivery `ONLINE_ORDER` sinkron; batal order → delivery `BATAL`
- [ ] **Cetak label:** toko langsung + order online dari dashboard detail
- [ ] **Link transaksi/order:** detail membuka struk (`/dashboard/transactions?id=…`) dan order (`/dashboard/online-orders?id=…`)
- [ ] **Offline kasir:** pengiriman tidak tersedia saat POS offline (defer — buat manual setelah sync)
- [ ] Rekonsiliasi kas di **Shift & Kas** (`/shift`): `expectedCash = opening + cashSales + arCashCollections − cashExpenses`
- [ ] Thermal printer: PDF fallback OK; WebUSB **stub** — defer hardware prod

## 6. Payment

> **Referensi integrasi AR/AP:** [FINANCE-AR-AP-INTEGRATION](../domain/FINANCE-AR-AP-INTEGRATION.md) — Finance Hub `/dashboard/finance`, cross-link piutang↔pelanggan & utang↔PO, sidebar Keuangan.

- [ ] Tunai, transfer manual, split cash+transfer: PASS
- [ ] **Piutang (tempo):** checkout CREDIT dengan pelanggan + limit kredit — piutang tercatat di `/dashboard/finance?tab=piutang`
- [ ] **Deposit:** top-up di `/dashboard/finance?tab=deposit` → checkout DEPOSIT di kasir — saldo berkurang, ledger APPLY
- [ ] Pelunasan piutang partial → full di dashboard — status OPEN → PARTIAL → PAID
- [ ] **Pembayaran piutang multi-metode:** tunai / transfer (no ref TF + bank) / deposit / QRIS
- [ ] **Bukti pembayaran:** nomor bukti otomatis (`BKT-REC-…` / `BKT-PAY-…` / `BKT-DEP-…`); modal **Cetak Bukti** setelah top-up/pelunasan/utang; cetak ulang dari riwayat
- [ ] **Riwayat pembayaran piutang:** dashboard piutang (filter pelanggan) + tab Piutang pelanggan + POS
- [ ] **Export CSV** riwayat pembayaran piutang dari dashboard
- [ ] **POS terima pembayaran piutang:** modal kasir dengan link shift aktif
- [ ] Void transaksi kredit/deposit — piutang VOID, deposit di-refund
- [ ] **Aging piutang:** `/dashboard/finance?tab=aging` — bucket 0–30/31–60/61–90/90+ hari, ekspor CSV
- [ ] **Statement pelanggan:** cetak dari `/dashboard/receivables/statement/:id` — saldo awal/akhir + deposit
- [ ] **Dashboard finance widgets:** piutang, utang, net position, deposit, kas hari ini di `/dashboard`
- [ ] **Finance Hub terpadu:** `/dashboard/finance` — tab Ringkasan | Piutang | Utang | Aging | Deposit | Pengeluaran + banner overdue AR & AP
- [ ] **Sidebar Keuangan:** satu entry **Keuangan** (hub tab); URL lama redirect otomatis
- [ ] **Overdue banner:** piutang jatuh tempo tampil di dashboard + badge header manager + daftar piutang
- [ ] **Overdue utang:** banner di finance hub + filter `?status=OVERDUE` di `/dashboard/finance?tab=utang`
- [ ] **Cross-link AR:** piutang → profil pelanggan, statement, transaksi kasir
- [ ] **Cross-link AP:** utang → PO detail, supplier; PO detail → section utang + tombol catat utang
- [ ] **Laporan Keuangan:** `/dashboard/reports/finance` — Laba Rugi, Piutang, Utang, Arus Kas, Ringkasan Harian; periode harian/mingguan/bulanan/tahunan + custom; **tabel rincian** (metode bayar, HPP kategori, aging per pelanggan, daftar utang, arus kas detail, top produk/shift/pengeluaran harian); **Cetak/PDF** termasuk breakdown
- [ ] **Auto utang PO:** penerimaan barang otomatis buat payable; fallback manual dari PO detail
- [ ] **Payment mix:** komposisi pembayaran harian include Tempo (CREDIT) dan Deposit
- [ ] **POS credit UX:** limit kredit, piutang, deposit tampil jelas; tempo diblokir jika over limit
- [ ] **Default limit 1 jt:** pelanggan baru otomatis limit Rp 1.000.000 (dashboard create + POS find-or-create)
- [ ] **Picker pelanggan POS:** tombol "Pilih dari Daftar" — search nama/HP/kode member
- [ ] **Over-limit approval:** tempo melebihi limit → Minta Persetujuan Manager → checkout sukses + audit log
- [ ] **Auto limit increase:** setelah piutang lunas kumulatif ≥ Rp 10 jt (zero overdue) limit naik +Rp 500 rb
- [ ] **Jatuh tempo tempo:** checkout CREDIT menyimpan `dueDate` (default tenant 7/14/30 hari; override kasir)
- [ ] **Rekonsiliasi shift:** tutup shift — kas diharapkan termasuk pelunasan piutang tunai & kurangi pengeluaran kas
- [ ] **Refund transaksi kredit:** piutang terkait dikurangi atau VOID sesuai nominal refund
- [ ] **Loyalty tempo:** poin dihitung saat checkout selesai (bukan saat pelunasan) — lihat [PIUTANG-BUSINESS-FLOW-E2E](../domain/PIUTANG-BUSINESS-FLOW-E2E.md)
- [ ] **Riwayat limit:** tab "Riwayat Limit & Persetujuan" di detail pelanggan dashboard
- [ ] **Filter outlet:** piutang & utang (via PO) filter per cabang
- [ ] QRIS mock/sandbox: PASS di staging (perbaikan commit `750d4f5`: mock checkout tidak stuck polling — regresi TC005/QRIS UAT)
- [ ] QRIS live + EDC + E-wallet: **defer** (butuh key Pak Zaki + hardware Arif)

## 7. Inventory & PO

- [ ] UAT Skenario G di atas
- [ ] **Utang supplier:** PO diterima → utang auto-create + kelola di `/dashboard/finance?tab=utang` → catat bayar supplier
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
- [ ] Skenario **J — UAT Multi Cabang** dijalankan manual (jika ≥2 cabang aktif)

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
