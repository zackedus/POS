# Bugs & Gaps Audit — 6 Juni 2026

> **Tim:** Citra (QA), Fajar (Backend), Dimas (Frontend), Budi (Orchestrator)  
> **Scope:** Automated checks + code review area berisiko (multi-unit, auth, storefront, offline PWA, margin, seed) + cross-ref docs  
> **Pemilik:** Pak Zaki — laporan via CEO Budi

---

## Ringkasan Eksekutif

| Metrik | Jumlah |
|--------|--------|
| **P0** | 0 |
| **P1** | 1 |
| **P2** | 9 |
| **Deferred / known** | 8 |
| **Test coverage gaps** | 6 |

### Hasil Automated Checks (6 Jun 2026 — re-run audit)

| Perintah | Hasil | Detail |
|----------|-------|--------|
| `npm run test -w @barokah/shared` | ✅ PASS | **45/45** |
| `npm run test -w @barokah/api` | ✅ PASS | **127/127** (+4 hold/recall multi-unit) |
| `npm run test -w @barokah/web` | ✅ PASS | **102/102** (+3 recall/offline hold multi-unit) |
| `npm run typecheck` | ✅ PASS | 9/9 tasks turbo |
| `npm run lint` | ✅ PASS* | *Setelah quick fix AUD-LINT-01 (eslint rule comment di `ProductFormWizard.tsx`) |

**Delta vs Sprint 16 UAT doc:** API 117→123 (+6 multi-unit checkout), Web 97→99 (+2), Shared test suite baru 45.

---

## Temuan — Confirmed Bugs & Gaps

