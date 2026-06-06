> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Arif, Dimas, Fitri

# Sprint 10 Plan — Void, Struk Digital & Thermal Stub (Backend + Integrasi)

> **Periode:** 2 Juni 2026  
> **Status:** **CLOSED** (gabungan backend + frontend) → [SPRINT-10-CLOSURE.md](../sprint/SPRINT-10-CLOSURE.md) · UAT [SPRINT-10-UAT-FINAL.md](../testing/SPRINT-10-UAT-FINAL.md)  
> **Owner backend:** Fajar (Backend/API)  
> **Owner frontend:** Dimas (Web)  
> **Owner integrasi:** Arif (spec ESC/POS)  
> **Carry-over:** [SPRINT-9-CLOSURE.md](../sprint/SPRINT-9-CLOSURE.md)  
> **Scope produk:** Retail bahan bangunan — **no F&B** (ADR-003)

---

## Tujuan Sprint 10 (Jalur Backend + Integrasi)

1. **Void transaksi + audit trail (P0)** — approval manager/owner, record terpisah di `transaction_adjustments`, header transaksi tidak diubah (item/payment immutable); status header → `VOID`; stok dikembalikan via `VOID_RESTORE`.
2. **Struk digital API** — `GET` receipt data untuk transaksi selesai + stub ESC/POS base64 untuk integrasi thermal.
3. **Refund parsial/penuh (P0)** — record `REFUND`, refund penuh mengembalikan stok; parsial tidak mengubah stok.
4. **Dev multi-outlet** — seed cabang `MAIN` + `NORTH` untuk UAT picker.

---

## Scope In (Backend)

| # | Deliverable |
|---|-------------|
| 1 | `POST /api/v1/transactions/:id/void` — manager/owner langsung; kasir + kredensial manager |
| 2 | `POST /api/v1/transactions/:id/refund` — RBAC OWNER/MANAGER, body `amount` + `reason` |
| 3 | `GET /api/v1/transactions/:id/receipt` — digital receipt + `escpos` stub |
| 4 | Audit log `TRANSACTION_VOID` / `TRANSACTION_REFUND` |
| 5 | Test SCR-V01 … SCR-V06 + RBAC smoke |
| 6 | Spec integrasi [THERMAL-ESC-POS.md](../integration/THERMAL-ESC-POS.md) |
| 7 | Seed 2 outlet dev |

## Scope Out (Sprint 10)

- UI kasir void/refund modal (Dimas — sprint paralel frontend jika approved Maya).
- Driver printer Bluetooth/USB production (Arif POC Fase 2).
- Struk WA/email otomatis.

---

## Acceptance Criteria

- [x] Void hanya pada transaksi `COMPLETED` tanpa adjustment sebelumnya.
- [x] Void membuat `transaction_adjustments` type `VOID`, status `VOID`, stok `VOID_RESTORE`, audit log.
- [x] Refund parsial: adjustment `REFUND`, status tetap `COMPLETED` sampai refund penuh.
- [x] Refund penuh: status `REFUNDED` + stok dikembalikan.
- [x] Kasir dapat `GET` receipt; void/refund ditolak untuk kasir (403).
- [x] `@barokah/api` lint, typecheck, test (**54/54**), build lulus.
- [x] `@barokah/web` lint, typecheck, test (**40/40**), build lulus.
- [x] UAT final Pak Zaki — [SPRINT-10-UAT-FINAL.md](../testing/SPRINT-10-UAT-FINAL.md) **PASS**.
- [x] Frontend trigger post-checkout + void modal (Dimas).

---

## Handoff

| From | To | Task |
|------|-----|------|
| Fajar | Dimas | Konsumsi `GET /transactions/:id/receipt` setelah checkout |
| Arif | Dimas | Wire stub ESC/POS ke flow cetak (Fase 2 driver) |
| Fajar | Fitri | Changelog + indeks setelah CLOSURE |
