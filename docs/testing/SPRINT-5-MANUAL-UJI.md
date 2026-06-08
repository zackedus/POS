> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Dimas, Fajar, Fitri

# Sprint 5 — Panduan Uji Manual (Varian Produk)

> **Tanggal:** 2 Juni 2026  
> **Owner uji:** Dimas Pratama (frontend) · Fajar Ramadhan (API)  
> **Referensi:** [SPRINT-5-PLAN.md](../requirements/SPRINT-5-PLAN.md), [SPRINT-5-CLOSURE.md](../sprint/SPRINT-5-CLOSURE.md)

---

## Prasyarat

1. PostgreSQL + Redis berjalan (Docker Compose atau lokal).
2. Migrasi database terbaru sudah dijalankan (`npm run db:migrate` dari root monorepo).
3. Seed data tersedia (`npm run db:seed` jika perlu akun demo).
4. API dev berjalan di **http://localhost:3000** (`npm run dev:api:clean` dari root).
5. Web dev berjalan di **http://localhost:3001** (`npm run dev --workspace=@barokah/web`).

### URL uji

| Layar | URL |
|-------|-----|
| Login | http://localhost:3001/login |
| Master Produk | http://localhost:3001/master/products |
| Kasir (POS) | http://localhost:3001/pos |
| Health API | http://localhost:3000/api/v1/health |

**Akun demo (seed):** `owner@barokah.local` — gunakan password dari seed/README proyek.

---

## Skenario 1 — Buat produk induk varian

| # | Langkah | Hasil yang diharapkan |
|---|---------|----------------------|
| 1 | Buka **Master Produk** setelah login | Halaman daftar produk tampil |
| 2 | Isi SKU `CAT-001`, nama `Cat Tembok`, harga, pilih satuan | Form terisi |
| 3 | Centang **Produk induk (punya varian)** | Dropdown parent varian nonaktif; checkbox aktif |
| 4 | Klik **Tambah produk** | Pesan sukses; produk muncul di list dengan teks **· Produk induk varian** |

---

## Skenario 2 — Buat produk turunan varian

| # | Langkah | Hasil yang diharapkan |
|---|---------|----------------------|
| 1 | Di form tambah, **jangan** centang induk varian | Checkbox induk tidak aktif jika parent dipilih |
| 2 | Pilih **Produk induk varian** = `Cat Tembok (CAT-001)` | Field **Label varian** muncul |
| 3 | Isi label `Warna Putih / 5 Liter`, SKU `CAT-001-P`, harga turunan | Form lengkap |
| 4 | Simpan | List menampilkan **· Varian dari Cat Tembok · Warna Putih / 5 Liter** |

---

## Skenario 3 — Edit varian

| # | Langkah | Hasil yang diharapkan |
|---|---------|----------------------|
| 1 | Klik **Ubah** pada produk turunan | Mode edit dengan parent + label varian |
| 2 | Ubah label menjadi `Putih 5L` lalu **Simpan** | List memperbarui label varian |

---

## Skenario 4 — Guard kasir (produk induk tidak dijual)

| # | Langkah | Hasil yang diharapkan |
|---|---------|----------------------|
| 1 | Buka shift jika belum (`/shift`) | Shift aktif |
| 2 | Buka **Kasir** (`/pos`) | Grid produk tampil |
| 3 | Cari `Cat Tembok` (induk varian) di grid | **Tidak muncul** di grid |
| 4 | Cari `Cat Tembok Putih` (turunan) | **Muncul** dan bisa ditambah ke keranjang |

---

## Skenario 5 — Checkout/hold menolak induk varian (API)

> Uji ini memvalidasi guard backend; UI normalnya tidak menampilkan induk di grid.

| # | Langkah | Hasil yang diharapkan |
|---|---------|----------------------|
| 1 | (Opsional) Via API/client dev, coba checkout dengan `productId` induk varian | Respons error `INVALID_INPUT` — produk induk tidak boleh dijual langsung |
| 2 | Coba hold dengan produk induk varian | Respons error `INVALID_INPUT` |

---

## Checklist penutupan Sprint 5 (Pak Zaki)

- [ ] Produk induk varian bisa dibuat dari UI master
- [ ] Produk turunan varian punya parent + label
- [ ] Induk varian tidak tampil di grid kasir
- [ ] Turunan varian bisa dijual di kasir
- [ ] Tidak ada regresi login / shift / checkout tunai

---

## Catatan & blocker umum

| Gejala | Kemungkinan penyebab | Tindakan |
|--------|---------------------|----------|
| Dropdown parent kosong | Belum ada produk dengan `hasVariants` | Buat induk varian dulu (Skenario 1) |
| Grid kasir kosong | Shift belum dibuka atau API mati | Buka shift; cek health API |
| Error migrasi field varian | DB belum migrate | Jalankan migrasi Prisma di environment dev |

**Blocker saat ini:** tidak ada blocker kode frontend Sprint 5. Risiko operasional: migrasi DB di staging/prod harus dijadwalkan terpisah.
