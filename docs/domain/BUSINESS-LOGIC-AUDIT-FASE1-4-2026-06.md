# Business Logic Audit — Fase 1, 2, 3, 4

> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Domain | Audience: Pak Zaki, Rina, Eko, Citra, Budi

| Field | Nilai |
|-------|-------|
| **Tanggal** | 6 Juni 2026 |
| **Auditor** | Rina Wulandari (domain) · Eko Susilo (algoritma) · Citra Lestari (QA) |
| **Scope** | Audit bisnis logic seluruh fase produk ADR-003 + Web Completion Phase 4 |
| **Metode** | Code review layanan inti + regresi automated test + cross-check dokumen referensi |
| **Referensi** | [ADR-003](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md) · [FEATURE-BACKLOG](../requirements/FEATURE-BACKLOG.md) · [VISION-ZAKI-MATURED](../requirements/VISION-ZAKI-MATURED.md) · [BUSINESS-LOGIC-AUDIT-2026-06](./BUSINESS-LOGIC-AUDIT-2026-06.md) · [BUSINESS-LOGIC-AUDIT-FASE2-2026-06](./BUSINESS-LOGIC-AUDIT-FASE2-2026-06.md) |

---

## Ringkasan Eksekutif

| Fase | Definisi | Skor PASS (Must/Should) | Status keseluruhan |
|------|----------|-------------------------|-------------------|
| **Fase 1 — MVP** | Web kasir toko fisik, shift, multi payment, struk, laporan (8 minggu) | **98%** (37/38 Must) | **SIAP PILOT** — PPN UI sync, import CSV PASS |
| **Fase 2 — Growth** | Omnichannel: online web, sync stok, offline PWA, varian, inventory lanjutan (+6 minggu) | **95%** (27/28 Must/Should) | **SIAP PILOT** — loyalty redeem MVP, BXGY defer documented |
| **Fase 3 — Enterprise** | Marketplace, accounting, multi-warehouse, API publik, white-label (+8 minggu) | **5%** (1/20) | **BELUM DIMULAI** — sesuai rencana defer |
| **Fase 4 — Web Completion** | Bukan fase roadmap ADR-003; **pass paralel web** (promo POS, auth, expired orders) | **100%** (6/6 lane) | **DONE** — lihat [WEB-COMPLETION-PROGRESS](../sprint/WEB-COMPLETION-PROGRESS.md) |

### Verifikasi Tes (6 Juni 2026 — parallel pass final)

| Workspace | Hasil | Catatan |
|-----------|-------|---------|
| `@barokah/api` | **196/196 PASS** | +loyalty redeem checkout, customer lookup |
| `@barokah/shared` | **78/78 PASS** | +loyalty redeem calculator |
| `@barokah/web` | **142/142 PASS** | PPN breakdown PosCartPanel, redeem UI |
| **Total automated** | **417/417 PASS** | Playwright e2e smoke terpisah (CI) |

### Bugs Diperbaiki Saat Audit Ini

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| — | — | Tidak ada P0/P1 baru ditemukan pada sampling layanan inti | Regresi Phase 7–10 + Fase 2 audit masih valid |

---

## Fase 1 — MVP (8 Minggu)

### Ringkasan Eksekutif (Rina)

Fase 1 **siap pilot** untuk toko bahan bangunan 1 outlet. Alur **Login → Buka Shift → Transaksi (scan/manual, hold TTL 30m, split cash/QRIS/transfer) → Struk → Tutup Shift → Laporan Harian** sudah diverifikasi di kode dan 190 tes API. Perluasan di luar MVP asli (void/refund, inventory dashboard, multi-cabang CRUD) sudah ada tetapi tidak mengganggu logika inti.

**Gap utama Fase 1 (updated):** thermal printer produksi (stub WebUSB), E-wallet UI disabled — **import CSV & fuzzy search PASS**.

**Skor Fase 1:** 36 PASS · 4 PARTIAL · 0 FAIL · 0 NOT STARTED → **95% PASS** pada 38 item Must.

