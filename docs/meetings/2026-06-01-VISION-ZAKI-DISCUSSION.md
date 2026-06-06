> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Rapat | Audience: semua tim, Pak Zaki

# Rapat Matangkan Visi — Dokumen Rencana Pak Zaki

> **Tanggal:** 1 Juni 2026  
> **Pemilik proyek:** Zaki (**Pak Zaki**)  
> **Facilitator:** Budi Santoso (CEO)  
> **Durasi:** ~120 menit (simulasi diskusi tim)  
> **Dokumen sumber:** [`.cursor/dokument rencana zaki.md`](../../.cursor/dokument%20rencana%20zaki.md)  
> **Referensi proyek:** [Kickoff](../meetings/2026-06-01-KICKOFF-MEETING.md), [FEATURE-BACKLOG](../requirements/FEATURE-BACKLOG.md), [DATABASE-ANALYSIS](../database/DATABASE-ANALYSIS.md), [ADR-001](../decisions/ADR-001-REACT-STACK.md)

---

## Peserta (11 anggota tim)

| Nama | Jabatan |
|------|---------|
| Budi Santoso | CEO / Orchestrator |
| Rina Wulandari | Spesialis POS Domain |
| Dewi Kartika | Business Analyst |
| Hendra Pratama | Project Planner |
| Fitri Nugroho | Documentation Specialist |
| Arif Hidayat | Integration Specialist |
| Eko Susilo | Algorithm Specialist |
| Maya Anggraini | UI/UX Specialist |
| Fajar Ramadhan | Senior Developer (Backend/API) |
| Dimas Pratama | Senior Frontend Developer |
| Yoga Permana | DevOps Engineer |

---

## 1. Ringkasan Visi Pak Zaki

---
**Budi** · CEO  
Halo Pak Zaki, tim sudah membaca penuh dokumen rencana Anda (782 baris, 10 modul). Ini **bukan** scope MVP hari ini — ini **north star produk** Barokah Core POS. Ringkasan yang saya presentasikan ke tim:

1. **Produk lengkap retail** — parent product, multi-varian SKU, multi-satuan jual, bundling atomik, kategori nested, fuzzy search.
2. **Stok enterprise-ready** — multi-lokasi (toko/gudang/display/transit), transfer, opname digital, mutasi ledger, alert multi-channel, prediksi AI.
3. **Kasir profesional** — keranjang dinamis, hold/recall, split payment, diskon berjenjang role, voucher, promo terjadwal, void/refund dengan window waktu.
4. **Pembayaran Indonesia** — QRIS terpadu, EDC, loyalty poin, rekap per metode di tutup shift.
5. **CRM & loyalty** — segmentasi otomatis, broadcast WhatsApp, struk digital.
6. **Laporan & owner dashboard real-time** — laba kotor, kinerja kasir, export Excel/PDF/WA.
7. **Keamanan ketat** — RBAC 4 role, PIN/biometrik, audit tamper-proof, deteksi anomali, session timeout.
8. **Operasional** — open/close shift kas, offline-first Expo, multi cabang, thermal printer, **F&B** (meja, split bill, KDS).
9. **Integrasi** — WhatsApp Business API, marketplace (Tokopedia/Shopee), akuntansi (Jurnal/Accurate), PO supplier.
10. **UX kasir touch-first** — grid produk, numpad, shortcut favorit, indikator sync.

**Catatan teknis dokumen sumber:** stack tertulis *Next.js + Expo + Supabase + pnpm*. Proyek aktif memakai **NestJS + Prisma + PostgreSQL + npm workspaces** (keputusan kickoff + ADR-001). Tim **mengadopsi fitur & alur bisnis** Pak Zaki; **bukan** migrasi backend ke Supabase di MVP.

**Deliverable rapat ini:** [VISION-ZAKI-MATURED.md](../requirements/VISION-ZAKI-MATURED.md), backlog diperluas, gap analysis, roadmap 3 fase diselaraskan.
---

