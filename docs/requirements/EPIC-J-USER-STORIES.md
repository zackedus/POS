> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Dewi, Hendra, Maya, Fajar, Dimas, Citra, Pak Zaki

# Epic J — User Stories P0 (Penjualan Online Web)

> **Epic:** J — Online Sales (Web)  
> **Status:** **AC siap development** (setelah [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md))  
> **Disusun:** Dewi Kartika (Business Analyst)  
> **Tanggal:** 2 Juni 2026  
> **Keputusan terkunci:** [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md) · Discovery: [EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md](./EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md)

---

## Ringkasan Prioritas (ADR-004)

| Keputusan | Implikasi user story |
|-----------|---------------------|
| Q-J01 Pickup P0, delivery P1 | US-J-04 **P0** · US-J-05 **P1** |
| Q-J02 Guest P0 | Tidak wajib login di US-J-03 … J-06 |
| Q-J03 Midtrans P0 | US-J-06 **P0** |
| Q-J04 URL per tenant + pilih outlet | US-J-04: pilih cabang pickup |
| Q-J05 Stok real-time + cache | US-J-01, J-02, J-03 |
| Q-J06 Gambar/placeholder wajib | US-J-01, J-02 |
| Q-J07 Harga = kasir | US-J-01, J-02 |
| Q-J08 Owner + Manager kelola katalog | Out of scope doc ini — backlog terpisah |

**Di luar scope dokumen ini (P0 lanjutan / P1):** US-J-08 status order kasir, US-J-09 stok omnichannel detail, US-J-10 notifikasi — mengikuti sprint setelah US-J-07.

---

## US-J-01 — Katalog publik

**Sebagai** pelanggan toko bahan bangunan,  
**saya ingin** melihat daftar produk dengan kategori, harga jual, dan indikator stok di halaman storefront tenant,  
**agar** saya bisa memilih barang sebelum memesan.

| Field | Nilai |
|-------|-------|
| Epic | J |
| Prioritas | **P0** |
| Depends | Master produk (`sellOnline`), outlet scope, ADR-004 Q-J04/Q-J05/Q-J06/Q-J07 |

### Kriteria Penerimaan

1. **AC-J01-1:** Halaman katalog menampilkan hanya produk dengan flag `sellOnline = true` dan status aktif di master POS.
2. **AC-J01-2:** Setiap kartu produk menampilkan: nama, harga jual (sama dengan harga kasir — Q-J07), satuan jual, dan status **Tersedia** / **Habis** berdasarkan stok outlet yang dipilih atau default outlet terdekat.
3. **AC-J01-3:** Navigasi kategori (semen, cat, pipa, dll.) memfilter daftar produk tanpa reload penuh halaman (client atau server filter).
4. **AC-J01-4:** Pencarian berdasarkan nama atau SKU menampilkan hasil relevan dalam ≤ 2 detik (jaringan normal).
5. **AC-J01-5:** Produk tanpa gambar upload menampilkan **placeholder generik tenant** — tidak boleh kartu kosong (Q-J06).
6. **AC-J01-6:** Data stok menggunakan sumber real-time API dengan cache pendek (≤ 60 detik); label stok memperbarui setelah cache expire atau refresh manual.
7. **AC-J01-7:** Halaman **tidak** menampilkan HPP, margin, atau data internal tenant.

---

## US-J-02 — Detail produk (PDP)

**Sebagai** pelanggan,  
**saya ingin** membuka halaman detail produk dengan gambar, satuan, varian (jika ada), dan harga,  
**agar** saya yakin membeli SKU yang benar.

| Field | Nilai |
|-------|-------|
| Epic | J |
| Prioritas | **P0** |
| Depends | US-J-01, model varian (Sprint 5) |

### Kriteria Penerimaan

1. **AC-J02-1:** PDP menampilkan minimal satu gambar (atau placeholder Q-J06), nama, SKU, deskripsi singkat, harga per satuan jual, dan daftar varian aktif (ukuran/warna) jika produk punya varian.
2. **AC-J02-2:** Pemilihan varian mengubah harga/tampilan sesuai SKU varian yang dipilih; varian tidak aktif tidak bisa dipilih.
3. **AC-J02-3:** MOQ / kelipatan order (jika dikonfigurasi di master) ditampilkan dan divalidasi saat menambah ke keranjang.
4. **AC-J02-4:** Tombol **Tambah ke keranjang** dinonaktifkan jika stok = 0 untuk outlet konteks.
5. **AC-J02-5:** Harga PDP identik dengan harga yang akan dipakai di kasir untuk SKU yang sama (Q-J07).
6. **AC-J02-6:** Layout mobile-first; konten utama terbaca tanpa zoom pada lebar 360px.

