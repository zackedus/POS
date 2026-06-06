# Changelog

Semua perubahan penting pada Barokah Core POS dicatat di file ini.

Format mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) dan Semantic Versioning.

## [1.0.0-beta-fase2-gap] - 2026-06-07

### Added
- **Import CSV produk:** `POST /products/import`, template download, laporan error per baris, stok awal opsional.
- **Fuzzy search:** normalized token ILIKE + barcode di katalog master, grid kasir, dan inventory.
- **Loyalty earn MVP:** 1 poin per Rp 10.000 (configurable), preview di POS, halaman `/dashboard/customers`.
- **Promo terjadwal:** validasi `startsAt`/`endsAt`, UI jadwal admin, auto-hide expired di POS dropdown.
- **Opname digital:** scan SKU/barcode quick-add, input qty mobile-friendly.
- **Stock alert:** export CSV stok rendah + tombol di dashboard.

### Docs
- `docs/sprint/FASE1-2-GAP-CLOSE.md`
- Audit scores updated: Fase 1 **95%**, Fase 2 **93%**

## [1.0.0-beta-fase2] - 2026-06-07

### Added
- **Customer MVP:** model `Customer` (name, phone, points stub) — link POS walk-in + storefront checkout.
- **Online sync:** realtime `stock:changed` on PAID + fulfillment COMPLETED; audit doc Fase 2.
- **Promo Phase 2:** anti-stack test (`pickBestPromo` single best discount).
- **Staging:** `docker/docker-compose.staging.yml`, `.env.staging.example`, `npm run smoke:staging`.
- **Integration:** Midtrans sandbox E2E + ngrok guide; `QrisProvider` interface; SMTP nodemailer + fallback.
- **QA:** `docs/testing/FASE2-REGRESSION-2026-06.md`, Playwright `e2e/fase2-online-order.spec.ts`.

### Docs
- `docs/domain/BUSINESS-LOGIC-AUDIT-FASE2-2026-06.md`
- `docs/sprint/FASE2-PROGRESS.md`
- `docs/integration/MIDTRANS-SANDBOX-E2E.md`

## [1.0.0-rc1] - 2026-06-06

### Added
- **QRIS MVP:** `POST/GET /transactions/qris/*` — static mock QR + polling + web modal + mobile API.
- **Mobile offline:** AsyncStorage queue checkout/hold + sync on reconnect.
- **Email analytics:** Weekly CSV report scheduler + toggle **Kirim laporan mingguan** di Settings.
- **Production hardening:** CSP headers (Next.js prod), startup guardrails Midtrans/JWT/SMTP.
- **MVP sign-off:** `docs/testing/MVP-RELEASE-SIGNOFF-2026-06.md` — Fase 1 COMPLETE.

### Docs
- `docs/integration/QRIS-PHASE-10.md`
- `docs/standards/PRODUCTION-DEPLOYMENT.md`
- `docs/domain/BUSINESS-LOGIC-AUDIT-2026-06.md` Phase 10

## [0.9.0] - 2026-06-06

### Added
- **HPP weighted average:** Partial PO receive memperbarui `costPrice` dengan rata-rata tertimbang stok (bukan overwrite terakhir).
- **Offline sync:** Modal konflik Bahasa Indonesia dengan aksi *Terima data server* / *Coba ulang (data lokal)*.
- **Mobile:** Layar buka/tutup shift + state aman SecureStore; tombol QRIS stub jujur (coming soon).
- **Midtrans live:** Kunci tenant per outlet + verifikasi webhook ketat di mode produksi; mock jika belum ada key.
- **Thermal:** Builder ESC/POS dari struk transaksi + cetak WebUSB production path.
- **Analytics:** `GET /reports/analytics/export/scheduled?preset=week` + tombol **Export minggu ini** di dashboard.

### Fixed
- HPP partial receive sebelumnya hanya memakai harga receive terakhir (`BL-09-01`).

### Docs
- `docs/domain/BUSINESS-LOGIC-AUDIT-2026-06.md` Phase 9
- `docs/testing/PHASE-9-UAT-FINAL.md`
- `docs/integration/MIDTRANS-LIVE-PRODUCTION.md`

## [0.8.0] - 2026-06-06

### Added
- **PPN checkout:** PPN 11% (exclusive) diterapkan di kasir saat pengaturan tenant aktif.
- **Multi-outlet:** Widget dashboard **Stok Cabang Lain** + API `GET /reports/cross-outlet-stock`.
- **Midtrans:** Tombol uji koneksi sandbox di Settings + endpoint health webhook.
- **Mobile:** Keranjang sederhana + checkout tunai di app Expo (shift aktif diperlukan).
- **Offline PWA:** Test otomatis hold multi-unit (AUD-MU-03).
- **Thermal:** Stub WebUSB connect + cetak preview ESC/POS.

### Fixed
- Checkout POS sebelumnya selalu `tax: 0` meski PPN aktif di pengaturan tenant.
- Preview tutup shift kini menampilkan jumlah hold bill aktif.

### Docs
- `docs/domain/BUSINESS-LOGIC-AUDIT-2026-06.md` Phase 8
- `docs/testing/PHASE-8-REGRESSION.md`, `PHASE-8-UAT-FINAL.md`

## [0.2.0] - 2026-06-02

### Added
- Backend automated test minimal untuk flow SCR-S02 di `apps/api/src/modules/shifts/shifts.service.test.ts`.
- Script test backend `apps/api` untuk menjalankan suite otomatis via Node test runner + `tsx`.
- Dokumen smoke test terstruktur untuk endpoint `auth/master/shift` di `docs/testing/SPRINT-2-BACKEND-SMOKE.md`.
- Test backend baru untuk auth error path di `apps/api/src/modules/auth/auth.service.test.ts`.
- Smoke test RBAC endpoint penting di `apps/api/src/modules/rbac-endpoints.smoke.test.ts`.
- Dokumen penutupan Sprint 2 di `docs/sprint/SPRINT-2-CLOSURE.md`.

### Changed
- Progress Sprint 2 diperbarui dengan status backend test/docs lanjutan.
- Sprint 2 plan disinkronkan dengan item test/docs backend.
- Hardening service `force-close` shift agar hanya `MANAGER/OWNER` yang dapat mengeksekusi walau dipanggil di luar layer controller.