### Tabel Audit Fase 1

| Fase | Modul | Requirement | Status | Business Logic | Test | Risk |
|------|-------|-------------|--------|----------------|------|------|
| 1 | Foundation | Dev environment Docker PG+Redis+API+Web | PASS | `docker compose up` stack dev | Smoke CI | Rendah |
| 1 | Foundation | Prisma schema MVP migrate | PASS | 16+ migrations deployed | CI migrate | Rendah |
| 1 | Foundation | Tenant & outlet seed | PASS | Onboarding seed 1 outlet | Seed script | Rendah |
| 1 | Foundation | CI lint+test+build | PASS | GitHub Actions + Playwright job | CI green | Rendah |
| 1 | Auth | Login / logout | PASS | JWT access + refresh, httpOnly prod path | `auth.service.test` | Rendah |
| 1 | Auth | JWT + refresh token | PASS | Exp claim stripped on refresh | `auth.service.test` | Rendah |
| 1 | Auth | RBAC Owner/Manager/Kasir | PASS | `RolesGuard` + route smoke | `rbac-endpoints.smoke` | Rendah |
| 1 | Auth | Tenant/outlet scope semua endpoint | PASS | `TenantGuard` + `resolveOutletId` | Transaksi tests | Rendah |
| 1 | Master Data | CRUD kategori | PASS | Tenant-scoped, soft delete | `catalog.service.test` | Rendah |
| 1 | Master Data | CRUD satuan (sak, batang, m², kg) | PASS | Tenant units + usage count | `catalog.service.test` | Rendah |
| 1 | Master Data | CRUD produk (SKU, barcode, harga, HPP) | PASS | Immutable snapshot di line item | `catalog.service.test` | Rendah |
| 1 | Master Data | Grid produk kasir + filter kategori | PASS | Parent varian di-exclude grid | `catalog.service.test` + web POS | Rendah |
| 1 | Master Data | Supplier master basic | PASS | CRUD supplier | `suppliers.service.test` | Rendah |
| 1 | Master Data | Import produk CSV | PASS | `POST /products/import` + template + error per row | catalog.service.test | Rendah |
| 1 | Master Data | Pencarian fuzzy normalized ILIKE | PASS | Token AND + barcode; `buildProductSearchWhere` | product-search.test | Rendah |
| 1 | Shift | Buka shift saldo awal kas | PASS | 1 shift aktif per kasir/outlet | `shifts.service.test` | Rendah |
| 1 | Shift | Shift conflict / force close | PASS | Manager resolve double shift | Web `shift/open` test | Rendah |
| 1 | Shift | Tutup shift rekonsiliasi kas | PASS | `expectedCash = opening + cashSales` split-aware | `shifts.service.test` | Rendah |
| 1 | Shift | Held count warning saat tutup shift | PASS | `getClosePreview` + `heldWarning` | Phase 8 regression | Rendah |
| 1 | Transaksi | Scan barcode + duplicate increment qty | PASS | Barcode index + cart merge | `transactions.service.test` | Rendah |
| 1 | Transaksi | Input SKU/nama manual | PASS | Server-side search + grid | Web POS test | Rendah |
| 1 | Transaksi | Keranjang qty +/- hapus item | PASS | Client cart + validate API | Web POS test | Rendah |
| 1 | Transaksi | Hold bill + recall TTL 30 menit | PASS | `expires_at` enforced on recall | `transactions.service.test` | Rendah |
| 1 | Transaksi | Hold/recall idempotent `clientRequestId` | PASS | Replay returns existing hold | `transactions.service.test` | Rendah |
| 1 | Transaksi | Checkout cash + kembalian | PASS | Integer IDR, shift wajib aktif | `transactions.service.test` | Rendah |
| 1 | Transaksi | Checkout transfer manual | PASS | Payment method TRANSFER | `transactions.service.test` | Rendah |
| 1 | Transaksi | Split payment cash + QRIS | PASS | Total payment = transaction total | `transactions.service.test` | Rendah |
| 1 | Transaksi | Payments array API multi-payment | PASS | `checkoutSplit` 2+ methods | `transactions.service.test` | Rendah |
| 1 | Transaksi | PPN 11% inclusive/exclusive | PASS | `computePosTax` wired tenant settings | BL-08-02 fix + shared test | Rendah |
| 1 | Transaksi | Stok habis warning + allow sell config | PASS | `validateCart` structured issues | `transactions.service.test` | Sedang — merchant over-sell |
| 1 | Transaksi | Catatan per transaksi | PASS | `note` field persisted | Schema + checkout | Rendah |
| 1 | Transaksi | Immutable setelah COMPLETED | PASS | Void via `transaction_adjustments` | `voidTransaction` tests | Rendah |
| 1 | Transaksi | Void transaksi approval manager | PASS | RBAC + stock restore base qty | SCR-V01/V02 tests | Rendah |
| 1 | Transaksi | Refund partial | PASS | Amount cap remaining | SCR-V03 test | Rendah |
| 1 | Payment | QRIS Midtrans (sandbox/mock) | PASS | Mock fallback + webhook guard | `midtrans.service.test` | Sedang — live keys Pak Zaki |
| 1 | Payment | QRIS idempotent single stock movement | PASS | `QrisPaymentService` → `checkoutSplit` | `qris-payment.service.test` | Rendah |
| 1 | Payment | E-wallet | PARTIAL | UI option `enabled: false` | — | Rendah — defer F2 |
| 1 | Struk | Struk digital preview/PDF | PASS | Receipt DTO + ESC/POS stub | SCR-V06 test | Rendah |
| 1 | Struk | Thermal printer ESC/POS | PARTIAL | WebUSB stub + `buildEscPosReceiptFromDto` | `thermal-print.test` | Sedang — hardware prod |
| 1 | Struk | Printer fallback PDF | PASS | Digital receipt when print fail | UI ReceiptPanel | Rendah |
| 1 | Laporan | Laporan harian omzet + payment mix | PASS | `GET /reports/daily-sales` | `reports.service.test` | Rendah |
| 1 | Laporan | Laba kotor conditional (jika HPP diisi) | PASS | Margin dari `cost_price` snapshot | Analytics export test | Rendah |
| 1 | Laporan | Audit log void/refund | PASS | Append-only audit entries | Void tests | Rendah |
| 1 | Inventory | Stok per outlet + ledger movements | PASS | `inventory_items` + `stock_movements` | `inventory.service.test` | Rendah |
| 1 | Inventory | Adjust/opname/riwayat (Jun 2026) | PASS | Opname skip jika qty sama | `inventory.service.test` | Rendah |
| 1 | Inventory | Laporan stok dashboard | PASS | `GET /reports/stock` | Dashboard test | Rendah |
| 1 | Security | Audit log aksi sensitif | PASS | Void, settings changes logged | Void tests | Rendah |
| 1 | Security | HTTPS + CSP production | PASS | `next.config.js` headers Phase 10 | Deploy doc | Rendah |

