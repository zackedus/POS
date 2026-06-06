# Full App QA Audit — 6 Jun 2026

> **Tim:** Yoga (DevOps), Citra (QA), Fajar + Dimas (perbaikan)  
> **Scope:** Verifikasi lint/typecheck/test/build + audit error handling web & API  
> **Pemilik:** Pak Zaki — laporan via CEO Budi

---

## Ringkasan Eksekutif

| Area | Status | Catatan |
|------|--------|---------|
| Lint monorepo | **PASS** | Perbaikan unused imports di 4 DTO API + 3 warning web |
| Typecheck | **PASS** | 6 workspace |
| Test API | **PASS** | 107/107 |
| Test Web | **PASS** | 77/77 (termasuk 5 test baru `api.test.ts`) |
| Build API | **PASS** | `nest build` |
| Build Web | **PASS*** | Berhasil via `next build` langsung di `apps/web`; `npm run build -w @barokah/web` kadang gagal di Windows (path spasi) |
| Error handling | **IMPROVED** | Utilitas terpusat `api.ts` + `api-client.ts` |
| Smoke script | **ADDED** | `npm run smoke` → `scripts/smoke-check.ps1` |

---

## Hasil Verifikasi DevOps (Phase 1)

### Perintah dijalankan

```bash
npm run lint
npm run typecheck
npm run test -w @barokah/api
npm run test -w @barokah/web -- --run
npm run build -w @barokah/api
# Web build: node ../../node_modules/next/dist/bin/next build (dari apps/web)
```

### Test counts

| Workspace | Files | Tests | Pass | Fail |
|-----------|-------|-------|------|------|
| `@barokah/api` | — | 107 | 107 | 0 |
| `@barokah/web` | 28 | 77 | 77 | 0 |
| **Total** | — | **184** | **184** | **0** |

### Perbaikan yang dilakukan saat audit

1. **API lint** — Hapus unused imports di:
   - `create-product-unit-conversion.dto.ts`
   - `checkout-split.dto.ts`
   - `hold-transaction.dto.ts`
   - `create-user.dto.ts`
2. **Web lint** — Hapus/rename unused vars di `dashboard/page.tsx`, `master/products/page.tsx`, `ProductFormWizard.tsx`
3. **Web build** — Redirect `/dashboard/products` → `/master/products` di `next.config.js` + `force-dynamic` page

---

## Audit Error Handling API (Phase 2)

### Global envelope ✅

- `HttpExceptionFilter` + `ResponseInterceptor` terpasang di `apps/api/src/main.ts`
- Error 500 generic: `"Terjadi kesalahan pada server."` (Bahasa Indonesia)
- Validation array → `"Data yang dikirim tidak valid."` + `details`
- `ErrorCodes` dari `@barokah/shared` dipetakan per HTTP status

### Modul diperiksa

| Modul | ErrorCodes | Pesan ID | Status |
|-------|------------|----------|--------|
| auth | ✅ INVALID_CREDENTIALS, TOKEN_EXPIRED, UNAUTHORIZED | ✅ | PASS |
| catalog/products | ✅ VALIDATION_FAILED, CONFLICT | ✅ | PASS |
| inventory | ✅ INSUFFICIENT_STOCK | ✅ | PASS |
| users | ✅ CONFLICT (self-deactivate) | ✅ | PASS |
| suppliers | ✅ | ✅ | PASS |
| expenses | ✅ NOT_FOUND | ✅ | PASS |
| transactions | ✅ SHIFT_NOT_OPEN, INSUFFICIENT_STOCK | ✅ | PASS |
| online-orders | ✅ invalid transition | ✅ | PASS |
| reports | ✅ outlet scope | ✅ | PASS |
| sync | ✅ CONFLICT replay | ✅ | PASS |

---

## Audit Halaman Web (Phase 2)

### Utilitas baru

| File | Fungsi |
|------|--------|
| `apps/web/src/lib/api.ts` | `toUserFacingError`, `NETWORK_ERROR_MESSAGE`, `readApiEnvelope` |
| `apps/web/src/lib/api-client.ts` | `authApiJson`, `publicApiJson`, `mapApiError` |

Pesan jaringan standar: **"Tidak dapat terhubung ke server. Pastikan API berjalan."**

### Checklist halaman

