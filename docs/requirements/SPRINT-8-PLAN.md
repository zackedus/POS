> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Fitri

# Sprint 8 Plan — Laporan Harian & Dashboard Owner (Backend + Integrasi)

> **Periode:** 2 Juni 2026  
> **Status:** **CLOSED** (backend + frontend + UAT final, 2 Juni 2026)  
> **Owner jalur backend:** Fajar (Backend/API) · **Owner jalur frontend:** Dimas (Senior Frontend)  
> **Carry-over sumber:** [SPRINT-7-CLOSURE.md](../sprint/SPRINT-7-CLOSURE.md)  
> **Scope produk:** Retail bahan bangunan — **no F&B** (ADR-003)

---

## Tujuan Sprint 8

Menyediakan **financial pulse** untuk owner/manager: laporan penjualan harian (omzet, jumlah transaksi, payment mix), API dashboard operasional, dan ringkasan shift — sebagai fondasi admin dashboard web (jalur frontend paralel Dimas).

---

## Scope In

1. Modul `reports` di `apps/api` — agregasi transaksi `COMPLETED` per hari kalender WIB.
2. Endpoint laporan harian + payment mix + dashboard owner/manager.
3. RBAC: **OWNER** dan **MANAGER** saja; tenant/outlet scope wajib.
4. Ringkasan shift per hari (opsional, endpoint terpisah + disertakan di dashboard).
5. DTO validasi, error envelope standar, test backend kritikal.
6. Dokumentasi sprint (plan, progress, closure).

## Scope Out

- UI admin dashboard Next.js (owner Dimas — parallel setelah kontrak API freeze).
- Laba kotor conditional (`cost_price`) — defer jika data master belum lengkap.
- Export PDF/Excel terjadwal, real-time Socket.io dashboard.
- Multi-outlet konsolidasi lintas cabang (Fase 2).

---

## Deliverables Teknis (Backend)

| Endpoint | Deskripsi |
|----------|-----------|
| `GET /api/v1/reports/daily` | Omzet kotor/neto, jumlah transaksi, void/refund, payment mix |
| `GET /api/v1/reports/payment-mix` | Payment mix saja (subset daily) |
| `GET /api/v1/reports/dashboard` | Pulse harian + shift aktif + ringkasan shift |
| `GET /api/v1/reports/shifts` | Ringkasan shift per hari |

**Query params:** `outletId` (wajib jika user punya >1 outlet), `date` (`YYYY-MM-DD`, default hari ini WIB).

---

## Acceptance Criteria

- [x] Hanya OWNER/MANAGER yang dapat mengakses semua endpoint reports (403 untuk CASHIER).
- [x] Outlet wajib milik tenant JWT; manager terbatas `outletIds`.
- [x] Agregasi memakai transaksi `COMPLETED` dengan `completedAt` dalam rentang hari WIB.
- [x] Payment mix mencakup metode aktif: CASH, TRANSFER, QRIS, E_WALLET, CARD.
- [x] Void/refund dihitung dari `transaction_adjustments` pada hari yang sama.
- [x] `@barokah/api` lolos lint, typecheck, test, build.

---

## Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| `completedAt` null pada transaksi lama | Medium | Filter `COMPLETED` + dokumentasi; seed/dev data isi `completedAt` |
| Owner multi-outlet tanpa `outletId` | Low | `resolveOutletId` mengembalikan 400 INVALID_INPUT |
| Frontend dashboard belum ada | Medium | API dashboard siap consume; handoff ke Dimas |

---

## Handoff

| From | To | Task |
|------|-----|------|
| Fajar | Dimas | Implement halaman dashboard owner — consume `GET /reports/dashboard` |
| Fajar | Fitri | API docs reports di indeks dokumentasi |
| Budi | Pak Zaki | Review UAT final — [SPRINT-8-UAT-FINAL.md](../testing/SPRINT-8-UAT-FINAL.md) |
| Fitri | INDEX | Entri Sprint 8 plan, progress, closure, UAT final |