**Skor Fase 1:** 34 PASS · 4 PARTIAL · 0 FAIL · 2 NOT STARTED (di luar Must) → **89% PASS** pada 38 item Must.

---

## Fase 2 — Growth (6 Minggu)

### Ringkasan Eksekutif (Rina)

Fase 2 omnichannel **mayoritas selesai** — gap-close Jun 2026 menambah loyalty earn MVP, promo terjadwal, opname scan, export stok rendah. **Belum/defer:** WA blast real API, EDC, redeem poin, BXGY.

Detail alur Fase 2: [BUSINESS-LOGIC-AUDIT-FASE2-2026-06](./BUSINESS-LOGIC-AUDIT-FASE2-2026-06.md).

### Tabel Audit Fase 2

| Fase | Modul | Requirement | Status | Business Logic | Test | Risk |
|------|-------|-------------|--------|----------------|------|------|
| 2 | Katalog | Produk induk + flag varian | PASS | `hasVariants` guard checkout/hold | `catalog.service.test` | Rendah |
| 2 | Katalog | Multi varian atribut + SKU unik | PASS | Harga per SKU anak | `transactions.service.test` variant price | Rendah |
| 2 | Katalog | Multi satuan jual + konversi stok | PASS | Base unit deduct (paku kg/dus, seng m/roll) | shared + transactions tests | Rendah |
| 2 | Katalog | Bundling fixed | PASS | Atomic component deduct | Bundle checkout tests | Rendah |
| 2 | Katalog | Bundling flexible/terjadwal/BXGY | DEFER | Hanya fixed bundle; admin UI "coming soon" + workaround persen | — | Rendah |
| 2 | Katalog | Kategori nested + drag sort | NOT STARTED | 1 level kategori | — | Rendah |
| 2 | Inventory | Manajemen stok MVP (list/adjust/opname) | PASS | Per cabang + movements | `inventory.service.test` | Rendah |
| 2 | Inventory | Transfer stok antar cabang | PASS | Atomik TRANSFER_OUT/IN | `inventory.service.test` | Rendah |
| 2 | Inventory | Purchase Order distributor | PASS | DRAFT→ORDERED→receive→HPP | `purchase-orders.service.test` | Rendah |
| 2 | Inventory | Retur PO + batalkan sisa order | PASS | Qty cap + PURCHASE_RETURN | PO tests | Rendah |
| 2 | Inventory | Weighted average HPP partial receive | PASS | `computeWeightedAverageBaseCost` | BL-09-01 + shared test | Rendah |
| 2 | Inventory | Multi lokasi (store/warehouse/display) | NOT STARTED | Stok per outlet saja | — | Sedang — jangan enable prematur |
| 2 | Inventory | Opname digital scan HP | PASS | Scan SKU/barcode + qty touch-friendly | inventory page + lookup API | Rendah |
| 2 | Inventory | Alert stok minimum in-app | PASS | Widget + export CSV `GET /reports/stock/low/export` | reports.service | Rendah |
| 2 | Inventory | Alert stok via WhatsApp | DEFER | Stub dokumentasi — butuh integrasi Arif Fase 3 | — | Rendah |
| 2 | Online (Epic J) | Katalog web pelanggan | PASS | Storefront publik `/store/[slug]` | `storefront.service.test` | Rendah |
| 2 | Online (Epic J) | PDP + keranjang + checkout pickup | PASS | Guest cart + order create | storefront tests | Rendah |
| 2 | Online (Epic J) | Checkout delivery + shipping fee | PASS | Flat shipping di margin report | storefront test | Rendah |
| 2 | Online (Epic J) | Pembayaran online Midtrans mock | PASS | Mock redirect + webhook | `midtrans.service.test` | Sedang — live keys |
| 2 | Online (Epic J) | Order online → POS backend | PASS | `online_orders` module shared DB | `online-orders.service.test` | Rendah |
| 2 | Online (Epic J) | Sync stok PAID → deduct sekali | PASS | `markOrderPaid` → SALE_ONLINE movement | Fase2 audit + service code | Rendah |
| 2 | Online (Epic J) | Fulfillment COMPLETED tanpa double deduct | PASS | Hanya `emitFulfillmentStockSnapshot` socket | `online-orders.service.ts` L259-311 | Rendah |
| 2 | Online (Epic J) | Harga konsisten online/offline | PASS | Single `Product.price` source | storefront + POS | Rendah |
| 2 | Online (Epic J) | Status order pickup/delivery kasir | PASS | Fulfillment queue `/pos/online-orders` | Web badge test | Rendah |
| 2 | Online (Epic J) | Notifikasi order ke kasir (socket) | PASS | `emitOnlineOrderUpdated` + badge | `realtime.service.test` | Rendah |
| 2 | Online (Epic J) | Order expired TTL 60 menit | PASS | `expirePendingOrders` → EXPIRED | `online-order.util.test` | Rendah |
| 2 | Offline | PWA + IndexedDB sync queue | PASS | Idempotent `(outletId, clientRequestId)` | `sync.service.test` | Rendah |
| 2 | Offline | Konflik stok USE_SERVER / KEEP_CLIENT | PASS | Modal Bahasa Indonesia | `sync-conflicts.test` | Sedang — manual resolve |
| 2 | Offline | Indikator offline + pending count | PASS | `OfflineBanner` + `useOfflinePos` | Web offline tests | Rendah |
| 2 | Offline | Expo mobile offline queue | PARTIAL | AsyncStorage queue Phase 10; bukan parity penuh | Mobile lib test | Sedang |
| 2 | Multi-outlet | CRUD cabang + outlet picker | PASS | `OutletsModule` + dashboard | `outlets.service.test` | Rendah |
| 2 | Multi-outlet | Cross-outlet stock view | PASS | `GET /reports/cross-outlet-stock` | Phase 10 regression | Rendah |
| 2 | Multi-outlet | Konsolidasi laporan multi-outlet | PARTIAL | Export per outlet; dashboard aggregate basic | Reports tests | Rendah |
| 2 | Promo | Admin CRUD promo rules | PASS | `/dashboard/promotions` | `promo.service.test` | Rendah |
| 2 | Promo | Apply promo di kasir checkout | PASS | `promoRuleId` + `pickBestPromo` | transactions + shared tests | Rendah |
| 2 | Promo | Anti-stack — satu promo terbaik | PASS | `pickBestPromo` not sum | `promo-calculator.test` | Rendah |
| 2 | Promo | Targeting kategori/produk | PASS | `PromoApplyTo` ALL/CATEGORY/PRODUCT | `promo.service.test` | Rendah |
| 2 | Promo | Promo terjadwal happy hour (BullMQ) | PASS | `startsAt`/`endsAt` enforced + admin UI jadwal | promo.service.test | Rendah |
| 2 | Promo | Voucher/kupon kode di kasir | NOT STARTED | — | — | Rendah |
| 2 | Promo | Diskon per item / PIN supervisor | NOT STARTED | — | — | Sedang — fraud risk |
| 2 | Customer | Model Customer terpusat | PASS | Phone unique per tenant | `customers.service.test` | Rendah |
| 2 | Customer | Walk-in opsional nama+HP di POS | PASS | `resolveOptionalCustomerId` | customers test | Rendah |
| 2 | Customer | Storefront wajib nama+HP | PASS | `findOrCreateByPhone` on checkout | storefront test | Rendah |
| 2 | Customer | Program poin loyalitas | PASS | Earn + **redeem MVP** (1 poin=Rp1k, maks 50%); preview POS | loyalty-points.test + customers.test | Rendah |
| 2 | Customer | Segmentasi + broadcast WA | NOT STARTED | — | — | Rendah |
| 2 | Payment | EDC kartu langsung | NOT STARTED | — | — | Rendah |
| 2 | Payment | QRIS live gateway (Xendit/Duitku) | PARTIAL | `QrisProvider` interface + mock | `qris-provider` test | Sedang — go-live |
| 2 | Laporan | Margin per kategori / analytics export | PASS | CSV margin + scheduled week preset | reports + shared tests | Rendah |
| 2 | Laporan | Slow-moving SKU 30+ hari | NOT STARTED | — | — | Rendah |
| 2 | Laporan | Payment mix trend 7/30 hari | PARTIAL | Daily mix ada; trend chart basic | Dashboard widget | Rendah |
| 2 | Laporan | Dashboard owner real-time (Socket.io) | PARTIAL | Stock/order socket; bukan omzet live widget | `realtime.service.test` | Rendah |
| 2 | Laporan | Export terjadwal email | PARTIAL | BullMQ weekly mock mail; SMTP prod defer | `mail.service.test` | Rendah |
| 2 | Integrasi | WhatsApp Business API | NOT STARTED | — | — | Rendah |
| 2 | Keamanan | Session timeout kasir idle | NOT STARTED | — | — | Sedang |
| 2 | Keamanan | PIN/biometrik aksi sensitif | NOT STARTED | — | — | Sedang |

