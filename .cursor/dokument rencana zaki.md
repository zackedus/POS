# SISTEM POS — SPESIFIKASI FITUR LENGKAP
# Stack: Next.js (Web Dashboard) + Expo (Mobile Kasir) + Supabase (Backend)
# Monorepo: Turborepo + pnpm workspaces

---

## ARSITEKTUR UMUM

```
pos-monorepo/
├── apps/
│   ├── web/          → Next.js App Router (Dashboard owner, manajemen)
│   └── mobile/       → Expo SDK (Aplikasi kasir tablet/HP)
├── packages/
│   ├── ui/           → Komponen shared React + React Native
│   ├── types/        → TypeScript types dan interfaces shared
│   └── utils/        → Kalkulasi harga, validasi, konversi satuan
```

---

## MODUL 1 — MANAJEMEN PRODUK

### 1.1 Produk Induk (Parent Product)
**Fungsi:** Wadah utama sebuah produk sebelum dipecah jadi varian. Produk induk tidak bisa dijual langsung jika `has_variants = true`. Berisi nama, deskripsi, kategori, satuan dasar, dan flag apakah punya varian atau bundle.

**Fields penting:**
- `name` — nama produk
- `category_id` — FK ke tabel kategori
- `has_variants` — boolean, jika true kasir harus pilih varian dulu
- `is_bundle` — boolean, jika true produk ini adalah paket bundling
- `base_unit_id` — satuan terkecil (pcs, gram, ml, dll)
- `is_active` — soft delete, produk tidak aktif tidak muncul di kasir

---

### 1.2 Multi Varian Produk
**Fungsi:** Memungkinkan satu produk memiliki banyak kombinasi atribut (ukuran, warna, rasa, dll). Setiap kombinasi menghasilkan satu SKU unik dengan harga dan stok sendiri.

**Cara kerja:**
1. Admin buat produk induk (misal: "Kaos Polos")
2. Admin tambah atribut: Ukuran (S, M, L, XL) dan Warna (Merah, Biru, Hitam)
3. Sistem generate semua kombinasi → SKU: Kaos-S-Merah, Kaos-M-Biru, dst
4. Admin set harga dan stok awal per SKU
5. Kasir pilih produk → muncul picker atribut → pilih kombinasi → masuk keranjang

**Tables:**
- `product_attributes` — dimensi varian (nama: "Ukuran", "Warna")
- `attribute_values` — nilai tiap dimensi (S, M, L, Merah, Biru)
- `product_skus` — hasil kombinasi, tiap baris = 1 SKU yang bisa dijual

**Rules:**
- SKU yang stoknya 0 otomatis greyed out di picker kasir
- Setiap SKU punya barcode sendiri untuk scan
- Setiap SKU bisa punya gambar berbeda
- Harga antar SKU boleh berbeda (S lebih murah dari XXL)
- HPP per SKU bisa berbeda untuk kalkulasi margin akurat

---

### 1.3 Multi Satuan Jual
**Fungsi:** Satu SKU bisa dijual dalam berbagai satuan dengan konversi otomatis. Stok dikelola dalam satuan terkecil (base unit), harga per satuan besar dihitung berdasarkan faktor konversi.

**Contoh — Air Mineral 600ml:**
```
Base unit : Pcs (botol)   → harga Rp 4.000    → konversi 1
Satuan 2  : Pack (6 pcs)  → harga Rp 22.000   → konversi 6
Satuan 3  : Dus (24 pcs)  → harga Rp 78.000   → konversi 24
Satuan 4  : Krat (48 pcs) → harga Rp 148.000  → konversi 48
```

**Cara kerja:**
- Stok selalu disimpan dalam base unit (pcs)
- Kasir pilih satuan saat transaksi
- Sistem kalkulasi: harga = harga satuan yang dipilih, stok berkurang = qty × faktor konversi
- Harga satuan besar bisa di-set lebih hemat sebagai insentif beli banyak

**Table:** `sku_units`
- `unit_name` — nama satuan (Pcs, Pack, Dus, Krat)
- `conversion_factor` — berapa base unit dalam satuan ini
- `price` — harga jual dalam satuan ini
- `is_base_unit` — flag satuan terkecil

---

