# Panduan Cepat Kasir — Barokah Core POS

> 📚 [Indeks Dokumentasi](../INDEX.md) | Audience: Kasir, Manager

Panduan singkat shift harian toko bahan bangunan.

---

## Sebelum Shift

1. Login dengan akun **Kasir** di `/login`
2. Buka **Shift & Kas** (`/shift`) → masukkan saldo awal kas (uang di laci)
3. Pastikan indikator **Online** hijau (offline mode tersedia Fase 2)

## Transaksi Walk-in

1. **Cari produk:** ketik nama/SKU/barcode atau tap grid kategori
2. **Multi satuan:** pilih dus/kg/m di dropdown keranjang jika produk punya beberapa satuan jual
3. **Qty:** tombol ± atau ketik langsung
4. **Checkout panel** (3 kartu berurutan di sidebar):
   - **Pelanggan:** badge *Walk-in* atau *Terdaftar* — **Pilih Pelanggan**, scan `MBR-…`, atau ketik nama/HP; tombol **Walk-in** untuk reset
   - Info kredit tersedia, deposit, piutang tampil otomatis saat pelanggan terhubung
   - **Pengiriman:** *Ambil di toko* (default) atau *Kirim ke alamat* — walk-in bisa kirim jika nama + HP diisi + alamat manual; pelanggan terdaftar bisa pilih alamat CRM
   - **Pembayaran:** Tunai / Transfer / QRIS / Tempo / Deposit / Split — field kontekstual hanya muncul sesuai metode
   - Validasi tampil **sebelum** checkout (pelanggan wajib untuk tempo/deposit, alamat wajib untuk kirim)
5. **Promo:** pilih otomatis atau promo spesifik di dropdown
6. **Tukar poin:** jika pelanggan terdaftar dan punya saldo, isi jumlah poin (maks 50% total)
7. **Total:** periksa subtotal, diskon, PPN (jika aktif), total akhir
8. **Bayar & checkout** — tempo/deposit butuh pelanggan; jatuh tempo bisa diubah di panel pembayaran
   - **Tempo over limit:** diblokir — klik **Minta Persetujuan Manager** (manager email+password)
   - **Deposit kurang:** tombol *Deposit + Tempo* otomatis muncul jika kredit mencukupi
9. **Struk:** preview digital; cetak PDF atau thermal (jika terhubung)

## Hold & Recall

- **Hold:** simpan keranjang sementara (TTL **120 menit** / ~2 jam, `POS_HOLD_TTL_MINUTES`) — pelanggan ambil barang dulu
- **Recall:** buka accordion **Daftar Hold** → Recall → lanjut checkout

## Void (Manager)

- Accordion **Transaksi Terakhir** → Void → butuh approval manager (PIN/password)
- Stok otomatis dikembalikan

## Terima Pembayaran Piutang

1. **Pilih pelanggan** yang punya outstanding piutang (panel info menampilkan nominal piutang)
2. Klik **Terima Pembayaran Piutang** di panel pelanggan
3. Pilih metode: **Tunai** / **Transfer** / **Deposit** / **QRIS**
4. Isi nominal, no. referensi TF (wajib untuk transfer), bank, URL bukti (opsional)
5. Simpan — muncul modal **Cetak Bukti** + **Tutup**; riwayat juga bisa dicetak ulang dari tabel
6. Pembayaran tunai terhubung **shift aktif** untuk rekonsiliasi kas

> Manager/owner juga bisa catat pelunasan di **Dashboard → Piutang** atau tab **Piutang** di detail pelanggan.

## Tutup Shift

1. Buka **Shift & Kas** dari header kasir (`/shift`) atau tab **Shift Aktif**
2. Klik **Tutup Shift** — panel rekonsiliasi muncul inline (tanpa pindah halaman)
3. Pastikan tidak ada hold aktif (warning muncul jika ada)
4. Hitung uang fisik di laci, bandingkan dengan **kas diharapkan** (termasuk penjualan tunai, terima piutang tunai, minus pengeluaran)
5. Isi saldo akhir kas fisik — sistem hitung selisih otomatis
6. Konfirmasi penutupan shift

## Tiga Kanal Penjualan di POS

Kasir punya **3 mode** lewat tab header (`PosShiftBar`):

| Tab | Route | Badge | Workflow |
|-----|-------|-------|----------|
| **🏪 Toko** | `/pos` | Penjualan Toko | Scan/manual checkout, pelanggan walk-in/terdaftar, pembayaran tunai/transfer/QRIS/tempo/deposit |
| **🌐 Order Web** | `/pos/online-orders` | Order Web | Antrian order storefront web (`/store/*`) setelah pembayaran Midtrans |
| **🛒 Marketplace** | `/pos/marketplace-orders` | Marketplace | Entri manual order Tokopedia/Shopee (scaffold Fase 2 — bukan integrasi API otomatis) |