---

## 2. Diskusi per Section Dokumen Pak Zaki

### Modul 1 — Manajemen Produk (§1.1–1.6)

---
**Rina** · Spesialis POS Domain  
Halo tim, modul produk Pak Zaki sangat kuat untuk retail fashion/FMCG Indonesia. **Selaras MVP:** produk + kategori + satuan dasar + barcode + `cost_price` (kickoff). **Perlu disesuaikan:** varian multi-atribut (§1.2) dan multi-satuan jual (§1.3) belum ada di schema Prisma MVP — produk flat `products` per tenant. **Defer Fase 2:** bundling fixed/flexible/terjadwal (§1.4), fuzzy search pg_trgm/Fuse (§1.6) — MVP cukup search nama/SKU + scan barcode. **Risiko:** generate kombinasi varian eksplosif (4 ukuran × 6 warna = 24 SKU) — perlu UX wizard admin, bukan sekadar CRUD. **Mitigasi:** Fase 2 Epic "Catalog Advanced" dengan migration `product_skus`, `sku_units` terpisah dari `products`.
---

---
**Fajar** · Senior Developer  
Halo Rina, schema MVP 22 tabel sengaja flat agar Sprint 2–3 tidak blocked. Path extension: tambah `has_variants`, `product_attributes`, `product_skus` di migration Fase 2 tanpa break transaksi immutable — snapshot tetap di `transaction_items`. Bundling atomik (§1.4) wajib DB transaction — kita pakai Prisma `$transaction`, bukan Supabase RPC; pola sama. **MVP:** satu `unit_id` per produk; multi-satuan → tabel `sku_units` Fase 2.
---

---
**Eko** · Algorithm Specialist  
Halo Fajar, multi-satuan (Pack/Dus/Krat) butuh aturan: stok selalu base unit, harga satuan besar boleh diskon volume — spec terpisah `docs/algorithms/UNIT-CONVERSION-SPEC.md` Fase 2. Bundling beli-X-gratis-Y (§1.4 tipe 4) = promo engine — **tidak** MVP. HPP per SKU (§1.2) penting untuk laba kotor — align `cost_price` di kickoff.
---

---
**Maya** · UI/UX Specialist  
Halo Dimas, picker varian di kasir (§1.2) butuh modal step — touch target min 48px, SKU habis greyed out. Grid kategori nested (§1.5) MVP: satu level kategori dulu; nested drag-drop dashboard → Fase 2. Fuzzy search: debounce 200ms, highlight match — Sprint 3 cukup exact + contains, fuzzy P1.
---

---
**Dewi** · Business Analyst  
Halo Hendra, saya mapping AC: **P0** = CRUD produk flat, kategori, satuan, scan; **P1** = varian + multi-satuan; **P2** = bundling + promo terjadwal terkait bundle. User story baru dari visi Pak Zaki masuk backlog dengan tag **Visi Pak Zaki**.
---

### Modul 2 — Manajemen Stok (§2.1–2.6)

---
**Rina** · Spesialis POS Domain  
**Selaras MVP:** `inventory_items` per outlet + `stock_movements` ledger (DATABASE-ANALYSIS). Stok habis warning di checkout (kickoff: allow dengan warning). **Defer Fase 2:** multi-gudang 4 tipe lokasi (§2.1), transfer transit (§2.2), alert WA/email (§2.3), opname digital scan (§2.4). **Defer Fase 3:** prediksi AI (§2.6). **Risiko:** multi-lokasi tanpa transfer workflow = data stok kacau — mitigasi: jangan enable multi-location sebelum transfer module siap.
---

---
**Fajar** · Senior Developer  
Tabel Pak Zaki `sku_stock` + `locations` ≈ rencana kita `inventory_items` + `outlets` — rename konsep, same idea. `warehouse` type tidak dijual di POS → flag `outlet.type` Fase 2. Opname: sesi + adjustment movement type `OPNAME` — schema movement sudah siap enum.
---