### 1.4 Bundling Produk dengan Harga Khusus
**Fungsi:** Gabungkan beberapa produk/SKU menjadi satu paket dengan harga lebih murah dari total harga normal. Bundle tidak punya stok sendiri — stok diambil dari komponen.

**Tipe bundle yang didukung:**
1. **Fixed bundle** — isi paket sudah tetap (Paket Makan Siang = Nasi + Es Teh + Kerupuk)
2. **Flexible bundle** — pelanggan pilih X item dari daftar (Pilih 3 dari 10 topping)
3. **Bundle terjadwal** — aktif hanya di jam/hari tertentu (Happy Hour 14.00–17.00)
4. **Beli X gratis Y** — beli 2 gratis 1, stok item gratis juga berkurang

**Cara kerja:**
- Bundle dibuat sebagai produk dengan `is_bundle = true`
- Komponen bundle didefinisikan di tabel `bundle_items`
- Saat kasir pilih bundle, sistem cek stok SEMUA komponen
- Jika ada satu komponen habis, bundle tidak bisa dipilih
- Saat terjual, stok semua komponen berkurang secara ATOMIK (1 database transaction)
- Struk menampilkan nama bundle + harga paket (bukan detail komponen)
- Laporan bisa breakdown per komponen atau per bundle

**Table:** `bundle_items`
- `bundle_product_id` — FK ke produk bundle
- `component_sku_id` — FK ke SKU komponen
- `quantity` — berapa unit komponen per 1 bundle
- `unit_id` — satuan komponen yang dipakai

**Logic kritis (harus Supabase RPC / DB transaction):**
```sql
-- Fungsi atomik: jual bundle, kurangi stok semua komponen sekaligus
SELECT sell_bundle_atomic(bundle_id, location_id, qty_sold);
```

---

### 1.5 Kategori & Sub-Kategori Produk
**Fungsi:** Pengelompokan produk berjenjang untuk navigasi kasir dan pelaporan. Kasir bisa filter produk berdasarkan kategori saat mencari item.

- Kategori bisa nested (Makanan > Nasi > Nasi Goreng)
- Setiap kategori bisa punya gambar/ikon untuk tampilan grid kasir
- Urutan tampil bisa dikonfigurasi drag-and-drop dari dashboard

---

### 1.6 Pencarian Produk Cerdas (Fuzzy Search)
**Fungsi:** Kasir temukan produk dengan cara apapun — tidak perlu nama persis. Mendukung typo, nama parsial, scan barcode, dan scan QR.

**Mode pencarian:**
- Ketik nama (toleran typo via Fuse.js atau pg_trgm di Supabase)
- Scan barcode fisik (scanner USB/Bluetooth) → resolve ke SKU
- Scan barcode layar HP pelanggan
- Filter per kategori dengan satu tap

**Performa target:** hasil muncul < 300ms setelah input

---

## MODUL 2 — MANAJEMEN STOK

### 2.1 Multi Stok / Multi Gudang (Multi-Location Stock)
**Fungsi:** Setiap SKU bisa punya stok di banyak lokasi independen. Penjualan di lokasi A hanya mengurangi stok lokasi A, tidak memengaruhi stok lokasi lain.

**Tipe lokasi:**
- `store` — toko/kasir, stok bisa dijual langsung
- `warehouse` — gudang, tidak bisa dijual langsung dari POS
- `display` — etalase/showcase
- `transit` — sedang dalam perjalanan antar lokasi

**Table:** `sku_stock`
- `sku_id` + `location_id` → UNIQUE constraint (1 baris per SKU per lokasi)
- `quantity` — stok saat ini
- `min_stock` — batas minimum untuk trigger alert
- `max_stock` — batas maksimum untuk reorder cap

---

### 2.2 Transfer Stok Antar Lokasi
**Fungsi:** Pindahkan stok dari gudang ke toko atau antar cabang dengan pencatatan penuh. Ada status transit agar stok tidak "hilang" saat dalam perjalanan.

**Alur:**
1. Buat dokumen transfer (dari → ke, SKU, jumlah)
2. Status: `pending` → `in_transit` → `received`
3. Stok sumber berkurang saat `in_transit`
4. Stok tujuan bertambah saat `received`
5. Jika ada selisih (kirim 10, terima 9), sistem catat selisih 1 sebagai `stock_discrepancy`