| ID | Severity | Area | Description | Repro steps | Suggested fix | Owner lane |
|----|----------|------|-------------|-------------|---------------|------------|
| **AUD-MU-01** | ~~**P0**~~ **FIXED** | Multi-unit / Hold | Hold transaksi **roll/dus** salah harga & satuan — **fixed 6 Jun**: migrasi `sellUnitId`/`sellUnitSymbol` di `HeldTransactionItem`; persist di hold; recall kembalikan satuan jual + harga paket. | — | ✅ Fixed — migration `20260606180000_held_item_sell_unit`, API + frontend recall restore. | Fajar + Dimas |
| **AUD-MU-02** | ~~**P1**~~ **FIXED** | Multi-unit / Recall | Recall stock check tanpa konversi base — **fixed 6 Jun**: `convertToBaseQuantity` pada pre-check recall. | — | ✅ Fixed | Fajar |
| **AUD-MU-03** | **P1** | Multi-unit / Offline PWA | Antrean offline hold payload typed `sellUnitId?` — verifikasi E2E manual masih backlog. | Hold offline dengan item satuan roll → online sync → total hold server benar. | Payload + sync test assert `sellUnitId` (**fixed 6 Jun**); manual UAT masih perlu. | Dimas + Citra |
| **AUD-MU-04** | ~~**P1**~~ **FIXED** | Margin warning | `validateCart`/`computeMarginWarnings` pakai harga paket roll/dus via `resolveSellUnitPrice` + `derivePurchaseCostFromBaseCost`. | — | ✅ Fixed | Fajar + Eko |
| **AUD-MU-05** | ~~**P1**~~ **FIXED** | Test coverage | Test API hold/recall multi-unit + web `recall-cart.test.ts`. | — | ✅ Fixed — `transactions.service.test.ts` + `recall-cart.test.ts` | Citra + Fajar |
| **AUD-WIZ-01** | **P2** | ProductFormWizard | `useEffect` multi-unit defaults tidak memuat `ensureMultiUnitDefaults` di dependency array → edge case re-default saat kategori berubah setelah unit dipilih manual. | Edit produk: ganti kategori dari Besi → Atap setelah unit manual → konversi belum refresh. | `useCallback` untuk `ensureMultiUnitDefaults` atau reset eksplisit on category change. | Dimas |
| **AUD-AUTH-01** | **P2** | Auth / Middleware | Middleware hanya guard `/dashboard/*` & `/master/*`. `/pos`, `/shift/*` tidak di middleware — auth hanya client-side `fetchMe` + redirect. | Buka `/pos` tanpa cookie → shell sempat render sebelum redirect. | Tambah `/pos`, `/shift` ke `PROTECTED_PREFIXES` atau shared auth layout server check. | Dimas |
| **AUD-AUTH-02** | **P2** | Auth security | JWT di `localStorage` + cookie presence `=1` (bukan httpOnly). XSS bisa exfiltrate token. | — | Defer prod migration httpOnly (Sprint 16 UAT); hardening CSP + sanitize input interim. | Fajar + Dimas + Yoga |
| **AUD-AUTH-03** | **P2** | RBAC | Middleware tidak validasi role — kasir bisa akses URL `/master/products` HTML (API write tetap 403). | Login kasir → navigasi manual ke `/master/products`. | Role-aware middleware atau layout guard selain `not-found`. | Dimas |
| **AUD-STORE-01** | **P2** | Storefront UX | Checkout/cart masih pakai `alert()` untuk validasi & error (bukan inline banner). | Submit checkout kosong → browser alert. | Ganti ke AlertBanner/`mapApiError` pattern (known K3 FULL-APP-QA). | Bima |
| **AUD-STORE-02** | **P2** | Online orders | Midtrans live sandbox, payment expired auto-cancel, CAPTCHA guest — belum ada. | — | Backlog Sprint 17+ per FEATURE-BACKLOG & Sprint 16 defer. | Arif + Fajar |
| **AUD-OFF-01** | **P2** | Offline PWA | Recall hold offline (`RECALL_HOLD` sync) belum diverifikasi manual multi-unit; processor conflict path ada test tapi tanpa sellUnit. | — | Manual UAT + extend `sync.s12.test.ts`. | Citra |
| **AUD-ERR-01** | **P2** | Error handling | Beberapa halaman dashboard masih `err.message` langsung (`inventory/page.tsx`) — belum `toUserFacingError`/`mapApiError`. | Matikan API → buka inventory. | Migrasi ke utilitas terpusat (known K2 FULL-APP-QA). | Bima |
| **AUD-SEED-01** | **P2** | Seed data | `PKU-2IN` & `SNG-GAL` konfigurasi multi-unit **konsisten** dengan `PRODUCT-UNIT-VARIANT-MODEL.md` (18k/kg, 45k/m, konversi 20 & 50). Semua produk seed dapat stok flat **100 base unit** — realistis untuk dev, tidak mensimulasikan PO receive chain. | — | Opsional: seed stok seng 100 m + PO sample receive di seed script. | Fajar |
| **AUD-LINT-01** | **P2** | CI / Lint | `eslint-disable-next-line react-hooks/exhaustive-deps` di `ProductFormWizard.tsx` gagal karena rule plugin tidak terdaftar di ESLint flat config web. | `npm run lint` → error rule not found. | **FIXED 6 Jun** — hapus directive invalid. | Dimas |

---

## Deferred / Known (Referensi Saja)

| ID | Item | Ref |
|----|------|-----|
| DEF-01 | Midtrans sandbox Snap live | Sprint 16 UAT — keputusan Pak Zaki mock-only |
| DEF-02 | Socket.io `online-order:paid` real-time | Sprint 16 defer → polling 15s + toast |
| DEF-03 | httpOnly cookie production | Sprint 16 UAT defer |
| DEF-04 | E2E middleware redirect tanpa cookie | Sprint 16 UAT defer |
| DEF-05 | CAPTCHA guest checkout | FEATURE-BACKLOG P1 |
| DEF-06 | Payment expired auto-cancel job | FEATURE-BACKLOG backlog |
| DEF-07 | `npm run build -w @barokah/web` flaky Windows path spasi | FULL-APP-QA-AUDIT K1 |
| DEF-08 | Mobile app halaman tidak diaudit web scope | FULL-APP-QA-AUDIT K6 |

---

## Test Coverage Gaps