---
**Arif** · Integration Specialist  
Alert WhatsApp stok minimum (§2.3) = channel Fase 2 — butuh WhatsApp Business API (§9.1). MVP: in-app notification web dashboard owner (optional Sprint 4 jika waktu).
---

### Modul 3 — Transaksi & Kasir (§3.1–3.9)

---
**Rina** · Spesialis POS Domain  
**Selaras MVP:** keranjang, hold/recall (Sprint 4), split payment (Sprint 4), kembalian otomatis, catatan transaksi. **Defer:** diskon transaksi berjenjang + PIN supervisor (§3.4) → Fase 2 (kickoff: no diskon MVP); voucher (§3.5), promo terjadwal (§3.6) → Fase 2; void window 30 menit (§3.7) → P1 post-MVP (kickoff). **Selaras:** validasi stok, total Rp 0, kembalian negatif (§3.8) — masuk AC checkout.
---

---
**Eko** · Algorithm Specialist  
Diskon per item + transaksi + voucher = 3 layer — harus urutan apply: item → voucher → transaksi → tax. MVP hanya PPN (PPN-SPEC). Promo happy hour (§3.6) butuh cron + timezone WIB — BullMQ Fase 2.
---

---
**Maya** · UI/UX Specialist  
Hold tanpa batas waktu (§3.2) vs kickoff TTL 30 menit — **usulan:** tetap TTL 30 menit MVP (data hygiene); Pak Zaki konfirmasi jika perlu unlimited. Split payment UI SCR-P05 Sprint 4 — sudah locked kickoff.
---

### Modul 4 — Pembayaran (§4.1–4.5)

---
**Arif** · Integration Specialist  
**Selaras MVP:** QRIS Midtrans (§4.1), rekap per metode di tutup shift (§4.5). **Defer Fase 2:** EDC langsung ke POS (§4.2) — hardware variasi Indonesia besar; MVP transfer manual + QRIS. **Defer Fase 2:** loyalty poin sebagai metode bayar (§4.4) — butuh modul customer. **Risiko:** QRIS webhook delay — mitigasi fallback cash (sudah USER-FLOWS).
---

### Modul 5 — Pelanggan & Loyalitas (§5.1–5.5)

---
**Rina** · Spesialis POS Domain  
CRM lite + poin + segmentasi + broadcast WA + struk digital — **seluruh modul Fase 2** untuk MVP 8 minggu. **P1 kecil:** catat nama/HP di transaksi (field opsional) tanpa program poin — bisa masuk Sprint 4 jika ringan. **Risiko regulasi:** broadcast WA butuh opt-in pelanggan — mitigasi Fitri buat kebijakan privasi.
---

---
**Dewi** · Business Analyst  
Segmentasi `new/active/loyal/vip/lapsed/lost` (§5.3) = job harian batch — spec terpisah, bukan real-time MVP.
---

### Modul 6 — Laporan & Analitik (§6.1–6.7)

---
**Rina** · Spesialis POS Domain  
**Selaras MVP (financial pulse):** laporan penjualan harian (§6.1), laba kotor conditional (§6.5), payment mix — kickoff Sprint 4. **Defer Fase 2:** produk terlaris vs paling untung terpisah (§6.2), kinerja kasir (§6.3), kartu stok nilai rupiah (§6.4). **Defer Fase 2–3:** dashboard owner real-time (§6.6) — Socket.io, bukan Supabase Realtime; export terjadwal WA (§6.7).
---

---
**Eko** · Algorithm Specialist  
Laba kotor = Σ(qty × (harga − HPP)) per line — butuh snapshot `cost_price` di `transaction_items` Fase 2; MVP snapshot harga jual saja, margin dari master jika `cost_price` diisi.
---

---
**Dimas** · Senior Frontend Developer  
Dashboard owner mobile (§6.6) — Expo owner app Fase 2; MVP owner lihat laporan via Next.js web dashboard stub Sprint 4.
---

