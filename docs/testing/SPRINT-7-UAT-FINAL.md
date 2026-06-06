> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Fajar, Dimas, Arif, Fitri

# Sprint 7 — UAT Final Checklist

> **Tanggal:** 2 Juni 2026  
> **Status:** **CLOSED** — tervalidasi tanpa blocker  
> **Owner uji:** Fajar (Backend/API), Dimas (Frontend), Arif (Integrasi), Budi (Orchestrator)

---

## Scope UAT Final

1. Outlet-level bundle policy (aktivasi/nonaktif per outlet) + validasi tenant/outlet.
2. Reliability checkout bundle (override outlet → fallback tenant-level).
3. Gateway-level error mapping dasar pada split payment (`GW_*` → `ErrorCodes`).
4. Sinkron UI kasir: metadata policy bundle + pesan error split payment.
5. Idempotensi `clientRequestId` pada checkout (regresi Sprint 6).

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|---|---|---|
| Outlet bundle policy API | ✅ PASS | Test API: `upsertProductBundleOutletPolicy` menolak outlet non-tenant |
| Checkout bundle + outlet override | ✅ PASS | Test API: `isActive=false` → deduction stok langsung ke SKU bundle |
| Gateway error mapping | ✅ PASS | Test API: `GW_TIMEOUT` → `PAYMENT_TIMEOUT` |
| UI policy bundle di `/pos` | ✅ PASS | Test web: render policy outlet/tenant + ringkasan sinkron |
| Error split payment di UI | ✅ PASS | Test web: `PAYMENT_METHOD_DUPLICATED` → pesan operasional |
| Idempoten checkout | ✅ PASS | Test API: replay `clientRequestId` return transaksi existing |

---

## Bukti Verifikasi Teknis (Re-run Final)

### Prisma / Database

- `npm run db:generate` ✅ (setelah hentikan proses `node.exe` dari `C:\Program Files\nodejs\` yang mengunci `query_engine-windows.dll.node`)

### API (`@barokah/api`)

- `npm run lint --workspace=@barokah/api` ✅
- `npm run typecheck --workspace=@barokah/api` ✅
- `npm run test --workspace=@barokah/api` ✅ (33/33 pass)
- `npm run build --workspace=@barokah/api` ✅

### Web (`@barokah/web`)

- `npm run lint --workspace=@barokah/web` ✅
- `npm run typecheck --workspace=@barokah/web` ✅
- `npm run test --workspace=@barokah/web` ✅ (19/19 pass)
- `npm run build --workspace=@barokah/web` ✅

---

## Checklist UAT Final (Pak Zaki)

- [x] Policy bundle outlet bisa di-set via API dan dibaca di `GET /bundles`.
- [x] Checkout bundle menghormati policy outlet (`isActive=false` → tidak pecah ke komponen).
- [x] Split payment memetakan referensi `GW_TIMEOUT` ke error `PAYMENT_TIMEOUT`.
- [x] Halaman kasir menampilkan label policy outlet/tenant tanpa crash saat metadata kosong.
- [x] Pesan error split payment duplikat tampil jelas di UI.
- [x] Replay `clientRequestId` tidak membuat transaksi ganda.

---

## Yang Bisa Langsung Dites (Dev)

**Prasyarat:** API di port **3000**, web di port **3001**, PostgreSQL + seed aktif.

| Layar / Endpoint | URL |
|---|---|
| Login | http://localhost:3001/login |
| Kasir (policy bundle UI) | http://localhost:3001/pos |
| Master Produk | http://localhost:3001/master/products |
| Health API | http://localhost:3000/api/v1/health |
| Set outlet policy | `POST http://localhost:3000/api/v1/products/bundles/outlet-policy` |
| List bundles + policy | `GET http://localhost:3000/api/v1/products/bundles` |
| Checkout split (gateway simulasi) | `POST http://localhost:3000/api/v1/transactions/checkout-split` |

**Kredensial seed (dev):** `kasir@barokah.local` / `Kasir123!`

**Flow uji manual singkat:**

1. Buat bundle tenant-level (`POST /products/bundles`).
2. Set policy outlet `isActive=false` (`POST /products/bundles/outlet-policy`).
3. Login kasir → buka `/pos` → verifikasi kartu bundle menampilkan scope outlet + behavior.
4. Checkout split SKU bundle → stok bundle langsung berkurang (bukan komponen).
5. Ulang checkout dengan `clientRequestId` sama → transaksi tidak duplikat.
6. Trigger referensi non-cash `GW_TIMEOUT` → UI/API mengembalikan `PAYMENT_TIMEOUT`.

Checklist ringan frontend: [SPRINT-7-FRONTEND-E2E-LITE.md](./SPRINT-7-FRONTEND-E2E-LITE.md).

---

## Isu Tersisa (Non-Blocking) + Mitigasi

| Isu | Klasifikasi | Mitigasi |
|---|---|---|
| E2E browser automation lintas app penuh belum aktif | Non-blocking | Prioritas Sprint 8: 1 suite Playwright/Cypress untuk flow bundle + split |
| Gateway mapping masih dasar (`GW_*` prefix), belum adaptor Midtrans nyata | Non-blocking | Arif spec adaptor → Fajar wiring; uji sandbox terpisah |
| `db:generate` EPERM jika API/dev server masih jalan | Operasional | Hentikan proses Node dev sebelum generate (lihat closure Sprint 7) |
| Warning Next.js ESLint plugin saat build web | Non-blocking | Rapikan `eslint.config` + plugin Next di Sprint 8 |
