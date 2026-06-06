# Web Completion — Progress Pass 4 (Phase 4 Parallel)

> **Tanggal:** 6 Juni 2026  
> **Plan:** [WEB-COMPLETION-PLAN.md](./WEB-COMPLETION-PLAN.md)  
> **Phase:** 4 Pass 1 — **DONE** (lanes A–F paralel)  
> **Owner:** Dimas (web) · Fajar (API) · Eko (promo algo) · Fitri (docs)

---

## Ringkasan Pass

| Lane | Deliverable | Status |
|------|-------------|--------|
| **A** | Promo apply di POS checkout + validate API | ✅ Done |
| **B** | Storefront `/store/[slug]/orders` cek status | ✅ Done |
| **C** | httpOnly auth production + middleware + RBAC flash fix | ✅ Done |
| **D** | Expired online orders job + filter + label Kedaluwarsa | ✅ Done |
| **E** | Dashboard `mapApiError` + konsistensi UX | ✅ Done |
| **F** | Docs INDEX + UAT checklist Phase 4 | ✅ Done |

---

## Backend (Fajar + Eko)

| Endpoint / Module | Change |
|-------------------|--------|
| `GET /promotions/active` | Promo aktif untuk kasir |
| `POST /promotions/validate` | Validasi diskon keranjang |
| `checkout-cash` / `checkout-split` | Field `promoRuleId`, diskon di `transaction.discount` |
| `packages/shared` `promo-calculator` | Algoritma percent/fixed, pick best promo |
| `POST /online-orders/maintenance/expire-pending` | Mark PENDING_PAYMENT → EXPIRED |
| Prisma | `OnlineOrderStatus.EXPIRED` migration |

---

## Frontend (Dimas)

| File / Route | Change |
|--------------|--------|
| `/pos` | Dropdown promo, subtotal/diskon/total, kirim `promoRuleId` |
| `/store/[slug]/orders` | Cek status pesanan (orderNo + HP) |
| `StoreHeader` | Link "Pesanan Saya" |
| `/api/auth/login|refresh|logout` | httpOnly cookies (production path) |
| `/api/proxy/[...path]` | BFF authenticated requests |
| Dashboard pages | `mapApiError` inventory, expenses, outlets, promotions, analytics, PO |

---

## Migrations

| Migration | Status |
|-----------|--------|
| `20260606230000_tenant_settings` | Pending user-side apply |
| `20260606140000_online_order_expired_status` | New — EXPIRED enum |

---

## Test Results (Pass 4)

| Suite | Result |
|-------|--------|
| `@barokah/api` | ✅ 159/159 |
| `@barokah/web` | ✅ 130/130 |
| `typecheck` | ✅ |
| `lint` | ✅ |

---

*Pass 4 closed: Dimas + Fajar + tim · 6 Juni 2026*

---

## Phase 6 — Dev Health + CI + Mobile + E2E (PASS 6 — DONE)

> **Tanggal:** 6 Juni 2026  
> **Koordinasi:** Budi · Lane owners: Yoga (A/B), Dimas (C/D), Fajar (E honeypot), Fitri (docs)

| Lane | Deliverable | Status |
|------|-------------|--------|
| **A** | `db:migrate:deploy` OK, seed OK, lint/test/build/smoke pass | ✅ Done |
| **B** | CI trigger `master` + README badge & CI/deploy section | ✅ Done |
| **C** | Mobile login screen + README status Phase 2 | ✅ Done |
| **D** | Playwright smoke 3 path (`e2e/smoke.spec.ts`) | ✅ Done |
| **E** | Storefront honeypot checkout + export filename range | ✅ Done |

### Lane A — Dev environment

- `npm run db:migrate:deploy` — 16 migrations, no pending
- `npm run db:seed` — OK (no FK reset needed)
- `npm run lint && typecheck && test && build` — pass
- `npm run smoke` — health 200

### Lane B — CI

- `.github/workflows/ci.yml` — branches: `main`, `master`, `develop`
- README CI badge + testing/deploy docs

### Lane C — Mobile MVP

- `apps/mobile/app/login.tsx` — POST auth API
- `apps/mobile/README.md` — honest Phase 2 scope

### Lane D — E2E

- `playwright.config.ts` + `e2e/smoke.spec.ts`
- Scripts: `npm run test:e2e`, `test:e2e:install`

### Lane E — Quick wins

- Guest checkout honeypot field `website` (API reject if filled)
- Dashboard export: CSV/PDF filename + message for date range

### Test Results (Pass 6)

| Suite | Result |
|-------|--------|
| `@barokah/api` | ✅ (incl. honeypot test) |
| `@barokah/web` | ✅ 137+ |
| `lint` / `typecheck` / `build` | ✅ |
| `smoke` | ✅ |
| Playwright e2e | ✅ 3/3 (local, dev stack) |

*Pass 6 closed: Budi + tim · 6 Juni 2026*

---

## Phase 7 — Business Audit + CI E2E + Mobile + Integrasi (PASS 7 — DONE)

> **Tanggal:** 6 Juni 2026  
> **Koordinasi:** Budi · Lanes A–F paralel setelah Pass 6