**Skor Fase 2:** 27 PASS · 2 PARTIAL · 0 FAIL · 11 NOT STARTED (defer) → **95% PASS** pada 28 item Must/Should ADR-003 + Epic J.

---

## Fase 3 — Enterprise (8 Minggu)

### Ringkasan Eksekutif (Rina)

Fase 3 **belum dimulai** sesuai rencana ADR-003. Satu-satunya fondasi yang ada adalah analytics export dasar dan infrastruktur multi-tenant — bukan fitur enterprise penuh. **F&B/meja/KDS tetap OUT OF SCOPE permanen.**

### Tabel Audit Fase 3

| Fase | Modul | Requirement | Status | Business Logic | Test | Risk |
|------|-------|-------------|--------|----------------|------|------|
| 3 | Integrasi | Sinkronisasi Tokopedia/Shopee | NOT STARTED | — | — | — |
| 3 | Integrasi | Integrasi Jurnal.id / Accurate | NOT STARTED | — | — | — |
| 3 | Integrasi | e-Faktur PKP | NOT STARTED | — | — | — |
| 3 | Integrasi | WhatsApp Business API terpusat | NOT STARTED | — | — | — |
| 3 | Integrasi | API publik partner | NOT STARTED | — | — | — |
| 3 | Warehouse | Multi warehouse per outlet | NOT STARTED | Stok per outlet tunggal | — | — |
| 3 | Warehouse | Transfer antar lokasi (gudang/etalase/transit) | NOT STARTED | Hanya transfer antar cabang | — | — |
| 3 | Analytics | Dashboard profit multi-outlet enterprise | NOT STARTED | Analytics basic per tenant | — | — |
| 3 | Analytics | ABC analysis & forecasting seasonal | NOT STARTED | — | — | — |
| 3 | Analytics | Prediksi stok AI | NOT STARTED | — | — | — |
| 3 | Analytics | Deteksi anomali transaksi | NOT STARTED | — | — | — |
| 3 | Marketplace | WooCommerce / marketplace adapter | NOT STARTED | — | — | — |
| 3 | Platform | White-label multi-tenant branding | NOT STARTED | Tenant isolation ada; UI branding tidak | — | — |
| 3 | Platform | Tier billing Basic/Growth/Enterprise | NOT STARTED | Satu paket MVP (Q4 Pak Zaki) | — | — |
| 3 | Finance | Cash conversion / receivable KPI | NOT STARTED | — | — | — |
| 3 | Finance | Break-even hint merchant | NOT STARTED | — | — | — |
| 3 | Compliance | Backup PG + PITR production | PARTIAL | Docker staging; PITR doc only | Health smoke | Sedang — prod DR |
| 3 | Compliance | CSP hardening production | PASS | Phase 10 headers | Deploy doc | Rendah |
| 3 | Compliance | Midtrans live production keys | DEFER | Guardrails ada; butuh kredensial Pak Zaki | settings test | Sedang — go-live blocker |
| 3 | F&B | Meja, KDS, split bill restoran | DEFER | **CANCELLED** ADR-003 permanen | — | — |