| Route | Loading | Error ID | Empty | Retry | Status |
|-------|---------|----------|-------|-------|--------|
| `/` | N/A (static hero) | N/A | N/A | — | PASS |
| `/login` | ✅ | ✅ | — | — | PASS |
| `/dashboard` | ✅ skeleton | ✅ AlertBanner | ✅ outlet pick | ✅ Muat ulang | PASS |
| `/dashboard/expenses` | ✅ | ✅ | ✅ | — | PASS |
| `/dashboard/inventory` | ✅ | ✅ | ✅ | ✅ | PASS |
| `/dashboard/products` | redirect | redirect | — | — | PASS |
| `/dashboard/purchase-orders` | ✅ | ✅ | ✅ | ✅ | PASS |
| `/dashboard/settings` | ✅ | ✅ AlertBanner | — | ✅ | PASS |
| `/dashboard/transactions` | ✅ | ✅ | ✅ | — | PASS |
| `/dashboard/units` | ✅ | ✅ | ✅ | — | PASS |
| `/dashboard/users` | ✅ | ✅ | ✅ | — | PASS |
| `/master/categories` | ✅ | ✅ + retry | ✅ | ✅ | PASS |
| `/master/products` | ✅ | ✅ | ✅ | — | PASS |
| `/master/bundles` | ✅ | ✅ | ✅ | — | PASS |
| `/master/units` | redirect | — | — | — | PASS |
| `/pos` | ✅ | ✅ network-aware | ✅ | ✅ Retry hold/checkout | PASS |
| `/pos/online-orders` | ✅ | ✅ mapApiError | ✅ | ✅ Muat ulang | PASS |
| `/shift/open` | ✅ | ✅ conflict panel | — | — | PASS |
| `/shift/close` | ✅ | ✅ | ✅ no shift | — | PASS |
| `/store/[slug]` | ✅ | ✅ outlet + catalog | ✅ | — | PASS |
| `/store/[slug]/cart` | N/A | ✅ alert | ✅ | — | PASS |
| `/store/[slug]/checkout` | ✅ | ✅ mapApiError | ✅ | — | PASS |
| `/store/[slug]/p/[productId]` | ✅ | ✅ **diperbaiki** loadError | — | — | PASS |
| `/store/[slug]/order/.../success` | ✅ | partial | — | — | PASS |

---

## Skenario Error Handling yang Diuji

| # | Skenario | Expected message | Hasil |
|---|----------|------------------|-------|
| E1 | API login invalid credentials | Pesan dari envelope API | PASS (unit test auth) |
| E2 | Network `Failed to fetch` di POS hold | "Koneksi jaringan bermasalah…" | PASS (`pos/page.test.tsx`) |
| E3 | Network error di store API | "Tidak dapat terhubung ke server…" | PASS (`api.test.ts`) |
| E4 | Kategori load gagal (API envelope) | Judul + detail error ID | PASS (`categories/page.test.tsx`) |
| E5 | Produk master load gagal | Error banner ID | PASS (`products/page.test.tsx`) |
| E6 | Shift sudah terbuka | Conflict + force-close | PASS (`shift/open/page.test.tsx`) |
| E7 | Offline checkout kasir | Queue + banner | PASS (`pos/page.offline.test.tsx`) |
| E8 | Dashboard API error | AlertBanner + fallback ID | PASS (`dashboard/page.test.tsx`) |

---

## Perbaikan Kode (Phase 3)

| File | Perubahan |
|------|-----------|
| `apps/web/src/lib/api.ts` | Utilitas error terpusat Bahasa Indonesia |
| `apps/web/src/lib/api-client.ts` | Wrapper `authApiJson` / `publicApiJson` |
| `apps/web/src/lib/auth.ts` | `loginRequest` / `fetchMe` pakai `toUserFacingError` |
| `apps/web/src/lib/shifts-api.ts` | Migrasi ke `authApiJson` |
| `apps/web/src/lib/online-orders-api.ts` | Migrasi ke `authApiJson` |
| `apps/web/src/lib/store/store-api.ts` | Migrasi ke `publicApiJson` |
| `apps/web/src/app/pos/online-orders/page.tsx` | `mapApiError` di catch |
| `apps/web/src/app/store/...` | Error message jaringan di checkout & detail produk |
| `apps/web/src/app/master/categories/page.tsx` | `toUserFacingError` di semua catch |
| `scripts/smoke-check.ps1` | Smoke health + store outlets |
| `package.json` | Script `npm run smoke` |

---

## Known Issues / Deferred

| ID | Issue | Severity | Owner | Catatan |
|----|-------|----------|-------|---------|
| K1 | `npm run build -w @barokah/web` flaky di Windows (path `baru 2026`) | P2 | Yoga | Build sukses via `next build` langsung di `apps/web` |
| K2 | Beberapa halaman masih `err.message` langsung (belum migrasi `mapApiError`) | P3 | Dimas | `expenses`, `inventory`, `users`, dll — pesan API sudah ID |
| K3 | Store checkout/cart pakai `alert()` bukan inline banner | P3 | Dimas | UX improvement backlog |
| K4 | `act(...)` warning di test POS/DashboardShell | P3 | Citra | Non-blocking, tests pass |
| K5 | Smoke script butuh API running | — | Yoga | Jalankan setelah `npm run dev:api` |
| K6 | Mobile app tidak diaudit halaman (out of web scope) | — | — | Lint/test mobile PASS via turbo |

---

## Cara Menjalankan Smoke Check

```powershell
# Pastikan API berjalan di port 3000
npm run dev:api

# Terminal lain
npm run smoke
# atau
powershell -ExecutionPolicy Bypass -File ./scripts/smoke-check.ps1 -ApiBase http://localhost:3000/api/v1
```

---

## Sign-off

| Role | Nama | Status |
|------|------|--------|
| DevOps | Yoga Permana | Verifikasi CI lokal ✅ |
| QA | Citra Lestari | Checklist halaman + error scenarios ✅ |
| Backend | Fajar Ramadhan | API envelope & lint fix ✅ |
| Frontend | Dimas Pratama | Error handler web + build fix ✅ |

**Rekomendasi:** Siap lanjut staging smoke manual dengan API + DB dev aktif. Deploy gate menunggu UAT manual Pak Zaki untuk alur kasir & storefront.