### Modul 7 — Keamanan & Kontrol (§7.1–7.6)

---
**Fajar** · Senior Developer  
**Selaras MVP:** RBAC 3 role (Owner/Manager/Kasir) ≈ Owner/Supervisor/Kasir Pak Zaki; `audit_logs` append-only. **Defer Fase 2:** PIN/biometrik LocalAuthentication (§7.2), deteksi anomali ML rule-based (§7.4), session timeout kasir (§7.5). **Defer:** backup cloud Supabase (§7.6) — kita PG WAL + backup harian Yoga. Manager approval void = Supervisor Pak Zaki.
---

---
**Yoga** · DevOps Engineer  
Backup 90 hari PITR (§7.6) — staging/production target Sprint 4; dev local tidak perlu. Enkripsi at-rest = responsibility cloud provider + TLS.
---

### Modul 8 — Operasional & Shift (§8.1–8.6)

---
**Rina** · Spesialis POS Domain  
**Selaras MVP:** open/close shift kas (§8.1), cetak struk thermal (§8.4), multi kasir satu outlet (§8.3 partial — 1 outlet MVP). **Defer Fase 2:** offline penuh Expo SQLite (§8.2). **Defer Fase 3 / vertical F&B:** meja & antrian (§8.5), KDS (§8.6) — butuh konfirmasi Pak Zaki: target vertical retail umum vs restoran dulu?
---

---
**Dimas** · Senior Frontend Developer  
Offline (§8.2): Expo SQLite + sync queue — Epic besar Fase 2; konflik stok "server wins" align dokumen Pak Zaki. Mobile kasir Expo: **belum** Sprint 1 — web kasir dulu MVP; mobile parallel Fase 2 setelah API stabil.
---

---
**Arif** · Integration Specialist  
Thermal printer (§8.4) Sprint 4 — ESC/POS; reprint history — P1.
---

### Modul 9 — Integrasi Eksternal (§9.1–9.4)

---
**Arif** · Integration Specialist  
**Selaras roadmap AGENTS Fase 3:** Jurnal/Accurate (§9.3). **Fase 2:** WhatsApp Business API terpusat (§9.1) — struk digital, alert stok, OTP supervisor. **Fase 3:** Tokopedia/Shopee sync (§9.2) — rate limit & credential per merchant. **Fase 2:** PO supplier (§9.4) — setelah inventory stabil. **Risiko:** API marketplace berubah — mitigasi adapter pattern + feature flag per platform.
---

### Modul 10 — UX Kasir Expo (§10.1–10.5)

---
**Maya** · UI/UX Specialist  
**Selaras:** grid produk gambar, numpad besar, indikator online/offline, shortcut favorit — wireframe SCR-K01 + iterasi Fase 2. Layout per role (§10.1) — Manager vs Kasir beda menu; MVP satu layout kasir + RBAC hide menu. **Handoff:** Maya update WIREFRAMES dengan komponen dari visi Pak Zaki (favorit, sync banner).
---

---
**Dimas** · Senior Frontend Developer  
`packages/ui` shared web + native — align ADR-001. Numpad USB Bluetooth (§10.2) — web kasir PC prioritas merchant Indonesia.
---

### Catatan Teknis & Schema (§ Database + § Catatan Teknis)

---
**Fajar** · Senior Developer  
Tabel Pak Zaki vs Prisma MVP:

| Konsep Pak Zaki | Status MVP | Fase |
|-----------------|------------|------|
| `products` induk | `products` flat | MVP |
| `product_skus` | — | Fase 2 |
| `sku_units` | `units` global | Fase 2 |
| `sku_stock` | `inventory_items` | MVP (1 outlet) |
| `locations` | `outlets` (+ type Fase 2) | MVP / F2 |
| `bundle_items` | — | Fase 2 |
| `customers`, `loyalty_points` | — | Fase 2 |
| `vouchers`, `promotions` | `promo_rules` minimal | F2 |