---

### 2.3 Alert Stok Minimum
**Fungsi:** Notifikasi otomatis saat stok SKU di lokasi tertentu menyentuh atau melewati batas minimum. Alert per lokasi, bukan total semua lokasi.

**Channel notifikasi:**
- Push notification ke Expo app (owner/supervisor)
- Email ke owner
- WhatsApp via WhatsApp Business API

---

### 2.4 Stok Opname Digital
**Fungsi:** Petugas lakukan hitungan fisik stok langsung dari HP. Scan barcode produk, input jumlah fisik, sistem kalkulasi selisih vs stok sistem.

**Alur:**
1. Buat sesi opname untuk lokasi tertentu
2. Petugas scan SKU → input jumlah fisik
3. Sistem tampilkan selisih real-time (lebih/kurang)
4. Submit → stok sistem di-adjust sesuai fisik
5. Semua penyesuaian tercatat di audit log

---

### 2.5 Riwayat Mutasi Stok
**Fungsi:** Log lengkap semua pergerakan stok: penjualan, retur, transfer masuk, transfer keluar, penyesuaian opname, dan stok rusak/hilang.

**Table:** `stock_mutations`
- `mutation_type` — sale | purchase | transfer_in | transfer_out | adjustment | return | damaged
- `qty_before`, `qty_after` — stok sebelum dan sesudah
- `reference_id` — ID transaksi/transfer/opname yang memicu
- `user_id`, `created_at` — siapa dan kapan

---

### 2.6 Prediksi Kebutuhan Stok (AI)
**Fungsi:** Analisis pola penjualan historis untuk memprediksi kapan stok akan habis dan berapa yang perlu direstock.

- Prediksi berbasis rata-rata penjualan harian × safety stock
- Alert "stok habis dalam ~X hari" berdasarkan kecepatan penjualan
- Rekomendasi jumlah reorder per SKU per lokasi

---

## MODUL 3 — TRANSAKSI & KASIR

### 3.1 Keranjang Belanja Dinamis
**Fungsi:** Area utama kasir untuk menyusun transaksi. Item bisa ditambah, dihapus, diubah qty, diberi catatan, atau diberi diskon item — kapan saja sebelum transaksi dikonfirmasi.

**Fitur keranjang:**
- Tambah item via search, scan barcode, atau tap grid produk
- Ubah qty langsung dengan input angka (numpad)
- Hapus item dengan swipe atau tombol hapus
- Catatan per item (instruksi khusus, misal "tidak pedas")
- Diskon per item (nominal atau persen)
- Lihat subtotal, total diskon, dan total bayar real-time

---

### 3.2 Hold & Recall Transaksi
**Fungsi:** Kasir bisa menahan transaksi yang sedang berjalan untuk melayani pelanggan lain, lalu memanggil kembali transaksi tersebut.

- Maksimum hold yang bisa aktif bersamaan: bisa dikonfigurasi (default 5)
- Transaksi hold ditampilkan di list dengan nama/nomor meja
- Tidak ada batas waktu hold (sampai kasir recall atau shift ditutup)

---

### 3.3 Split Payment (Pembayaran Campuran)
**Fungsi:** Pelanggan bisa membayar dengan lebih dari satu metode sekaligus. Sistem kalkulasi sisa yang belum terbayar secara real-time.

**Contoh:** Total Rp 150.000 → bayar Rp 100.000 tunai + Rp 50.000 QRIS

**Mendukung kombinasi:**
- Tunai + QRIS
- Tunai + Kartu debit
- QRIS + Poin loyalty
- Kartu kredit + Voucher

---

### 3.4 Diskon Transaksi
**Fungsi:** Pemberian diskon pada total transaksi (bukan per item). Bisa nominal atau persen. Ada batasan wewenang per role karyawan.

**Batasan wewenang (konfigurasi):**
- Kasir: max diskon 10% atau Rp 50.000
- Supervisor: max diskon 30% atau Rp 200.000
- Owner/Admin: unlimited

Jika kasir input diskon melebihi batasnya → sistem minta PIN supervisor.

---