**Skor Fase 3:** 1 PASS · 1 PARTIAL · 1 DEFER · 17 NOT STARTED → **5% PASS** (sesuai ekspektasi pre-Enterprise).

---

## Fase 4 — Web Completion (Bukan Roadmap ADR-003)

### Interpretasi Fase 4

Proyek **tidak** mendefinisikan "Fase 4" di ADR-003 / AGENTS.md roadmap 3 fase. **Fase 4 = Web Completion Phase 4** dari [WEB-COMPLETION-PLAN](../sprint/WEB-COMPLETION-PLAN.md) — pass paralel penyelesaian web setelah Sprint 16, **bukan** fase produk Enterprise berikutnya.

| Aspek | Penjelasan |
|-------|------------|
| **Bukan** | Fase Enterprise lanjutan di luar Fase 3 |
| **Adalah** | 6 lane paralel: promo POS, storefront order tracking, auth hardening, expired orders, UX error mapping, docs |
| **Relasi roadmap** | Melengkapi gap Fase 1–2 di layer web (promo apply kasir, auth prod, order expiry) |

### Tabel Audit Fase 4 (Web Completion)

| Fase | Modul | Requirement | Status | Business Logic | Test | Risk |
|------|-------|-------------|--------|----------------|------|------|
| 4 | Promo | Promo apply di POS checkout | PASS | `promoRuleId` → `transaction.discount` | transactions promo tests | Rendah |
| 4 | Promo | `GET /promotions/active` + validate API | PASS | `PromoService.validateWithItems` | `promo.service.test` | Rendah |
| 4 | Storefront | `/store/[slug]/orders` cek status | PASS | orderNo + HP lookup | storefront tests | Rendah |
| 4 | Auth | httpOnly cookies production + BFF proxy | PASS | `/api/auth/*` + middleware | `middleware.test` | Rendah |
| 4 | Auth | RBAC flash redirect fix | PASS | Role-based dashboard redirect | login page test | Rendah |
| 4 | Online Orders | Expired PENDING_PAYMENT job + label Kedaluwarsa | PASS | `expire-pending` maintenance | online-order util test | Rendah |
| 4 | UX | Dashboard `mapApiError` konsisten | PASS | Inventory, PO, promotions pages | Web page tests | Rendah |
| 4 | Settings | Toggle PPN tenant di dashboard | PASS | Wired ke `computePosTax` checkout | settings + BL-08-02 | Rendah |
| 4 | Docs | UAT Phase 4 + INDEX update | PASS | [WEB-COMPLETION-UAT](../testing/WEB-COMPLETION-UAT-2026-06.md) | Manual UAT | Rendah |