Transaksi atomik: Prisma interactive transaction — sama intent Supabase RPC Pak Zaki.
---

---
**Yoga** · DevOps Engineer  
Realtime: Socket.io (OVERVIEW), bukan Supabase channel. Monorepo: **npm workspaces** (bukan pnpm di repo aktual) — tidak mengubah package manager mid-MVP.
---

---
**Hendra** · Project Planner  
Kapasitas: 4 sprint × 2 minggu tidak menampung 10 modul penuh. Visi Pak Zaki = **22+ minggu** produk lengkap terfasase. Sprint 1 **tidak berubah** setelah rapat ini.
---

---
**Fitri** · Documentation Specialist  
Halo tim, saya akan indeks dokumen rapat ini + VISION-ZAKI-MATURED + gap analysis di INDEX.md. Dokumen sumber Pak Zaki tetap di `.cursor/` — tidak di-rewrite.
---

---

## 3. Gap Analysis (Ringkas)

Detail tabel: [2026-06-01-VISION-ZAKI-GAP-ANALYSIS.md](./2026-06-01-VISION-ZAKI-GAP-ANALYSIS.md).

| Area | Visi Pak Zaki | State Proyek Saat Ini | Gap |
|------|---------------|----------------------|-----|
| Backend | Supabase BaaS | NestJS + Prisma + PG | **Keputusan:** tetap NestJS; fitur bisnis diadopsi |
| Package manager | pnpm | npm workspaces | Dokumentasi saja; tidak migrasi MVP |
| Produk | Varian + multi-satuan + bundle | Produk flat | Schema extension Fase 2 |
| Stok | Multi-lokasi 4 tipe | 1 outlet, inventory per outlet | Fase 2 multi-outlet |
| Diskon/promo/voucher | Lengkap §3.4–3.6 | PPN saja MVP | Fase 2 |
| Loyalty & WA | §5, §9.1 | Tidak ada | Fase 2 |
| Offline | §8.2 penuh | Won't MVP kickoff | Fase 2 |
| F&B meja/KDS | §8.5–8.6 | Tidak di backlog | **OUT OF SCOPE** (ADR-003) |
| Online web + sync | ADR-003 | Belum di backlog awal | Fase 2 Epic J |
| E-commerce sync | §9.2 | Fase 3 roadmap | Fase 3 |
| AI prediksi stok | §2.6 | Tidak ada | Fase 3 |
| RBAC | 4 role + Admin | 3 role MVP + enum extended | Mapping Supervisor=Manager |
| Realtime dashboard | Supabase Realtime | Socket.io rencana | Implement Fase 2 |

---

## 4. Keputusan Tim (Decision Log)

| # | Keputusan | Pemilik |
|---|-----------|---------|
| VZ-01 | Dokumen Pak Zaki = **north star produk**; implementasi bertahap P0–P3 | Budi |
| VZ-02 | **Stack tetap:** NestJS, Prisma, PostgreSQL, Redis, Socket.io, Next.js, Expo (ADR-001) — **bukan** migrasi Supabase MVP | Fajar + Budi |
| VZ-03 | **MVP 8 minggu tidak diperluas** — scope kickoff tetap; visi lengkap ±22 minggu (3 fase) | Hendra + Budi |
| VZ-04 | **Sprint 1 tidak berubah** — foundation only | Hendra |
| VZ-05 | Produk flat + varian/multi-satuan/bundling → **Fase 2** (schema direncanakan, tidak Sprint 1) | Fajar |
| VZ-06 | Multi-gudang, transfer, opname digital → **Fase 2** | Rina |
| VZ-07 | CRM, loyalty, voucher, promo terjadwal, WA integrasi → **Fase 2** | Rina + Arif |
| VZ-08 | Offline-first mobile Expo → **Fase 2** (setelah API kontrak stabil) | Dimas + Fajar |
| VZ-09 | F&B meja, split bill meja, KDS | ~~Fase 3 deprioritized~~ → **OUT OF SCOPE permanen** (ADR-003) |
| VZ-10 | E-commerce marketplace + accounting API → **Fase 3** (align AGENTS.md) | Arif |
| VZ-11 | AI prediksi stok → **Fase 3** | Eko |
| VZ-12 | Hold bill: **TTL 30 menit** MVP | ✅ Pak Zaki konfirmasi (Q2) |
| VZ-13 | Search MVP: exact/barcode; fuzzy pg_trgm → **P1** | Fajar |
| VZ-14 | Supervisor Pak Zaki = **Manager** di RBAC MVP | Fajar |
| VZ-15 | Realtime owner dashboard: **Socket.io**, bukan Supabase channel | Fajar + Yoga |
| VZ-16 | Artefak wajib: VISION-ZAKI-MATURED + backlog update + gap table | Fitri |