### 3.5 Kode Voucher & Kupon
**Fungsi:** Pelanggan memberikan kode voucher, kasir input ke sistem, diskon otomatis teraplikasi sesuai konfigurasi voucher.

**Tipe voucher:**
- Diskon persen (20% off semua item)
- Diskon nominal (gratis Rp 25.000)
- Gratis item tertentu
- Minimum pembelian (berlaku jika total > Rp X)
- Single use atau multi use dengan batas kuota
- Berbatas waktu (berlaku sampai tanggal X)

---

### 3.6 Promo Terjadwal Otomatis
**Fungsi:** Owner konfigurasi promo dengan waktu mulai dan berakhir. Sistem otomatis aktifkan/nonaktifkan tanpa intervensi kasir.

**Contoh promo:**
- Happy hour 14.00–16.00 setiap hari: semua minuman diskon 20%
- Promo Senin: beli nasi goreng gratis es teh
- Flash sale akhir bulan: diskon 30% untuk kategori tertentu

---

### 3.7 Undo & Koreksi Transaksi
**Fungsi:** Kasir bisa membatalkan atau mengoreksi transaksi dalam window waktu yang dikonfigurasi tanpa perlu supervisor, tapi tetap tercatat di audit log.

- **Void item** — hapus satu item dari transaksi yang sudah selesai
- **Void transaksi** — batalkan seluruh transaksi
- **Refund** — kembalikan uang, stok dikembalikan otomatis
- Window waktu default: 30 menit setelah transaksi (konfigurasi)
- Semua void/refund tercatat: siapa, kapan, alasan

---

### 3.8 Validasi & Konfirmasi Real-Time
**Fungsi:** Sistem mendeteksi anomali dan meminta konfirmasi sebelum transaksi selesai. Mencegah kesalahan kasir sebelum terjadi.

**Validasi aktif:**
- Stok tidak cukup → blokir tambah item
- Diskon melebihi batas → minta PIN supervisor
- Harga di bawah HPP → warning "jual rugi"
- Transaksi total Rp 0 → butuh konfirmasi
- Kembalian negatif (uang kurang) → kasir tidak bisa konfirmasi

---

### 3.9 Pencatatan Catatan Transaksi
**Fungsi:** Kasir atau pelanggan bisa tambahkan catatan pada keseluruhan transaksi (instruksi pengiriman, pesanan khusus, nama pelanggan walk-in, dll).

---

## MODUL 4 — PEMBAYARAN

### 4.1 QRIS Terpadu
**Fungsi:** Satu kode QRIS menerima pembayaran dari semua dompet digital (GoPay, OVO, Dana, ShopeePay, LinkAja, dll). Konfirmasi otomatis masuk ke sistem.

- QR ditampilkan di layar tablet kasir
- Konfirmasi pembayaran masuk via webhook dari payment gateway
- Kasir tidak perlu cek manual — sistem otomatis lanjut
- Timeout jika tidak ada konfirmasi dalam X menit

---

### 4.2 Kartu Debit / Kredit via EDC
**Fungsi:** Mesin EDC terhubung langsung ke POS. Nominal transaksi terkirim otomatis ke EDC — kasir tidak perlu input dua kali.

- Mendukung tap (contactless NFC), chip, dan gesek
- Konfirmasi approval otomatis masuk ke sistem
- Mendukung transaksi cicilan (0%, 3, 6, 12 bulan)

---

### 4.3 Kembalian Otomatis
**Fungsi:** Saat kasir input nominal uang yang diterima, sistem langsung hitung dan tampilkan jumlah kembalian dengan besar. Mengurangi kesalahan hitung manual.

---

### 4.4 Pembayaran Poin Loyalty
**Fungsi:** Pelanggan tukarkan poin sebagai pengganti sebagian atau seluruh pembayaran. Konversi poin ke rupiah sesuai konfigurasi program loyalitas.

---

### 4.5 Rekap Per Metode Pembayaran
**Fungsi:** Di akhir shift, sistem otomatis rangkum total penerimaan per metode: tunai, QRIS, kartu, voucher, poin. Supervisor tinggal verifikasi fisik kas.

---

## MODUL 5 — PELANGGAN & LOYALITAS

### 5.1 Database Pelanggan (CRM Lite)
**Fungsi:** Simpan dan kelola data pelanggan. Kasir bisa cari atau daftarkan pelanggan saat transaksi berlangsung.