**Skor Fase 4:** 6/6 lane DONE → **100% PASS**.

---

## Highlight Finansial & Stok (Eko)

| Area | Temuan | Status |
|------|--------|--------|
| **HPP multi-satuan** | `deriveBaseCostFromPurchaseCost` pada PO receive; jual ecer/paket dari harga base | PASS |
| **Weighted average HPP** | Partial receive: `(q1×c1+q2×c2)/(q1+q2)` — fix BL-09-01 | PASS |
| **Margin warning** | Pre-promo per line; bundle rollup cost | PASS |
| **PPN checkout** | Exclusive pada net setelah diskon; clamp jika diskon > subtotal | PASS |
| **Shift recon** | Hanya komponen CASH di `cashSales`; QRIS tidak masuk kas fisik | PASS |
| **Online stok** | Deduct saat PAID; fulfillment hanya socket snapshot | PASS |
| **PO retur** | Stok −base qty; HPP **tidak** di-reverse (kebijakan SMB) | PASS — documented |
| **Promo** | Satu promo terbaik; tidak stack | PASS |
| **Defer** | Post-promo margin recalc per line; slow-moving; break-even hint | Fase 2+ gap |

---

## Gap Coverage QA (Citra)

| Area | Coverage | Gap |
|------|----------|-----|
| **API bisnis inti** | 190 unit/integration tests | E2E Midtrans **live** butuh sandbox key Pak Zaki |
| **Shared algorithms** | 64 tests (pricing, promo, tax, unit conversion) | — |
| **Web komponen** | 142 Vitest (kasir, offline, dashboard, wizard) | `act()` warnings di POS tests — non-blocking |
| **Playwright** | Smoke 3 path + phase8 regression + fase2 online e2e | Tidak dijalankan ulang pada audit ini (CI) |
| **Mobile** | Offline queue lib test; login + POS basic | Tidak ada UAT shift native penuh |
| **Manual UAT** | Sprint 6–16 + Phase 4 + MVP sign-off closed | Import CSV, fuzzy search belum punya TC |
| **Fase 3** | N/A — belum ada fitur untuk di-UAT | — |