---

## 5. Revised Roadmap (Diselaraskan Visi + Kapasitas)

| Fase | Durasi | Tema | Modul utama dari visi Pak Zaki |
|------|--------|------|--------------------------------|
| **1 — MVP** | 8 minggu (Jun–Jul 2026) | Financial pulse + kasir 1 outlet | Auth/RBAC, produk flat, transaksi, shift, QRIS, printer, hold, split pay, laporan harian, PPN, audit dasar |
| **2 — Growth** | +6 minggu | Retail omnichannel | Varian SKU, **penjualan online web**, **offline PWA toko fisik**, sync stok/order, multi-outlet, promo/CRM, WA, laporan lanjutan |
| **3 — Enterprise** | +8 minggu | Skala & integrasi | **Tanpa F&B/KDS** (ADR-003); AI stok, marketplace sync, accounting API, analytics, API publik |

Timeline total visi matang: **~22 minggu** dari kickoff (tidak termasuk maintenance).

---

## 6. Action Items

| # | Action | Owner | Deadline |
|---|--------|-------|----------|
| VA-01 | Publish VISION-ZAKI-MATURED.md | Budi + Fitri | 1 Jun 2026 |
| VA-02 | Update FEATURE-BACKLOG (tag Visi Pak Zaki) | Dewi + Hendra | 1 Jun 2026 |
| VA-03 | Gap analysis table publish | Fitri | 1 Jun 2026 |
| VA-04 | Schema extension RFC (variants, sku_units) | Fajar | 15 Jun 2026 (pre-Sprint 2) |
| VA-05 | UNIT-CONVERSION + BUNDLE algo stub | Eko | Sprint 2 planning |
| VA-06 | WhatsApp integration roadmap doc | Arif | 29 Jun 2026 |
| VA-07 | Wireframe: varian picker + sync banner (WIP) | Maya | 28 Jun 2026 |
| VA-08 | User story Epic F2 dari modul §1–§3 | Dewi | 14 Jun 2026 |
| VA-09 | INDEX.md + INDEX.json update | Fitri | 1 Jun 2026 |
| VA-10 | Konfirmasi Pak Zaki: vertical F&B vs retail, TTL hold, mobile MVP priority | Budi | ✅ **1 Jun 2026** — lihat Lampiran |

---

## 7. Handoff Log

| From | To | Task | Deliverable | Blocked by | Parallel OK? | Next action |
|------|-----|------|-------------|------------|--------------|-------------|
| Budi · CEO | Pak Zaki | Konfirmasi open questions | [ADR-002](../decisions/ADR-002-PAK-ZAKI-CONFIRMATIONS.md) | — | — | ✅ Selesai 1 Jun 2026 |
| Budi · CEO | Fitri · Docs | Indeks dokumen visi | INDEX update | — | Ya | Fitri publish cross-links |
| Rina · POS | Dewi · Analyst | AC Fase 2 catalog/stock | Backlog epics | Pak Zaki confirm vertical | Tidak | Dewi tulis user story P1 |
| Fajar · Senior Dev | Eko · Algorithm | Schema RFC review | RFC variants | — | Ya setelah 15 Jun | Eko unit conversion spec |
| Maya · UI/UX | Dimas · Frontend | Wireframe varian/offline banner | WIREFRAMES WIP | — | Ya Sprint 2 | Dimas implement F2 |
| Arif · Integration | Fajar · Senior Dev | WA + QRIS roadmap | integration README | — | Ya | Arif POC WA Sprint 2 |
| Hendra · Planner | Semua | Sprint 1 unchanged | SPRINT-1-PLAN note | — | — | Lanjut eksekusi Sprint 1 |
| Fitri · Docs | Semua tim | Navigasi visi matang | VISION-ZAKI-MATURED | — | Ya | Semua baca sebelum Sprint 2 planning |

