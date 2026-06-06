> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Hendra, Fajar, Dimas, Fitri

# Sprint 5 Plan — Product Variant Foundation

> **Sprint Master:** Hendra Pratama  
> **Periode:** Minggu 9–10 (post Sprint 4 close-ready)  
> **Referensi:** [SPRINT-4-CLOSURE.md](../sprint/SPRINT-4-CLOSURE.md), [FEATURE-BACKLOG.md](./FEATURE-BACKLOG.md), [VISION-ZAKI-MATURED.md](./VISION-ZAKI-MATURED.md)

## Tujuan Sprint 5

> Menyelesaikan fondasi varian produk sebelum bundling, sambil menjaga reliability transaksi kasir retail bahan bangunan tetap aman.

## Scope Sprint 5

### In Scope

- Fondasi data produk varian:
  - produk induk bertanda `hasVariants`
  - produk turunan varian via relasi `parentProductId`
  - label varian (`variantLabel`) untuk identitas ukuran/warna/volume
- Guard operasional:
  - produk induk varian tidak tampil di product grid transaksi
  - produk induk varian ditolak saat checkout/hold
- UI master produk:
  - set sebagai produk induk varian
  - pilih parent product untuk turunan varian
  - input label varian
- Test coverage untuk rule varian kritikal backend transaksi + katalog.

### Out of Scope

- Bundling produk (tetap Sprint 6+).
- Multi satuan konversi otomatis stok.
- Integrasi online order dan offline PWA queue penuh.

## Owner & Deliverable

| Area | Owner | Deliverable |
|---|---|---|
| API catalog + transaksi varian guard | Fajar | Update Prisma schema + service validation + test |
| UI master produk varian | Dimas | Form varian di halaman master produk |
| Dokumentasi sprint & closure | Fitri | Progress + closure Sprint 5 |

## Acceptance Criteria

- [x] Produk bisa ditandai sebagai induk varian (`hasVariants: true`).
- [x] Produk turunan varian bisa menyimpan `parentProductId` dan `variantLabel`.
- [x] Product grid POS tidak menampilkan produk induk varian.
- [x] Checkout/hold menolak produk induk varian dengan error `INVALID_INPUT`.
- [x] UI master produk menyediakan kontrol produk induk, parent varian, dan label varian.
- [x] Test backend relevan lulus setelah perubahan.

## Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Perubahan schema butuh migrasi DB di environment tertentu | Medium | Jalankan `db:generate` dan migrasi terkontrol sebelum deploy |
| Data lama belum punya relasi parent varian | Low | Default field nullable; backward-compatible |
| UX varian dapat membingungkan user awal | Medium | Hint label di UI + contoh format label varian |

## Exit Criteria Sprint 5

- [x] Minimal 1 fitur prioritas Sprint 5 selesai end-to-end (varian fondasi).
- [x] Verifikasi lint/typecheck/test/build area berubah lulus (API + web).
- [x] Dokumen progress + closure Sprint 5 ter-update — status **CLOSED** (2 Juni 2026).
- [x] Panduan uji manual web: [SPRINT-5-MANUAL-UJI.md](../testing/SPRINT-5-MANUAL-UJI.md).