| Lane | Deliverable | Status |
|------|-------------|--------|
| **A** | Business logic audit 9 flows + fix BL-07-01 (`validateCart` varian) | ✅ Done |
| **B** | Playwright job CI + PostgreSQL service + seed | ✅ Done |
| **C** | Mobile `expo-secure-store` + product grid read-only | ✅ Done |
| **D** | Midtrans mode tests + thermal ESC/POS preview + WebUSB stub doc | ✅ Done |
| **E** | Analytics export CSV margin + UAT final + MVP production-ready | ✅ Done |
| **F** | httpOnly auth production path doc | ✅ Done |

### Lane A — Business logic audit

- Dokumen: `docs/domain/BUSINESS-LOGIC-AUDIT-2026-06.md` — 9/9 PASS
- Fix P1: `validateCart` menolak parent `hasVariants`
- Tests baru: variant SKU price, promo discount checkout

### Lane B — Playwright CI

- Job `playwright-e2e` di `.github/workflows/ci.yml`
- PG service + migrate + seed + API/Web start + smoke 3 path

### Lane C — Mobile

- `expo-secure-store` session persist
- `/pos` daftar produk API + link web kasir
- README Phase 7 updated

### Lane D — Integrasi

- `renderEscPosPreview` + `formatWebUsbIntegrationHint`
- Settings test production Midtrans mode
- `THERMAL-PRINT-MVP-STUB.md` WebUSB section

### Lane E — Analytics + UAT

- `GET /reports/analytics/export` CSV margin kategori
- UI tombol **Ekspor CSV Margin** di `/dashboard/analytics`
- `docs/testing/WEB-PHASE-7-UAT-FINAL.md` PASS

### Lane F — httpOnly

- `docs/testing/HTTPONLY-AUTH-PRODUCTION.md`

### Test Results (Pass 7)

| Suite | Result |
|-------|--------|
| `@barokah/shared` | ✅ |
| `@barokah/api` | ✅ (audit + analytics export + settings) |
| `@barokah/web` | ✅ (thermal + analytics) |
| `lint` / `typecheck` / `build` | ✅ |
| Playwright e2e | ✅ 3/3 |

### Web MVP status

**Production-ready** untuk pilot toko bahan bangunan (web kasir + dashboard + storefront mock pay).

### Defer Phase 8

- Mobile offline kasir penuh + sync queue
- Midtrans live credentials (Pak Zaki)
- Thermal hardware driver production
- CSP hardening + weighted average HPP
- Scheduled analytics email export

*Pass 7 closed: Budi + tim · 6 Juni 2026*

---

## Phase 8 — Parallel Lanes A–G (PASS 8 — DONE)

> **Tanggal:** 6 Juni 2026  
> **Koordinasi:** Budi · Lanes A–G paralel

| Lane | Deliverable | Status |
|------|-------------|--------|
| **A** | Business logic deep audit 9 edge flows + fix BL-08-02 PPN checkout | ✅ Done |
| **B** | Offline PWA polish — AUD-MU-03 hold multi-unit test, sync banner | ✅ Done |
| **C** | Mobile kasir MVP — cart + checkout cash + secure session | ✅ Done |
| **D** | Multi-outlet stock view API + dashboard widget + socket `stock:changed` | ✅ Done |
| **E** | Midtrans test connection UI + webhook health GET | ✅ Done |
| **F** | Playwright phase8 regression + `PHASE-8-REGRESSION.md` | ✅ Done |
| **G** | INDEX/CHANGELOG/UAT Phase 8 + progress COMPLETE | ✅ Done |

### Lane A highlights

- `docs/domain/BUSINESS-LOGIC-AUDIT-2026-06.md` Phase 8 section
- PPN checkout fix via `computePosTax`
- Tests: split+promo+multi-unit, void multi-unit restore, shift held count

### Lane B highlights

- `offline-hold-sync.test.ts` AUD-MU-03 automated
- `OfflineBanner` + `useOfflinePos` sync indicator (existing, verified)
- `pwa-register.ts` skip dev SW (verified)

### Lane C highlights

- `apps/mobile/app/pos.tsx` — keranjang + checkout cash API
- README Phase 8 honest scope

### Lane D highlights

- `GET /reports/cross-outlet-stock`
- Dashboard widget **Stok Cabang Lain**
- `RealtimeService.emitStockChanged` foundation

### Lane E highlights

- `POST /settings/tenant/midtrans/test`
- `GET /webhooks/midtrans/online/health`
- WebUSB connect stub + `printEscPosWebUsbStub`

### Lane F highlights

- `e2e/phase8-regression.spec.ts`
- `docs/testing/PHASE-8-REGRESSION.md`

### Lane G highlights

- `docs/testing/PHASE-8-UAT-FINAL.md`
- CHANGELOG Phase 8 user-facing notes

### Test Results (Pass 8)

| Suite | Result |
|-------|--------|
| `@barokah/shared` | ✅ (tax-calculator) |
| `@barokah/api` | ✅ (PPN, shift held, cross-outlet, midtrans) |
| `@barokah/web` | ✅ (offline hold, thermal, dashboard widget) |
| `lint` / `typecheck` / `build` | ✅ |
| Playwright e2e | ✅ smoke + phase8 (best effort) |

### Defer Phase 9

- Midtrans live credentials (Pak Zaki)
- Thermal hardware production driver
- Full offline conflict auto-merge
- Mobile native shift + QRIS
- Weighted average HPP

*Pass 8 closed: Budi + tim · 6 Juni 2026*