**Data pelanggan:**
- Nama, nomor HP (primary key unik), email
- Tanggal bergabung, total transaksi, frekuensi kunjungan
- Segmen otomatis (baru, loyal, VIP, tidak aktif)
- Riwayat semua transaksi

---

### 5.2 Program Poin Loyalitas
**Fungsi:** Setiap transaksi menghasilkan poin berdasarkan nominal belanja. Poin bisa ditukar diskon atau produk gratis. Tidak perlu kartu fisik — cukup nomor HP.

**Konfigurasi:**
- Rasio poin: Rp 1.000 = 1 poin (bisa dikonfigurasi)
- Nilai tukar: 100 poin = Rp 5.000 (bisa dikonfigurasi)
- Poin kadaluarsa setelah X bulan tidak aktif
- Poin bonus untuk event tertentu (ulang tahun pelanggan, hari spesial)

---

### 5.3 Segmentasi Pelanggan Otomatis
**Fungsi:** Sistem otomatis kelompokkan pelanggan berdasarkan perilaku belanja. Dasar untuk kampanye marketing yang tepat sasaran.

**Segmen default:**
- `new` — bergabung < 30 hari, belum pernah belanja
- `active` — belanja dalam 30 hari terakhir
- `loyal` — belanja > 5x dalam 30 hari
- `vip` — total belanja > threshold (konfigurasi)
- `lapsed` — tidak belanja > 60 hari
- `lost` — tidak belanja > 120 hari

---

### 5.4 Broadcast Promo via WhatsApp
**Fungsi:** Owner kirim pesan promo ke segmen pelanggan pilihan via WhatsApp Business API. Pesan terpersonalisasi dengan nama pelanggan dan saldo poin.

- Pilih segmen target (loyal, lapsed, dll)
- Template pesan dengan variabel: {nama}, {poin}, {promo}
- Jadwalkan pengiriman
- Laporan read rate dan response

---

### 5.5 Struk Digital via WhatsApp / Email
**Fungsi:** Pelanggan terima struk transaksi via WhatsApp atau email. Tidak perlu kertas, tidak perlu aplikasi terpisah.

- Struk dikirim otomatis setelah transaksi selesai
- Format pesan: detail item, total, poin yang didapat, saldo poin
- Pelanggan bisa lihat riwayat transaksi dari link di struk

---

## MODUL 6 — LAPORAN & ANALITIK

### 6.1 Laporan Penjualan
**Fungsi:** Ringkasan penjualan otomatis per periode. Bisa per hari, minggu, bulan, atau rentang kustom.

**Isi laporan:**
- Total transaksi (jumlah)
- Omzet bruto dan neto (setelah diskon)
- Rata-rata nilai per transaksi
- Perbandingan vs periode sebelumnya (%)
- Grafik tren per jam/hari

---

### 6.2 Laporan Produk Terlaris & Paling Untung
**Fungsi:** Dua perspektif: volume terjual (terlaris) dan margin keuntungan (paling untung). Dasar keputusan stok dan strategi promo.

- Top N produk/SKU per periode
- Bisa filter per kategori
- Analisis produk slow-moving (perlu promo atau discontinue)

---

### 6.3 Laporan Kinerja Kasir
**Fungsi:** Evaluasi kinerja tiap kasir secara objektif berbasis data.

**Metrik per kasir per shift:**
- Jumlah transaksi
- Total nilai transaksi
- Rata-rata nilai per transaksi
- Jumlah void (lebih banyak = perlu perhatian)
- Jumlah diskon yang diberikan

---

### 6.4 Laporan Stok
**Fungsi:** Kartu stok digital per SKU per lokasi. Mutasi lengkap dari awal sampai akhir periode.

- Stok awal, masuk, keluar, penyesuaian, stok akhir
- Nilai stok dalam rupiah (qty × HPP)
- Bisa export untuk audit atau pembukuan

---

### 6.5 Laporan Laba Kotor
**Fungsi:** Kalkulasi margin laba kotor per produk dan per periode berdasarkan HPP yang diinput admin.

- Laba kotor = (harga jual × qty) - (HPP × qty)
- Margin % per SKU
- Total laba kotor per hari/bulan