### Mode A — Penjualan Toko (Offline)

1. Login → buka shift → tab **Toko** (`/pos`)
2. Cari/tap produk → atur qty → checkout panel (Pelanggan → Pengiriman → Pembayaran)
3. Pengiriman opsional → masuk antrian `/dashboard/deliveries` tipe **Toko Langsung**
4. Stok terpotong saat checkout selesai

### Mode B — Order Web

1. Tab **Order Web** (`/pos/online-orders`) — filter cabang aktif
2. Alur: **Konfirmasi** (PAID) → **Disiapkan** → **Cetak Label** → **Kirim** → **Selesai**
3. Stok sudah terpotong saat pembayaran web sukses (PAID) — fulfill tidak deduct ulang
4. Pengiriman web masuk antrian dashboard tipe **Order Online** channel **Order Web**

### Mode C — Marketplace (Scaffold)

1. Tab **Marketplace** (`/pos/marketplace-orders`)
2. Klik **+ Catat Order** → isi no. order marketplace, channel (Tokopedia/Shopee), pelanggan, item
3. Simpan → langsung status **Sudah dibayar** (asumsi prepaid di marketplace) + stok terpotong
4. Fulfillment sama seperti order web: Konfirmasi → Disiapkan → Kirim/Selesai
5. Integrasi API Tokopedia/Shopee otomatis = **Fase 3** (ADR-003)

## Online Orders (legacy section — lihat Mode B di atas)

- Badge pesanan web di tab **Order Web** header POS
- Buka **`/pos/online-orders`** — antrian fulfillment kasir (filter per cabang aktif, channel WEB saja)
- Alur kasir:
  1. **Konfirmasi** (order sudah dibayar / PAID)
  2. **Tandai Disiapkan** (READY) — untuk pengiriman, otomatis masuk antrian `/dashboard/deliveries`
  3. **Cetak Label** — label DARI/UNTUK siap tempel (A6 / 10×15 cm)
  4. **Kirim** — tandai pengiriman DIKIRIM
  5. **Selesai / diserahkan** — pickup di toko atau pengiriman selesai
- Stok sudah terpotong saat PAID — fulfill tidak deduct ulang
- Checkout web (`/store/[slug]/checkout`) wajib isi **nama**, **HP**, dan **alamat lengkap** jika pilih antar ke alamat

## Pengiriman ke Alamat (POS)

### Pelanggan terdaftar
1. Di kartu **Pelanggan**, pilih pelanggan terdaftar
2. Di kartu **Pengiriman**, tap **Kirim ke alamat**
3. Pilih alamat CRM atau **alamat sekali pakai** + catatan
4. Checkout di kartu **Pembayaran** — sukses menampilkan *"Masuk antrian pengiriman DLV-…"*
5. Kelola antrian di **Dashboard → Pengiriman** (`/dashboard/deliveries`)

### Pelanggan walk-in
1. Isi **nama** (min. 2 karakter) dan **no. HP** di kartu Pelanggan (badge *Walk-in*)
2. Di kartu **Pengiriman**, tap **Kirim ke alamat** — form alamat manual muncul
3. Isi alamat lengkap, kelurahan/kecamatan, kota (+ kode pos opsional) dan catatan
4. Checkout tunai/transfer/QRIS — sistem buat antrian pengiriman otomatis

> Pengiriman **tidak tersedia** saat offline.

## Tips

| Situasi | Aksi |
|---------|------|
| Stok habis | Kurangi qty atau tunggu restock |
| Margin negatif | Warning kuning — transaksi tetap bisa |
| Split payment | Cash + Transfer harus = total persis |
| Offline | Transaksi antre; sync saat online kembali |
| Checkout kirim sukses tapi antrian kosong di dashboard | Pastikan **Dashboard → Pengiriman** memakai filter **Semua cabang** (multi-outlet) dan tab **Semua aktif** — default hanya menampilkan Menunggu/Disiapkan/Dikirim. Pastikan cabang kasir POS sama dengan filter cabang. Jika muncul pesan error setelah checkout, buat pengiriman manual dari struk. |

## Bantuan

- Manager/Owner untuk void dan force-close shift
- [PILOT-GO-LIVE-CHECKLIST](./PILOT-GO-LIVE-CHECKLIST.md) untuk setup toko