---

## US-J-03 — Keranjang belanja

**Sebagai** pelanggan (guest),  
**saya ingin** menambah, mengubah, dan menghapus qty item di keranjang,  
**agar** saya bisa checkout sekali untuk beberapa SKU.

| Field | Nilai |
|-------|-------|
| Epic | J |
| Prioritas | **P0** |
| Depends | US-J-01, US-J-02 |

### Kriteria Penerimaan

1. **AC-J03-1:** Pelanggan dapat menambah produk dari katalog/PDP; keranjang menampilkan nama, varian, satuan, harga satuan, qty, subtotal per baris.
2. **AC-J03-2:** Mengubah qty memvalidasi stok tersedia; jika melebihi stok, tampilkan pesan error jelas (Bahasa Indonesia) dan qty tidak berubah.
3. **AC-J03-3:** MOQ/kelipatan divalidasi saat ubah qty (sama seperti PDP).
4. **AC-J03-4:** Keranjang persist di **session browser** (localStorage/sessionStorage) minimal 24 jam atau sampai checkout selesai (Q-J02 guest — tanpa akun).
5. **AC-J03-5:** Subtotal keranjang belum termasuk PPN; baris PPN 11% dan total ditampilkan di ringkasan (konsisten kasir — handoff Eko).
6. **AC-J03-6:** Tombol **Lanjut checkout** mengarah ke alur pickup (US-J-04); opsi delivery hanya muncul jika fitur US-J-05 diaktifkan di environment (P1).

---

## US-J-04 — Checkout pickup

**Sebagai** pelanggan (guest),  
**saya ingin** memilih cabang pickup, mengisi data kontak, dan meninjau ringkasan order,  
**agar** saya bisa mengambil barang di toko tanpa antre panjang di kasir.

| Field | Nilai |
|-------|-------|
| Epic | J |
| Prioritas | **P0** |
| Depends | US-J-03, multi-outlet, ADR-004 Q-J01/Q-J04 |

### Kriteria Penerimaan

1. **AC-J04-1:** Pelanggan **wajib** memilih satu outlet pickup dari daftar outlet tenant yang aktif (Q-J04).
2. **AC-J04-2:** Form kontak wajib: nama, nomor HP (format Indonesia), opsional catatan order (contoh: warna cat, plat nomor kendaraan).
3. **AC-J04-3:** Ringkasan menampilkan: daftar item, subtotal, PPN 11%, total, alamat/nama outlet pickup, estimasi waktu siap (teks statis atau slot P1).
4. **AC-J04-4:** Sebelum submit, sistem memvalidasi stok final per SKU di outlet terpilih; jika tidak cukup, checkout diblokir dengan daftar item bermasalah.
5. **AC-J04-5:** Setelah submit valid, order dibuat dengan status awal sesuai kontrak API (`NEW` / menunggu bayar) dan nomor order human-readable **WEB-YYYYMMDD-####** (J6.8).
6. **AC-J04-6:** Tidak wajib login/registrasi untuk menyelesaikan checkout pickup (Q-J02).

---

## US-J-05 — Checkout delivery

**Sebagai** pelanggan,  
**saya ingin** memasukkan alamat pengiriman dan melihat estimasi biaya kirim,  
**agar** barang diantar ke lokasi proyek saya.

| Field | Nilai |
|-------|-------|
| Epic | J |
| Prioritas | **P1** (bukan blocker MVP pickup — Q-J01) |
| Depends | US-J-03, kebijakan ongkir (RFC) |

### Kriteria Penerimaan

1. **AC-J05-1:** Mode **Delivery** tersedia sebagai alternatif dari pickup di checkout (setelah P1 diaktifkan).
2. **AC-J05-2:** Form alamat: jalan, kelurahan/kecamatan, kota, kode pos opsional, catatan kurir.
3. **AC-J05-3:** Biaya kirim ditampilkan sebelum pembayaran (mekanisme flat/km/manual — konfigurasi owner, dokumentasi terpisah).
4. **AC-J05-4:** Validasi radius delivery per outlet (jika dikonfigurasi); di luar radius → pesan error dan tidak bisa lanjut.
5. **AC-J05-5:** Order delivery menggunakan status lifecycle yang sama dengan pickup (J6.3) dengan flag fulfillment `DELIVERY`.

---

## US-J-06 — Pembayaran digital (Midtrans)