---

### 6.6 Dashboard Real-Time (Owner Mobile)
**Fungsi:** Layar ringkasan yang bisa diakses owner dari Expo app kapan saja. Update otomatis via Supabase Realtime.

**Widget yang ditampilkan:**
- Omzet hari ini vs kemarin (%)
- Jumlah transaksi hari ini
- Produk terlaris hari ini
- Status kasir aktif (online/offline)
- Alert stok kritis
- Grafik omzet per jam

---

### 6.7 Export Laporan
**Fungsi:** Semua laporan bisa diexport ke berbagai format.

- Excel (.xlsx) untuk analisis lebih lanjut
- PDF untuk arsip atau print
- Kirim otomatis via WhatsApp ke owner setiap malam
- Jadwalkan export: harian, mingguan, bulanan

---

## MODUL 7 — KEAMANAN & KONTROL

### 7.1 Role-Based Access Control (RBAC)
**Fungsi:** Setiap user punya hak akses berbeda berdasarkan role. Mencegah aksi tidak sah dari karyawan.

**Role dan hak akses:**

| Role      | Transaksi | Void | Diskon | Laporan | Produk | Stok | Konfigurasi |
|-----------|-----------|------|--------|---------|--------|------|-------------|
| Kasir     | ✅        | ❌   | Terbatas | ❌    | View   | View | ❌         |
| Supervisor| ✅        | ✅   | Penuh  | Shift   | View   | Edit | ❌         |
| Owner     | ✅        | ✅   | ✅     | Semua   | ✅     | ✅   | Terbatas   |
| Admin     | ✅        | ✅   | ✅     | Semua   | ✅     | ✅   | ✅         |

---

### 7.2 PIN & Biometrik untuk Aksi Sensitif
**Fungsi:** Aksi yang berpotensi merugikan memerlukan verifikasi ekstra — PIN atau biometrik (fingerprint/Face ID via Expo LocalAuthentication).

**Aksi yang memerlukan verifikasi ekstra:**
- Void transaksi
- Diskon melebihi batas kasir
- Akses laporan keuangan
- Edit harga produk
- Transfer stok antar gudang

---

### 7.3 Audit Trail Lengkap & Tamper-Proof
**Fungsi:** Setiap tindakan tercatat permanen di sistem dan tidak bisa dihapus dari antarmuka POS manapun.

**Yang dicatat:**
- Semua transaksi + detail item
- Void dan refund (siapa, kapan, alasan)
- Login/logout semua user
- Perubahan harga dan stok (nilai sebelum dan sesudah)
- Akses ke fitur sensitif

**Table:** `audit_logs`
- `action_type`, `entity_type`, `entity_id`
- `old_value`, `new_value` (JSON)
- `user_id`, `location_id`, `created_at`
- `ip_address`, `device_id`

---

### 7.4 Deteksi Anomali Transaksi
**Fungsi:** Sistem pantau pola transaksi dan kirim alert jika ada yang tidak wajar.

**Pola yang dideteksi:**
- Banyak void dari kasir yang sama dalam waktu singkat
- Transaksi di luar jam operasional
- Diskon berulang mendekati batas maksimum
- Banyak transaksi kecil berturutan (split transaksi mencurigakan)
- Harga jual di bawah HPP berulang

---

### 7.5 Session Timeout
**Fungsi:** Aplikasi kasir otomatis kunci layar jika tidak aktif selama X menit. Mencegah akses tidak sah saat kasir meninggalkan perangkat.

- Default timeout: 5 menit (konfigurasi per toko)
- Untuk lanjut: kasir input PIN
- Semua session yang aktif bisa di-terminate dari dashboard owner

---

### 7.6 Backup Cloud Otomatis
**Fungsi:** Semua data dicadangkan otomatis ke Supabase cloud. Enkripsi end-to-end. Restore satu klik ke tanggal tertentu.

- Backup real-time via Supabase (PostgreSQL WAL)
- Retensi: minimum 90 hari rolling
- Point-in-time recovery
- Notifikasi jika backup gagal

---

## MODUL 8 — OPERASIONAL & SHIFT

### 8.1 Open & Close Shift dengan Kas
**Fungsi:** Prosedur formal buka dan tutup shift dengan penghitungan kas.