---

## Lampiran A — Konfirmasi Pak Zaki (1 Juni 2026)

> **Status:** ✅ Semua pertanyaan terbuka (Q1–Q6) **CONFIRMED**  
> **ADR resmi:** [ADR-002-PAK-ZAKI-CONFIRMATIONS.md](../decisions/ADR-002-PAK-ZAKI-CONFIRMATIONS.md)

| # | Pertanyaan | Jawaban Pak Zaki |
|---|------------|------------------|
| Q1 | Retail vs F&B vertical | **Retail — toko bahan bangunan** (building materials store) |
| Q2 | Hold bill TTL | **TTL 30 menit** |
| Q3 | Mobile Expo vs web kasir | **Web dulu; Expo Fase 2** |
| Q4 | SaaS tier model | **Satu paket MVP dulu** |
| Q5 | NestJS+Prisma backend | **Ya** — sesuai scaffold proyek |
| Q6 | Varian/bundling pilot minggu 9–10 | **Varian sebelum bundling** |

**Dampak langsung:** Sprint 1 tidak berubah · Sprint 2 master data disesuaikan bahan bangunan · Varian di Sprint 5 area · F&B/KDS Fase 3 deprioritized.

---

## Lampiran C — Amendemen Scope Pak Zaki (ADR-003, 1 Juni 2026)

> **Status:** ✅ Dikonfirmasi Pak Zaki  
> **ADR resmi:** [ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md)

Pak Zaki mengklarifikasi:

> *"Kita ga butuh F&B/meja/KDS. Karena projek ini untuk penjualan retail dan online dengan web dan ada juga offline di toko fisik."*

| Aspek | Keputusan |
|-------|-----------|
| **OUT OF SCOPE** | F&B, meja, KDS, alur restoran — **dibatalkan permanen** (bukan Fase 3) |
| **IN SCOPE** | Retail toko fisik (web kasir), penjualan online via web, offline di toko fisik |
| **Online** | Web storefront/e-commerce + order terintegrasi POS (bukan hanya web kasir staff) |
| **Offline toko fisik** | Prioritas: **web kasir PWA + IndexedDB queue** (Fase 2); Expo mobile opsional |
| **Vertical** | Tetap retail bahan bangunan (Q1 tidak berubah) |

**Dampak:** Fase 2 ditambah track Online Sales (Epic J) + offline PWA; Fase 3 tanpa F&B; MVP Sprint 1–4 **tidak berubah**.

---

## Lampiran B — Dokumen Terkait

- [VISION-ZAKI-MATURED.md](../requirements/VISION-ZAKI-MATURED.md)
- [2026-06-01-VISION-ZAKI-GAP-ANALYSIS.md](./2026-06-01-VISION-ZAKI-GAP-ANALYSIS.md)
- [FEATURE-BACKLOG.md](../requirements/FEATURE-BACKLOG.md)
- [ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md)
- [`.cursor/dokument rencana zaki.md`](../../.cursor/dokument%20rencana%20zaki.md) — **dokumen sumber asli** (referensi; § F&B tidak diadopsi)

---

*Notulen disusun Fitri Nugroho · diselaraskan Budi Santoso · Amendemen ADR-003 · 1 Juni 2026*
