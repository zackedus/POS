# Business Logic E2E Verification — 6 Juni 2026

> 📚 [Indeks Dokumentasi](../INDEX.md) | Auditor: **Rina** · **Eko** · **Citra**

Verifikasi alur bisnis kritis toko bahan bangunan — **expected vs actual** via code review + automated tests.

| Field | Nilai |
|-------|-------|
| **Tanggal** | 7 Juni 2026 (re-verify parallel pass) |
| **Metode** | Code review layanan inti + regresi `npm run lint && npm run typecheck && npm run test` |
| **Baseline** | Commit `73c2686` (loyalty redeem + PPN UI) · `a67bd88` (smoke:staging fix) |

---

## Ringkasan

| Hasil | Jumlah |
|-------|--------|
| **PASS** | 13 |
| **FAIL** | 0 |
| **PARTIAL** | 0 |

**Automated tests:** **417/417 PASS** (api 196 · shared 78 · web 142 — 7 Jun 2026 re-run)

---

## Tabel Verifikasi E2E

| # | Alur Bisnis | Expected | Actual | Status | Test / Bukti |
|---|-------------|----------|--------|--------|--------------|
| 1 | **Login RBAC** (owner/manager/kasir) | JWT + refresh; RolesGuard per route; tenant/outlet scope | `auth.service.test`, `rbac-endpoints.smoke` — OWNER/MANAGER/KASIR route matrix | **PASS** | API auth + RBAC smoke |
| 2 | **Buka shift → jual walk-in** (simple, multi-unit dus/kg, variant, bundle) | Shift wajib; multi-unit base qty deduct; variant price; bundle atomic | `transactions.service.test`, `shifts.service.test`, bundle tests | **PASS** | API transactions + catalog |
| 3 | **Promo + PPN + split + QRIS mock** | Satu promo terbaik; PPN exclusive after discount; split total = trx total; QRIS mock | `promo-calculator.test`, `tax-calculator.test`, `qris-payment.service.test` | **PASS** | Shared + API payment |
| 4 | **Hold/recall multi-unit** | TTL enforced; sellUnit preserved on recall | `transactions.service.test` hold/recall | **PASS** | API hold TTL |
| 5 | **Void → stock restore** | Manager RBAC; base qty restored via adjustments | SCR-V01/V02 void tests | **PASS** | API void |
| 6 | **Tutup shift → kas reconciliation** | expectedCash = opening + cashSales; held warning | `shifts.service.test`, Phase 8 regression | **PASS** | API shifts |
| 7 | **PO: order → terima → HPP weighted → retur partial** | DRAFT→ORDERED→receive; weighted avg; return cap | `purchase-orders.service.test`, BL-09-01 | **PASS** | API PO |
| 8 | **Transfer stok antar cabang** | Atomik TRANSFER_OUT/IN | `inventory.service.test` | **PASS** | API inventory |
| 9 | **Opname scan SKU** | Lookup barcode + qty adjust skip if same | inventory page + lookup API tests | **PASS** | Web + API |
| 10 | **Import CSV produk baru** | Template + row errors + optional stock | `catalog.service.test`, `product-csv-import.test` | **PASS** | API + shared |
| 11 | **Online order mock pay → stok deduct → fulfill** | PAID deduct once; COMPLETED no double deduct | `online-orders.service.test`, Fase2 audit | **PASS** | API online |
| 12 | **Loyalty earn on transaction** | 1 poin/10k net; preview POS; persist on checkout | `loyalty-points.test`, `customers.service.test` | **PASS** | Shared + API |
| 13 | **Customer link POS + storefront** | Walk-in optional; storefront wajib phone; shared Customer model | `customers.service.test`, `storefront.service.test` | **PASS** | API customers |

---

## Perbaikan Saat Pass Ini

| Issue | Fix |
|-------|-----|
| POS UI total tanpa PPN saat tenant PPN aktif | `computePosTax` di `pos/page.tsx` + breakdown di `PosCartPanel` |
| Loyalty redeem defer | MVP redeem: 1 poin = Rp 1.000, maks 50%, saldo guard |
| BXGY belum ada | UI admin: "coming soon" + workaround diskon persen ~9% |
| Smoke dev DX | `npm run smoke:dev` — auto-detect API port 3000/3010 |

## Re-verify Parallel Pass (7 Jun 2026)

| Lane | Owner | Hasil |
|------|-------|-------|
| A — 13 E2E flows | Rina · Eko · Citra | **13/13 PASS** — tidak ada regresi baru |
| B — PosCartPanel | Dimas | UI breakdown = `computePosTax` + checkout payload (promo + poin + PPN) |
| C — Storefront | Dimas · Bima | Tax `TAX_RATE` sinkron API `storefront.service`; phone wajib checkout |
| D — Regression | Citra | lint + typecheck + test **417/417 PASS** |
| E — smoke:dev | Yoga | Script baru `scripts/smoke-dev.ps1` |

---

## Defer (Jujur)

| Item | Alasan |
|------|--------|
| Fase 3 enterprise | Out of scope permanen sprint ini |
| Midtrans live keys | Butuh credential Pak Zaki |
| Thermal printer produksi | WebUSB stub; PDF fallback OK |
| EDC hardware | Integrasi Arif defer |
| WA blast real API | Stub dokumentasi |
| BXGY engine native | Workaround persen; engine defer |

---

## Handoff

| From | To | Next |
|------|-----|------|
| Citra · QA | Pak Zaki | Manual UAT pilot checklist |
| Fitri · Docs | — | Audit scores Fase 1 ≥98%, Fase 2 ≥95% |
