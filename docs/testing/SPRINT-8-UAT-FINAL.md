> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Fajar, Dimas, Fitri, Budi

# Sprint 8 — UAT Final Checklist

> **Tanggal:** 2 Juni 2026  
> **Status:** **CLOSED** — tervalidasi tanpa blocker  
> **Owner uji:** Fajar (Backend/API), Dimas (Frontend), Fitri (Docs), Budi (Orchestrator)

---

## Scope UAT Final

1. Dashboard admin `/dashboard` untuk **OWNER** dan **MANAGER** (layout, navigasi, copy Bahasa Indonesia).
2. RBAC login & guard: owner/manager → dashboard; kasir → `/pos`; kasir akses `/dashboard` → redirect.
3. Modul reports API — 4 endpoint, agregasi harian WIB, RBAC OWNER/MANAGER only.
4. Widget laporan harian di dashboard: omzet, jumlah transaksi, rata-rata, payment mix, filter tanggal + Muat ulang.

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|---|---|---|
| Reports API (SCR-R01/R02) | ✅ PASS | Test API: agregasi omzet, payment mix, dashboard pulse, shift summaries |
| RBAC reports (403 CASHIER) | ✅ PASS | Smoke RBAC class-level `ReportsController` |
| Dashboard widgets (API data) | ✅ PASS | Test web: omzet, transaksi, payment mix dari `fetchDailyReport` |
| Mock fallback + banner | ✅ PASS | Test web: banner saat `source: mock` |
| RBAC redirect post-login | ✅ PASS | Test `rbac.test.ts`: OWNER/MANAGER → `/dashboard`, CASHIER → `/pos` |
| Kasir guard `/dashboard` | ✅ PASS | `dashboard/layout.tsx` → `router.replace('/pos')` jika `!canAccessDashboard` |
| Filter tanggal + reload | ✅ PASS | Test web: panggil `fetchDailyReport({ date })` saat tanggal berubah |

---

## Bukti Verifikasi Teknis (Re-run Final — 2 Juni 2026)

### API (`@barokah/api`)

- `npm run lint --workspace=@barokah/api` ✅
- `npm run typecheck --workspace=@barokah/api` ✅
- `npm run test --workspace=@barokah/api` ✅ (**39/39** pass, termasuk SCR-R01, SCR-R02, RBAC reports)
- `npm run build --workspace=@barokah/api` ✅

### Web (`@barokah/web`)

- `npm run lint --workspace=@barokah/web` ✅
- `npm run typecheck --workspace=@barokah/web` ✅ (perbaikan argumen `fetchDailyReport({ date })`)
- `npm run test --workspace=@barokah/web` ✅ (**26/26** pass)
- `npm run build --workspace=@barokah/web` ✅ (warning ESLint plugin Next.js — non-blocking, carry-over)

---

## Checklist UAT Final (Pak Zaki)

- [x] Login **owner** → masuk `/dashboard`, widget omzet & transaksi tampil.
- [x] Login **manager** → masuk `/dashboard` (sama seperti owner untuk ringkasan harian).
- [x] Login **kasir** → masuk `/pos` (bukan dashboard).
- [x] Kasir buka `/dashboard` langsung → redirect ke `/pos`.
- [x] Ubah tanggal di dashboard → **Muat ulang** → memanggil API `GET /reports/daily?date=YYYY-MM-DD`.
- [x] Payment mix ditampilkan dengan label Bahasa Indonesia (Tunai, QRIS, dll.).
- [x] Endpoint reports menolak role CASHIER (403) — diverifikasi otomatis di test API.

---

## Yang Bisa Langsung Dites (Dev)

**Prasyarat:** API port **3000**, web port **3001**, PostgreSQL + seed aktif (`npm run docker:up` + `npm run db:seed`).

| Layar / Endpoint | URL |
|---|---|
| Login | http://localhost:3001/login |
| Dashboard (Owner) | http://localhost:3001/dashboard |
| Dashboard (Manager) | http://localhost:3001/dashboard |
| Kasir | http://localhost:3001/pos |
| Health API | http://localhost:3000/api/v1/health |
| Laporan harian | `GET http://localhost:3000/api/v1/reports/daily?date=YYYY-MM-DD` |
| Dashboard pulse | `GET http://localhost:3000/api/v1/reports/dashboard?date=YYYY-MM-DD` |
| Payment mix | `GET http://localhost:3000/api/v1/reports/payment-mix?date=YYYY-MM-DD` |
| Ringkasan shift | `GET http://localhost:3000/api/v1/reports/shifts?date=YYYY-MM-DD` |

**Kredensial seed (dev):**

| Peran | Email | Password |
|-------|-------|----------|
| Owner | `owner@barokah.local` | `Owner123!` |
| Manager | `manager@barokah.local` | `Manager123!` |
| Kasir | `kasir@barokah.local` | `Kasir123!` |

**Flow uji manual singkat (5 menit):**

1. Login owner → pastikan `/dashboard` menampilkan omzet, jumlah transaksi, dan komposisi pembayaran.
2. Ubah tanggal → klik **Muat ulang** → data mengikuti tanggal (atau nol jika belum ada transaksi).
3. Logout → login kasir → pastikan langsung ke `/pos`.
4. Sebagai kasir, ketik URL `/dashboard` → harus kembali ke `/pos`.
5. (Opsional) `curl` dengan token owner ke `GET /reports/daily` → envelope `{ success, data }` valid.

---

## Isu Tersisa (Non-Blocking) + Mitigasi

| Isu | Klasifikasi | Mitigasi |
|---|---|---|
| Halaman `/master/*` belum dalam shell dashboard | Non-blocking | Sprint 9 P1: bungkus layout — Dimas + Maya |
| Owner multi-outlet butuh `outletId` eksplisit | Non-blocking | Sprint 9 P2: picker outlet — Dimas + Fajar |
| Export PDF/Excel laporan | Out of scope Sprint 8 | Sprint 9+ backlog — Fajar + Fitri |
| Warning ESLint plugin Next.js saat build web | Non-blocking | Carry-over Sprint 7 — Dimas + Yoga |

---

## Keputusan

**Sprint 8 UAT final dinyatakan PASS.** Tidak ada blocker untuk penutupan sprint; seluruh acceptance criteria plan dan progress report terpenuhi.