**Sebagai** pelanggan,  
**saya ingin** membayar via QRIS, virtual account, atau e-wallet saat checkout web,  
**agar** order langsung dikonfirmasi sistem setelah pembayaran berhasil.

| Field | Nilai |
|-------|-------|
| Epic | J |
| Prioritas | **P0** |
| Depends | US-J-04, integrasi Midtrans web (**Arif**), ADR-004 Q-J03 |

### Kriteria Penerimaan

1. **AC-J06-1:** Setelah checkout pickup valid, pelanggan diarahkan ke alur pembayaran Midtrans (Snap atau setara web).
2. **AC-J06-2:** Metode yang didukung minimal: QRIS, VA, e-wallet — selaras POC kasir.
3. **AC-J06-3:** Webhook pembayaran **idempotent**; status order berubah ke `PAID` hanya sekali meski webhook duplikat (J5.3).
4. **AC-J06-4:** Pembayaran expired (TTL default **60 menit**, final di RFC) membatalkan order otomatis atau menandai `CANCELLED` + lepas hold stok (J5.4).
5. **AC-J06-5:** Pembayaran gagal/dibatalkan menampilkan halaman status dengan opsi coba bayar ulang jika order masih valid.
6. **AC-J06-6:** **Bayar di toko saat pickup** (cash/transfer manual) — **P1**, tidak wajib untuk UAT MVP storefront.

---

## US-J-07 — Order masuk ke POS (antrian fulfillment)

**Sebagai** owner atau kasir,  
**saya ingin** melihat order web yang sudah dibayar di antrian fulfillment outlet saya,  
**agar** tim toko menyiapkan barang seperti order walk-in.

| Field | Nilai |
|-------|-------|
| Epic | J |
| Prioritas | **P0** |
| Depends | US-J-06, API `online_orders` (**Fajar**), RBAC outlet |

### Kriteria Penerimaan

1. **AC-J07-1:** Order dengan status `PAID` muncul di dashboard kasir/owner pada antrian **Order Online** ter-scope `tenantId` + `outletId` user.
2. **AC-J07-2:** Setiap baris antrian menampilkan: nomor order WEB-*, waktu order, nama pelanggan, HP, mode pickup/delivery, total, status fulfillment.
3. **AC-J07-3:** Record order web tersimpan terpisah dari `transactions` walk-in (J6.1) dengan relasi ke item line yang dapat dikonversi ke persiapan barang.
4. **AC-J07-4:** Kasir/owner dapat mengubah status: `CONFIRMED` → `READY` → `COMPLETED` (detail UI US-J-08 sprint berikutnya; minimal API + list P0).
5. **AC-J07-5:** Saat status `PAID`, stok outlet berkurang sesuai kebijakan Eko (default: pengurangan pada `PAID` — konfirmasi di RFC).
6. **AC-J07-6:** Order hanya terlihat di outlet yang dipilih pelanggan saat checkout (Q-J04).

---

## Traceability — Stub → Story

| Stub discovery | User story | Prioritas |
|----------------|------------|-----------|
| US-J-01 | US-J-01 Katalog publik | P0 |
| US-J-02 | US-J-02 Detail produk | P0 |
| US-J-03 | US-J-03 Keranjang | P0 |
| US-J-04 | US-J-04 Checkout pickup | P0 |
| US-J-05 | US-J-05 Checkout delivery | P1 |
| US-J-06 | US-J-06 Pembayaran Midtrans | P0 |
| US-J-07 | US-J-07 Order → POS | P0 |
| US-J-08 … US-J-10 | Sprint 14+ (status, sync, notifikasi) | P0/P2 |

---

## Handoff Log

| From | To | Task | Deliverable | Parallel OK? | Next action |
|------|-----|------|-------------|--------------|-------------|
| Dewi · Analyst | Hendra · Planner | Estimasi SP Track B | Sprint 13–14 plan | Ya | Breakdown milestone |
| Dewi · Analyst | Maya · UI/UX | Wireframe dari AC di atas | [WIREFRAMES-STOREFRONT.md](../design/WIREFRAMES-STOREFRONT.md) | Tidak | Mobile-first, guest flow — **selesai** |
| Dewi · Analyst | Fajar · Senior Dev | Mapping AC → endpoint | OpenAPI draft | Tidak — setelah Maya | RFC `online_orders` |
| Dewi · Analyst | Citra · QA | Test plan Epic J P0 | S13 test plan (TBD) | Ya | Kasus dari AC-J01…J07 |

---

*Disusun: Dewi Kartika · 2 Juni 2026 · Keputusan: [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md)*
