> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Dimas, Fajar, Fitri

# Sprint 7 Frontend — E2E Lite Checklist

> Tujuan: validasi cepat alur kritikal frontend Sprint 7 tanpa setup browser automation penuh.

---

## Prasyarat

- API dan web berjalan.
- User kasir valid tersedia.
- Data produk mencakup minimal 1 produk bundle.

---

## Skenario 1 — Bundle Policy Outlet-Level (Jika Backend Expose)

1. Login sebagai kasir.
2. Buka route `/pos`.
3. Pastikan kartu produk bundle menampilkan:
   - jenis policy (`Outlet`/`Tenant`);
   - behavior (`ALLOW/WARN/BLOCK`);
   - pesan operasional (jika ada).
4. Pastikan ringkasan sinkron policy tampil di area katalog.

**Expected:** UI menampilkan informasi policy bundle sesuai metadata backend tanpa error rendering.

---

## Skenario 2 — Fallback Aman Saat Metadata Policy Tidak Ada

1. Login kasir, buka `/pos`.
2. Gunakan data produk bundle tanpa `bundlePolicy`/`outletBehavior`.
3. Verifikasi label fallback tenant-level tetap muncul.

**Expected:** UI tetap stabil, tidak blank, tidak crash, alur checkout normal.

---

## Skenario 3 — Error Mapping Split Payment

1. Tambah item ke keranjang.
2. Isi nominal split lalu submit.
3. Trigger backend error `PAYMENT_METHOD_DUPLICATED`.

**Expected:** tampil pesan:
`Metode pembayaran split tidak boleh duplikat. Gunakan kombinasi metode yang berbeda.`

---

## Skenario 4 — Jalur Verifikasi Teknis Frontend

Jalankan:

- `npm run lint --workspace=@barokah/web`
- `npm run typecheck --workspace=@barokah/web`
- `npm run test --workspace=@barokah/web`
- `npm run build --workspace=@barokah/web`

**Expected:** seluruh command lulus.
