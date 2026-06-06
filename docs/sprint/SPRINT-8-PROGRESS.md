> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint | Audience: Pak Zaki, Hendra, Fajar, Dimas, Fitri

# Sprint 8 — Progress Report (Gabungan)

> **Tanggal update:** 2 Juni 2026 (UAT final + verifikasi re-run)  
> **Status sprint:** **CLOSED**  
> **Orchestrator:** Budi Santoso (CEO)  
> **Referensi:** [SPRINT-8-PLAN.md](../requirements/SPRINT-8-PLAN.md), [SPRINT-8-UAT-FINAL.md](../testing/SPRINT-8-UAT-FINAL.md), [SPRINT-7-CLOSURE.md](./SPRINT-7-CLOSURE.md)

---

## Status Ringkas

| Jalur | Progress | Status |
|-------|----------|--------|
| Backend / Integrasi (reports API) | 100% | **CLOSED** |
| Frontend / UX (dashboard admin) | 100% | **CLOSED** |
| Dokumentasi Sprint 8 | 100% | **CLOSED** |

- **Progress Sprint 8 gabungan:** **100%** (MVP dashboard + laporan harian)
- **Scope aman:** retail bahan bangunan, no F&B (ADR-003)

---

## Deliverables Backend (Fajar)

- Modul `apps/api/src/modules/reports/`
- `GET /api/v1/reports/daily` — omzet, transaksi, void/refund, payment mix
- `GET /api/v1/reports/dashboard` — pulse + shift aktif
- `GET /api/v1/reports/payment-mix`, `GET /api/v1/reports/shifts`
- RBAC: OWNER/MANAGER only
- Test: SCR-R01, SCR-R02, RBAC smoke

---

## Deliverables Frontend (Dimas)

### 1) Layout admin `/dashboard`

- Sidebar navigasi (hijau Barokah, @barokah/ui)
- Nav: Ringkasan, Produk, Kategori, Kasir, Buka Shift
- Header tenant + peran + Keluar

### 2) Widget laporan harian

- Omzet (`grossOmzet`), jumlah transaksi, rata-rata per transaksi
- Komposisi pembayaran (`paymentMix` + progress bar)
- Filter tanggal, Muat ulang
- Integrasi `GET /reports/daily` + fallback mock + banner jika API gagal

### 3) RBAC login & guard

- OWNER/MANAGER → `/dashboard` setelah login
- CASHIER → `/pos`
- Kasir akses `/dashboard` → redirect `/pos`

### 4) Test frontend baru

- `rbac.test.ts`, `dashboard/page.test.tsx`, `login/page.test.tsx`

---

## URL Uji (dev)

| Halaman | URL | Kredensial |
|---------|-----|------------|
| Login | http://localhost:3001/login | — |
| Dashboard | http://localhost:3001/dashboard | `owner@barokah.local` / `Owner123!` |
| Dashboard (Manager) | http://localhost:3001/dashboard | `manager@barokah.local` / `Manager123!` |
| Kasir | http://localhost:3001/pos | `kasir@barokah.local` / `Kasir123!` |

**Prasyarat:** API `:3000` + web `:3001` (`npm run dev` di monorepo).

---

## UAT Final

- Checklist: [SPRINT-8-UAT-FINAL.md](../testing/SPRINT-8-UAT-FINAL.md) — **PASS**, tanpa blocker
- Perbaikan minor saat re-run: argumen `fetchDailyReport({ date })` di `dashboard/page.tsx` (typecheck web)

## Hasil Verifikasi (Re-run Final)

| Command | API | Web |
|---------|-----|-----|
| lint | ✅ | ✅ |
| typecheck | ✅ | ✅ |
| test | ✅ **39/39** | ✅ **26/26** |
| build | ✅ | ✅ |

---

## Risiko Tersisa

1. Halaman `/master/*` belum dibungkus shell dashboard (nav sidebar tetap link keluar).
2. Owner multi-outlet: perlu `outletId` eksplisit jika >1 cabang (seed dev: 1 outlet).
3. Warning ESLint plugin Next.js saat build (non-blocking, carry-over).

---

## File Utama Frontend

| File | Fungsi |
|------|--------|
| `apps/web/src/app/dashboard/layout.tsx` | Auth + RBAC gate |
| `apps/web/src/app/dashboard/page.tsx` | Widget laporan |
| `apps/web/src/components/dashboard/DashboardShell.tsx` | Layout + nav |
| `apps/web/src/lib/reports.ts` | Client API daily report |
| `apps/web/src/lib/rbac.ts` | Redirect post-login |