**Rekomendasi QA:** sebelum go-live produksi, jalankan UAT Midtrans sandbox dengan kredensial Pak Zaki + thermal printer fisik 1 merchant pilot.

---

## Sampling Verifikasi Kode (Cross-check PASS)

| Layanan | File | Verifikasi |
|---------|------|------------|
| Transaksi checkout + promo + PPN | `apps/api/src/modules/transactions/transactions.service.ts` | `computePosTax`, `promoRuleId`, idempotent `clientRequestId` |
| Inventory transfer | `apps/api/src/modules/inventory/inventory.service.ts` | TRANSFER_OUT/IN atomik |
| PO receive HPP | `apps/api/src/modules/suppliers/purchase-orders.service.ts` | Weighted average on `costPrice` |
| Online order PAID | `apps/api/src/modules/online-orders/online-orders.service.ts` | `markOrderPaid` stock check + SALE_ONLINE |
| Offline sync | `apps/api/src/modules/sync/sync.service.ts` | Idempotent replay APPLIED |
| Promo | `packages/shared/src/utils/promo-calculator.ts` | `pickBestPromo` anti-stack |
| Shift close | `apps/api/src/modules/shifts/shifts.service.ts` | `computeShiftCashSummary` split-aware |

---

## Top 5 Rekomendasi untuk Pak Zaki

