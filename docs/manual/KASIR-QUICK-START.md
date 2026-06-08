# Panduan Cepat Kasir — Barokah Core POS

> 📚 [Indeks Dokumentasi](../INDEX.md) | Audience: Kasir, Manager

Panduan singkat shift harian toko bahan bangunan.

---

## Sebelum Shift

1. Login dengan akun **Kasir** di `/login`
2. Buka **Shift** → masukkan saldo awal kas (uang di laci)
3. Pastikan indikator **Online** hijau (offline mode tersedia Fase 2)

## Transaksi Walk-in

1. **Cari produk:** ketik nama/SKU/barcode atau tap grid kategori
2. **Multi satuan:** pilih dus/kg/m di dropdown keranjang jika produk punya beberapa satuan jual
3. **Qty:** tombol ± atau ketik langsung
4. **Pelanggan (opsional):** pilih dari daftar, ketik nama + HP `08…`, atau scan QR `MBR-…`
   - **Pilih dari daftar:** tombol di panel pelanggan — search nama/HP/kode member
   - **Scan kartu member:** ketik/scan QR `MBR-…` di field scan member
   - Panel info menampilkan kode member, limit kredit, kredit tersedia, piutang, deposit, poin
5. **Promo:** pilih otomatis atau promo spesifik di dropdown
6. **Tukar poin:** jika pelanggan terdaftar dan punya saldo, isi jumlah poin (maks 50% total)
7. **Total:** periksa subtotal, diskon, PPN (jika aktif), total akhir
8. **Bayar:** Tunai / Transfer / QRIS / Split / Tempo / Deposit
   - **Tempo over limit:** diblokir — klik **Minta Persetujuan Manager** (manager email+password)
9. **Struk:** preview digital; cetak PDF atau thermal (jika terhubung)

## Hold & Recall

- **Hold:** simpan keranjang sementara (TTL **120 menit** / ~2 jam, `POS_HOLD_TTL_MINUTES`) — pelanggan ambil barang dulu
- **Recall:** buka accordion **Daftar Hold** → Recall → lanjut checkout

## Void (Manager)

- Accordion **Transaksi Terakhir** → Void → butuh approval manager (PIN/password)
- Stok otomatis dikembalikan

## Tutup Shift

1. Pastikan tidak ada hold aktif (warning muncul saat tutup)
2. Hitung uang fisik di laci
3. Sistem bandingkan dengan **expected cash**
4. Catat selisih jika ada

## Online Orders (jika aktif)

- Badge pesanan online di header POS
- `/pos/online-orders` → fulfill pickup/delivery
- Stok sudah terpotong saat PAID — fulfill tidak deduct ulang

## Tips

| Situasi | Aksi |
|---------|------|
| Stok habis | Kurangi qty atau tunggu restock |
| Margin negatif | Warning kuning — transaksi tetap bisa |
| Split payment | Cash + Transfer harus = total persis |
| Offline | Transaksi antre; sync saat online kembali |

## Bantuan

- Manager/Owner untuk void dan force-close shift
- [PILOT-GO-LIVE-CHECKLIST](./PILOT-GO-LIVE-CHECKLIST.md) untuk setup toko