**Alur open shift:**
1. Kasir login → pilih lokasi
2. Input jumlah uang tunai awal di laci kas
3. Shift resmi dimulai, transaksi bisa dilakukan

**Alur close shift:**
1. Kasir pilih "Tutup Shift"
2. Sistem tampilkan ringkasan: total transaksi, total per metode bayar
3. Kasir hitung fisik uang tunai, input ke sistem
4. Sistem tampilkan selisih (lebih/kurang)
5. Supervisor konfirmasi (jika selisih > threshold)
6. Shift resmi ditutup, laporan shift tersimpan

---

### 8.2 Mode Offline Penuh
**Fungsi:** POS tetap berjalan 100% saat koneksi internet terputus. Transaksi tersimpan lokal dan sync otomatis saat koneksi pulih.

**Teknologi:**
- Expo SQLite untuk penyimpanan lokal di device
- Data master (produk, harga, stok) di-cache lokal saat online
- Queue transaksi offline → sync ke Supabase saat online
- Conflict resolution: timestamp-based, last-write-wins untuk non-kritis

**Indikator UI:**
- Banner jelas di atas layar kasir saat mode offline
- Jumlah transaksi pending sync ditampilkan
- Notifikasi saat berhasil sync

---

### 8.3 Multi Kasir & Multi Cabang
**Fungsi:** Satu akun owner bisa kelola banyak toko dan banyak kasir aktif bersamaan. Semua data terpusat, laporan bisa per cabang atau konsolidasi.

- Konfigurasi produk dan harga bisa per cabang (atau sama)
- Stok independen per cabang
- Kasir hanya bisa akses data cabang mereka sendiri
- Owner bisa switch antar cabang di dashboard

---

### 8.4 Cetak Struk Fisik
**Fungsi:** Print struk ke printer thermal via Bluetooth atau USB.

- Expo Print / react-native-thermal-printer
- Format struk: logo toko, nama kasir, item, subtotal, diskon, total, metode bayar, poin
- Konfigurasi lebar kertas (58mm / 80mm)
- Reprint struk dari history transaksi

---

### 8.5 Manajemen Meja & Antrian (F&B)
**Fungsi:** Untuk restoran/kafe: setiap transaksi bisa diasign ke nomor meja. Status meja real-time.

- Grid meja dengan status: kosong (hijau), terisi (merah), sudah minta bill (kuning)
- Satu meja bisa punya beberapa sesi order (add order)
- Split bill per meja (bagi tagihan antar teman)
- Assign pesanan ke kasir/waiter tertentu

---

### 8.6 Kitchen Display System (KDS)
**Fungsi:** Layar di dapur tampilkan pesanan masuk real-time tanpa perlu cetak tiket.

- Pesanan masuk dari kasir → langsung muncul di KDS
- Koki tandai item selesai → status update di kasir
- Timer per pesanan (berapa lama sudah menunggu)
- Alert jika pesanan > X menit belum diproses

---

## MODUL 9 — INTEGRASI EKSTERNAL

### 9.1 WhatsApp Business API
**Fungsi:** Integrasi terpusat untuk semua komunikasi via WhatsApp — struk, notifikasi stok, promo, laporan.

**Use case:**
- Kirim struk digital setelah transaksi
- Notifikasi stok minimum ke owner
- Blast promo ke segmen pelanggan
- Laporan harian otomatis ke owner setiap malam
- OTP supervisor untuk aksi sensitif

---

### 9.2 Sinkronisasi E-Commerce
**Fungsi:** Stok dan produk tersinkronisasi antara POS fisik dan toko online.

**Platform yang didukung:**
- Tokopedia (via API resmi)
- Shopee (via API resmi)
- WooCommerce
- Custom webhook untuk platform lain

**Cara kerja:**
- Saat produk terjual di toko fisik → stok di marketplace berkurang
- Saat ada pesanan online masuk → stok di POS berkurang
- Produk baru di POS bisa di-push ke marketplace

---

### 9.3 Integrasi Akuntansi
**Fungsi:** Setiap transaksi POS otomatis membuat entri jurnal di software akuntansi. Tidak perlu input ulang.

**Platform:**
- Jurnal.id (via API)
- Accurate Online (via API)
- Export format standar untuk software lain