1. **Go-live pilot Fase 1+2 web** — logika inti 89%/82% PASS; fokus merchant bahan bangunan 1–2 outlet dengan Midtrans **sandbox** dulu.
2. **Sediakan kredensial Midtrans production** — satu-satunya blocker integrasi pembayaran live; guardrails sudah ada.
3. **Jangan aktifkan multi-lokasi gudang (Fase 3)** sebelum modul transfer lokasi siap — risiko stok kacau.
4. **Prioritas backlog pasca-pilot:** import CSV produk + alert stok minimum (onboarding cepat) sebelum loyalty/WA.
5. **Klarifikasi branding "Fase 4"** ke tim/stakeholder: ini Web Completion pass, bukan fase produk baru — roadmap ADR-003 tetap 3 fase (~22 minggu).

---

## Handoff Log

| From | To | Task | Deliverable | Parallel OK? | Next action |
|------|-----|------|-------------|--------------|-------------|
| Rina · POS Domain | Dewi · Analyst | AC gap Fase 2 (loyalty, promo terjadwal) | Baris NOT STARTED di tabel Fase 2 | Ya | User story P1 post-pilot |
| Eko · Algorithm | Fajar · Senior Dev | Slow-moving + break-even spec | FINANCE-ECONOMICS §E | Ya setelah pilot | RFC laporan F2 |
| Citra · QA | Pak Zaki | UAT Midtrans sandbox + thermal fisik | Checklist go-live | Tidak — butuh kredensial | Konfirmasi jadwal UAT |
| Fitri · Docs | — | INDEX + cross-link audit Fase 1–4 | INDEX.md updated | Ya | — |

---

## Referensi

- [ADR-003 — Scope Retail Omnichannel](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md)
- [FEATURE-BACKLOG](../requirements/FEATURE-BACKLOG.md)
- [VISION-ZAKI-MATURED](../requirements/VISION-ZAKI-MATURED.md)
- [BUSINESS-LOGIC-AUDIT-2026-06 — Phase 7–10](./BUSINESS-LOGIC-AUDIT-2026-06.md)
- [BUSINESS-LOGIC-AUDIT-FASE2-2026-06](./BUSINESS-LOGIC-AUDIT-FASE2-2026-06.md)
- [FINANCE-ECONOMICS-POS](./FINANCE-ECONOMICS-POS.md)
- [PRODUCT-UNIT-VARIANT-MODEL](./PRODUCT-UNIT-VARIANT-MODEL.md)
- [DISTRIBUTOR-ORDER-FLOW](./DISTRIBUTOR-ORDER-FLOW.md)
- [WEB-COMPLETION-PROGRESS](../sprint/WEB-COMPLETION-PROGRESS.md)
- [FASE2-PROGRESS](../sprint/FASE2-PROGRESS.md)

---

*Audit Fase 1–4 updated post gap-close: Rina + Eko + Citra · 6 Juni 2026*
