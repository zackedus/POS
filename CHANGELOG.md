# Changelog

Semua perubahan penting pada Barokah Core POS dicatat di file ini.

Format mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) dan Semantic Versioning.

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