| ID | Area | Gap | Rekomendasi |
|----|------|-----|-------------|
| TC-GAP-01 | Hold/recall multi-unit | ~~Tidak ada test roll/dus hold + recall~~ | ✅ API + web tests added 6 Jun |
| TC-GAP-02 | Margin multi-unit paket | ~~`validateCart` test hanya base price~~ | ✅ Test roll below package cost added |
| TC-GAP-03 | Offline hold multi-unit | ~~`offline-hold-sync.test.ts` tidak assert sellUnitId~~ | ✅ Extended 6 Jun |
| TC-GAP-04 | Middleware RBAC | Tidak ada E2E redirect role | Playwright Sprint 17 |
| TC-GAP-05 | Storefront E2E delivery | Unit test only | Manual smoke checklist Sprint 16 sudah ada |
| TC-GAP-06 | `@barokah/shared` | 45 tests baru — belum tercantum di Sprint 16 UAT counts | Update docs INDEX |

---

## Quick Fixes Diterapkan (6 Jun 2026)

| Fix | File | Impact |
|-----|------|--------|
| Hapus eslint directive invalid | `ProductFormWizard.tsx` | `npm run lint` monorepo PASS |
| Hold kirim `sellUnitId` | `pos/page.tsx` → `mapCartItemsForCheckout` | Hold online/API pricing benar untuk roll/dus |
| DB persist + recall sell unit | migration `20260606180000_held_item_sell_unit`, `transactions.service.ts`, `recall-cart.ts` | Hold/recall end-to-end roll/dus (**AUD-MU-01/02 FIXED**) |
| Margin paket roll/dus | `transactions.service.ts` `computeMarginWarnings` | Warning margin untuk satuan paket (**AUD-MU-04 FIXED**) |

---

## Cross-Reference Docs

| Dokumen | Status vs kode |
|---------|----------------|
| `FULL-APP-QA-AUDIT-2026.md` | Test counts outdated (107 API → 123); lint status outdated (gagal sebelum fix AUD-LINT-01) |
| `SPRINT-16-UAT-FINAL.md` | CLOSED valid; defer Midtrans/Socket.io masih akurat; test counts perlu refresh |
| `PRODUCT-UNIT-VARIANT-MODEL.md` | Seed PKU-2IN/SNG-GAL align; hold/recall belum implement penuh model multi-unit |
| `FEATURE-BACKLOG.md` | Midtrans live, Socket.io, CAPTCHA masih backlog — match defer |

---

## Area Verified OK (Evidence)

| Area | Status | Bukti |
|------|--------|-------|
| Checkout POS multi-unit (meter/kg/roll/dus) | ✅ | `transactions.service.test.ts` seng + paku tests |
| PO receive multi-unit | ✅ | `suppliers.service.test.ts` dus→kg, roll→m |
| Pricing wizard base unit + preview | ✅ | `ProductFormWizard.test.tsx` 18/18, `@barokah/shared` pricing tests |
| costPrice hidden from cashier | ✅ | `catalog.service.test.ts` listProducts + grid tanpa costPrice |
| Storefront delivery + rate limit 429 | ✅ | `storefront.service.test.ts`, `storefront-rate-limit.guard.test.ts`, `api.test.ts` |
| Midtrans mock flow | ✅ | `midtrans.service.test.ts`, `online-orders.service.test.ts` |
| Offline checkout queue | ✅ | `page.offline.test.tsx`, `offline-sync.test.ts` |
| RBAC API smoke | ✅ | `rbac.smoke.test.ts` |
| Hold idempotency clientRequestId | ✅ | `transactions.service.test.ts`, `sync.s12.test.ts` |

---

## Sign-off Audit

| Role | Nama | Keputusan |
|------|------|-----------|
| QA | Citra Lestari | P0 hold/recall multi-unit **FIXED**; automated suite hijau post-fix |
| Backend | Fajar Ramadhan | Migrasi + recall stock check + margin paket **DONE** |
| Frontend | Dimas Pratama | Recall restore cart via `mapRecallItemsToCart` **DONE** |
| CEO | Budi Santoso | AUD-MU-01/02/04/05 closed; AUD-MU-03 manual UAT backlog |

*Disusun: Citra Lestari · 6 Juni 2026 · Re-run automated + code review*
