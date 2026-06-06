> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Testing | Audience: Pak Zaki, Fajar, Dimas, Fitri, Budi, Arif

# Sprint 10 — UAT Final Checklist

> **Tanggal:** 2 Juni 2026  
> **Status:** **CLOSED** — tervalidasi tanpa blocker  
> **Owner uji:** Fajar (Backend/API), Dimas (Frontend), Arif (Integrasi stub), Fitri (Docs), Budi (Orchestrator)

---

## Scope UAT Final

1. **Void transaksi + audit trail (P0)** — `POST /transactions/:id/void`; kasir wajib approval manager; record `transaction_adjustments` terpisah; stok `VOID_RESTORE`.
2. **Struk digital API** — `GET /transactions/:id/receipt` — payload digital + stub ESC/POS base64.
3. **Refund API (backend)** — `POST /transactions/:id/refund` — RBAC OWNER/MANAGER (UI refund defer).
4. **UI kasir** — post-checkout `ReceiptPanel`, cetak browser, void dari transaksi terakhir + approval manager.
5. **UI admin** — `/dashboard/transactions` — void manager/owner dengan alasan.
6. **Thermal stub** — `buildEscPosStub` + browser print (driver fisik defer Fase 2).
7. **Seed multi-outlet dev** — outlet `MAIN` + `NORTH` untuk UAT picker (carry-over Sprint 9).

---

## Hasil Eksekusi Ringkas

| Area | Hasil | Bukti utama |
|---|---|---|
| Void transaksi non-COMPLETED | ✅ PASS | SCR-V01: validasi status |
| Void + adjustment + audit | ✅ PASS | SCR-V02: adjustment `VOID`, audit `TRANSACTION_VOID` |
| Refund amount > remaining | ✅ PASS | SCR-V03: validasi amount |
| ESC/POS stub base64 | ✅ PASS | SCR-V04: `buildEscPosStub` |
| Receipt outlet scope | ✅ PASS | SCR-V05: 403 di luar scope |
| Receipt digital + escpos | ✅ PASS | SCR-V06: envelope receipt |
| RBAC void kasir + approval | ✅ PASS | Smoke: `transactions void` tanpa role method-level |
| RBAC refund MANAGER/OWNER | ✅ PASS | Smoke: `transactions refund` |
| RBAC receipt kasir allowed | ✅ PASS | Smoke: `getReceipt` tanpa role method |
| UI struk post-checkout | ✅ PASS | `ReceiptPanel.test.tsx` |
| UI void kasir + approval | ✅ PASS | `pos/page.test.tsx` |
| Client API transactions | ✅ PASS | `transactions.test.ts` |
| Thermal print util web | ✅ PASS | `thermal-print.test.ts` |

---

## Bukti Verifikasi Teknis (Re-run Final — 2 Juni 2026)

### API (`@barokah/api`)

- `npm run lint -w @barokah/api` ✅
- `npm run typecheck -w @barokah/api` ✅
- `npm run test -w @barokah/api` ✅ (**54/54** pass, termasuk SCR-V01…SCR-V06 + smoke RBAC void/refund/receipt)
- `npm run build -w @barokah/api` ✅

### Web (`@barokah/web`)

- `npm run lint -w @barokah/web` ✅
- `npm run typecheck -w @barokah/web` ✅
- `npm run test -w @barokah/web` ✅ (**40/40** pass)
- `npm run build -w @barokah/web` ✅ (⚠ warning ESLint plugin Next.js — non-blocking, carry-over Sprint 11)

---

## Checklist UAT Final (Pak Zaki)

- [x] Login **kasir** → `/pos` — checkout → struk otomatis tampil → **Cetak Struk** (browser print).
- [x] **Transaksi Terakhir** di kasir → **Void** → isi alasan + kredensial manager → sukses.
- [x] Login **manager** → `/dashboard/transactions` — void hanya dengan alasan (tanpa kredensial tambahan).
- [x] Struk transaksi void menampilkan **STATUS: VOID**.
- [x] Kasir dapat melihat struk; void/refund API ditolak tanpa approval (403/validasi).
- [x] `GET /transactions/:id/receipt` mengembalikan `digital` + `escpos.payload` (base64).
- [x] Seed 2 outlet (`MAIN`, `NORTH`) — picker multi-cabang di dashboard berfungsi.

---

## Yang Bisa Langsung Dites (Dev)

**Prasyarat:** API port **3000**, web port **3001**, PostgreSQL + seed aktif (`npm run docker:up` + `npm run db:seed`).

| Layar / Endpoint | URL |
|---|---|
| Login | http://localhost:3001/login |
| Kasir | http://localhost:3001/pos |
| Admin transaksi (void/struk) | http://localhost:3001/dashboard/transactions |
| Dashboard owner | http://localhost:3001/dashboard |
| Health API | http://localhost:3000/api/v1/health |
| Receipt | `GET http://localhost:3000/api/v1/transactions/{id}/receipt` |
| Void | `POST http://localhost:3000/api/v1/transactions/{id}/void` |
| Transaksi terbaru | `GET http://localhost:3000/api/v1/transactions/recent` |

**Kredensial seed (dev):**

| Peran | Email | Password |
|-------|-------|----------|
| Owner | `owner@barokah.local` | `Owner123!` |
| Manager | `manager@barokah.local` | `Manager123!` |
| Kasir | `kasir@barokah.local` | `Kasir123!` |

**Flow uji manual singkat (~5 menit):**

1. Login kasir → `/pos` — tambah produk → bayar → pastikan panel struk muncul.
2. Klik **Cetak Struk** → dialog print browser terbuka.
3. Dari **Transaksi Terakhir** → **Void** → alasan + login manager (`manager@barokah.local` / `Manager123!`).
4. Buka struk lagi → status **VOID** terlihat.
5. Logout → login manager → `/dashboard/transactions` → void transaksi lain dengan alasan saja.
6. (Opsional) `curl` dengan token ke `GET .../receipt` — pastikan field `escpos.payload` ada.

---

## Isu Tersisa (Non-Blocking) + Mitigasi

| Isu | Klasifikasi | Mitigasi |
|---|---|---|
| Driver printer Bluetooth/USB fisik | Out of scope Sprint 10 | Sprint 11+ — Arif POC + [THERMAL-ESC-POS.md](../integration/THERMAL-ESC-POS.md) |
| Refund partial UI | Defer | API siap; UI saat prioritas bisnis naik — Dimas |
| Window void 30 menit | Defer post-MVP | Backlog — Rina + Dewi |
| Warning ESLint plugin Next.js saat build web | Non-blocking | Sprint 11 P3 — Dimas + Yoga |
| Build web intermittent cache `.next` | Non-blocking | `Remove-Item -Recurse .next` sebelum build jika ENOENT `_not-found` |

---

## Keputusan

**Sprint 10 UAT final dinyatakan PASS.** Tidak ada blocker untuk penutupan sprint gabungan (backend + frontend). Acceptance criteria plan, progress, dan closure terpenuhi. Handoff Sprint 11 mengikuti [ADR-003](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md) — lihat [SPRINT-10-CLOSURE.md](../sprint/SPRINT-10-CLOSURE.md).