**Mapping otomatis:**
- Penjualan → Debit Kas/Bank, Kredit Pendapatan
- Retur → reverse entry otomatis
- Diskon → Debit Beban Diskon

---

### 9.4 Manajemen Supplier & Purchase Order
**Fungsi:** Buat dan kelola pesanan pembelian ke supplier. Stok otomatis bertambah saat PO diterima.

**Alur:**
1. Buat PO (pilih supplier, SKU, qty, harga beli)
2. Kirim PO ke supplier (email/WhatsApp)
3. Saat barang tiba, konfirmasi penerimaan
4. Stok gudang bertambah, HPP update otomatis
5. Tagihan supplier tercatat untuk pembayaran

---

## MODUL 10 — UX & ANTARMUKA KASIR (Expo)

### 10.1 Layout Adaptif per Role
**Fungsi:** Tampilan aplikasi kasir menyesuaikan diri berdasarkan role yang login. Kasir baru mendapat UI yang lebih guided, kasir berpengalaman mendapat shortcut.

---

### 10.2 Numpad & Input Cepat
**Fungsi:** Kasir input qty dan nominal dengan numpad besar yang responsif. Mendukung numpad fisik eksternal via USB/Bluetooth.

---

### 10.3 Grid Produk dengan Gambar
**Fungsi:** Produk ditampilkan sebagai grid dengan gambar dan harga. Kasir tap untuk tambah ke keranjang. Layout bisa diubah antara grid dan list.

---

### 10.4 Shortcut & Favorit
**Fungsi:** Produk terlaris otomatis tampil di bagian atas atau bisa di-pin manual oleh kasir/supervisor.

---

### 10.5 Indikator Koneksi & Sync Status
**Fungsi:** Selalu tampilkan status koneksi (online/offline) dan jumlah transaksi yang belum tersync di header aplikasi kasir.

---

## DATABASE SCHEMA RINGKASAN

### Tabel Utama

```sql
products           -- produk induk
product_attributes -- dimensi varian (Ukuran, Warna)
attribute_values   -- nilai dimensi (S, M, L, Merah)
product_skus       -- SKU = varian yang bisa dijual
sku_units          -- satuan jual per SKU + konversi
sku_stock          -- stok per SKU per lokasi
bundle_items       -- komponen bundling

locations          -- toko, gudang, cabang
stock_mutations    -- log semua pergerakan stok
stock_transfers    -- dokumen transfer antar lokasi

transactions       -- header transaksi
transaction_items  -- detail item per transaksi
payments           -- detail pembayaran per metode

customers          -- data pelanggan
loyalty_points     -- saldo dan riwayat poin

users              -- karyawan (kasir, supervisor, owner)
roles              -- definisi role
shifts             -- sesi kerja per kasir

vouchers           -- kode voucher & kupon
promotions         -- promo terjadwal
bundle_promotions  -- promo beli X gratis Y

audit_logs         -- log semua aksi sistem
```

---

## CATATAN TEKNIS UNTUK CURSOR AI

### Kritis — Gunakan Database Transaction untuk:
1. **Sell bundle** → kurangi stok semua komponen atomik
2. **Close shift** → hitung kas, simpan laporan, tutup semua transaksi pending
3. **Stock transfer confirm** → kurangi stok sumber, tambah stok tujuan
4. **Void transaksi** → kembalikan stok semua item, buat refund record

### Supabase Realtime — Subscribe untuk:
- Stok berubah → update semua kasir yang buka produk sama
- Transaksi baru → update dashboard owner real-time
- Stok minimum alert → push notif ke owner

### Offline-First (Expo SQLite):
- Cache: products, product_skus, sku_units, sku_stock (per lokasi kasir)
- Queue: transactions, transaction_items, payments
- Sync strategy: optimistic update lokal, konfirmasi ke server saat online
- Conflict: timestamp last_modified, server wins untuk stok

### Multi-Currency (opsional):
- Semua harga simpan dalam IDR (integer, dalam sen untuk presisi)
- Tampilkan dengan `Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR'})`

---

*Dokumen ini adalah spesifikasi lengkap sistem POS.*
*Stack: Next.js + Expo + Supabase + Turborepo*
