> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Fajar, Fitri, QA Internal

# Sprint 2 Backend Smoke Test (Auth/Master/Shift)

## Tujuan

Memastikan endpoint utama Sprint 2 tetap sehat untuk alur login, master data, dan shift conflict resolution (SCR-S02) setelah perubahan backend.

## Prasyarat

- API berjalan di `http://localhost:3001/api/v1`
- Seed data tenant demo tersedia
- Akun uji:
  - `manager@barokah.test`
  - `cashier@barokah.test`

## Test Case Terstruktur

### 1) Auth Smoke

- `POST /auth/login` (manager) -> `200`, token terbit
- `GET /auth/me` (manager token) -> `200`, payload role `MANAGER`
- `GET /auth/me` (tanpa token) -> `401`, code `UNAUTHORIZED`

### 2) Master Data Smoke (manager)

- `POST /categories` -> `201`, kategori baru terbentuk
- `POST /products` -> `201`, produk baru terbentuk
- `GET /products/grid?categoryId={id}` -> `200`, data terfilter benar
- `PATCH /categories/:id` -> `200`, nama berubah
- `DELETE /products/:id` -> `200`, soft-delete/hapus sukses

### 3) Shift Smoke (SCR-S02)

- `POST /shifts/open` (cashier) -> `201`, shift aktif dibuat
- `POST /shifts/open` kedua (cashier sama, outlet sama) -> `409`, code `SHIFT_ALREADY_OPEN`
- `POST /shifts/{shiftId}/force-close` oleh cashier -> `403`, code `INSUFFICIENT_PERMISSION`
- `POST /shifts/{shiftId}/force-close` oleh manager -> `201`, `forceClosed: true`
- `POST /shifts/{shiftId}/force-close` ulang -> `409`, code `SHIFT_ALREADY_CLOSED`

## Kriteria Lulus

- Semua endpoint di atas memberi HTTP status dan error code sesuai ekspektasi.
- Tidak ada response yang keluar dari format envelope API standar.
- Tidak ada perubahan scope di luar auth/master/shift.
