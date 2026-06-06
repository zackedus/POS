> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Rina, Dewi, Hendra, Maya, Fajar, Dimas

# Epic J — Online Storefront Discovery Checklist

> **Epic:** J — Online Sales (Web) · Omnichannel Retail  
> **Fase:** 2 — Growth ([ADR-003](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md))  
> **Status:** **Discovery CLOSED** · **Planning ACTIVE** (Opsi 1 — Unlock Epic J, 2 Jun 2026)  
> **Disusun:** Rina Wulandari (domain) → Dewi Kartika (user story stubs → AC penuh)  
> **Tanggal:** 2 Juni 2026  
> **Keputusan terkunci:** [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md) · User stories: [EPIC-J-USER-STORIES.md](./EPIC-J-USER-STORIES.md)  
> **Referensi:** [FEATURE-BACKLOG.md](./FEATURE-BACKLOG.md) Epic J · [VISION-ZAKI-MATURED.md](./VISION-ZAKI-MATURED.md) · [SPRINT-13-PLAN.md](./SPRINT-13-PLAN.md)

---

## Tujuan Discovery

Menyiapkan **kejelasan bisnis dan batas scope** sebelum wireframe (**Maya**), kontrak API (**Fajar**), dan build storefront (**Dimas**). Output Sprint 12 lane ini:

1. Checklist domain P0/P1/P2 untuk penjualan online web.  
2. **User story stubs** (bukan AC penuh, bukan estimasi SP).  
3. Daftar **pertanyaan terbuka** untuk konfirmasi Pak Zaki.  
4. Handoff eksplisit ke Hendra (sprint breakdown implementasi) setelah discovery **sign-off**.

**Bukan scope dokumen ini:** implementasi API/UI, schema Prisma final, wireframe pixel, test plan UAT.

---

## Selaras ADR-003

| Keputusan ADR-003 | Implikasi discovery |
|-------------------|---------------------|
| **Online** = web storefront pelanggan (bukan marketplace inti) | Fokus katalog publik + checkout web → POS backend sama |
| **Toko fisik** = web kasir staff (MVP selesai) | Order online masuk antrian fulfillment outlet yang sama |
| **Offline PWA** prioritas Fase 2 (Sprint 11 fondasi) | Sync stok/order harus kompatibel dengan kebijakan [OFFLINE-SYNC.md](../algorithm/OFFLINE-SYNC.md) |
| **Vertical pilot** toko bahan bangunan | Satuan berat/volume, pickup berat, delivery radius, MOQ |
| **F&B / meja / KDS** | **OUT OF SCOPE permanen** — tidak masuk checklist |

---

## Anti-Scope (Jangan Masuk Epic J MVP Fase 2)

- [ ] Meja, antrian tamu, split bill, KDS — **CANCELLED** ADR-003  
- [ ] Marketplace Tokopedia/Shopee sebagai kanal utama — **Fase 3** (Epic K)  
- [ ] Aplikasi mobile native storefront pelanggan — defer; web responsive dulu  
- [ ] Loyalty / poin / membership tier penuh — Could, sprint terpisah  
- [ ] Multi-warehouse kompleks — Fase 3; Fase 2 asumsikan 1 gudang per outlet  
- [ ] Akuntansi otomatis (Jurnal/Accurate) — integrasi terpisah  

---

## Discovery Checklist — Domain (Rina)

Centang saat **terjawab** di workshop internal atau konfirmasi Pak Zaki. Label: **P0** wajib MVP online Fase 2 · **P1** penting · **P2** nice-to-have.

### J1 — Identitas & Akses Pelanggan

| # | Item | Prioritas | Status | Catatan / pertanyaan |
|---|------|-----------|--------|----------------------|
| J1.1 | Guest checkout tanpa registrasi | P0 | ☑ | Q-J02 CONFIRMED |
| J1.2 | Registrasi akun pelanggan (email/HP) | P1 | ☐ | Perlu untuk riwayat order? |
| J1.3 | Login pelanggan lihat riwayat order | P1 | ☐ | |
| J1.4 | OTP verifikasi HP saat checkout | P1 | ☐ | Anti order palsu |
| J1.5 | Satu tenant = satu brand storefront URL | P0 | ☑ | Q-J04: `/store/{slug}` atau subdomain |
| J1.6 | Multi-outlet: pelanggan pilih cabang pickup | P0 | ☑ | Q-J04 CONFIRMED |

### J2 — Katalog Web Publik

| # | Item | Prioritas | Status | Catatan |
|---|------|-----------|--------|---------|
| J2.1 | Daftar produk aktif + harga jual publik | P0 | ☐ | Sinkron master data POS |
| J2.2 | Kategori navigasi (semen, cat, pipa, …) | P0 | ☐ | |
| J2.3 | Gambar produk (min 1 per SKU) | P0 | ☑ | Q-J06: placeholder wajib · Q-J08: Owner+Manager upload |
| J2.4 | Varian produk (ukuran/warna) di katalog | P1 | ☐ | Reuse Sprint 5 variant model |
| J2.5 | Satuan jual & konversi (zak, kg, batang) | P0 | ☐ | Tampilan harga per satuan |
| J2.6 | Stok tersedia / habis (real-time atau cached) | P0 | ☑ | Q-J05: real-time + cache ≤ 60s |
| J2.7 | MOQ / kelipatan order (contoh semen min 1 zak) | P1 | ☐ | Vertical bahan bangunan |
| J2.8 | Produk disembunyikan dari web tapi tetap di kasir | P1 | ☐ | Flag `sellOnline` |
| J2.9 | Pencarian SKU/nama | P0 | ☐ | |
| J2.10 | SEO dasar (meta title, slug produk) | P2 | ☐ | |

### J3 — Keranjang & Checkout

| # | Item | Prioritas | Status | Catatan |
|---|------|-----------|--------|---------|
| J3.1 | Tambah/kurangi qty keranjang | P0 | ☐ | |
| J3.2 | Persist keranjang (session / local) | P1 | ☐ | |
| J3.3 | Validasi stok saat checkout | P0 | ☐ | Reserve stok atau cek final? |
| J3.4 | Subtotal + PPN 11% konsisten kasir | P0 | ☐ | Handoff **Eko** |
| J3.5 | Diskon kode promo online | P2 | ☐ | Defer ke promo engine |
| J3.6 | Catatan pelanggan per order | P1 | ☐ | Contoh: warna cat, alamat detail |
| J3.7 | Batas waktu checkout (session TTL) | P2 | ☐ | |

### J4 — Fulfillment: Pickup & Delivery

| # | Item | Prioritas | Status | Catatan |
|---|------|-----------|--------|---------|
| J4.1 | Mode **pickup** di toko (gratis) | P0 | ☑ | Q-J01: pickup P0 |
| J4.2 | Mode **delivery** dengan alamat | P1 | ☐ | Q-J01: delivery P1 (US-J-05) |
| J4.3 | Biaya delivery: flat / per km / manual | P1 | ☐ | Konfirmasi Pak Zaki |
| J4.4 | Slot waktu pickup (pagi/siang/sore) | P1 | ☐ | |
| J4.5 | Radius delivery maks per outlet | P1 | ☐ | |
| J4.6 | Order berat/volume — flag perlu armada | P2 | ☐ | Bahan bangunan |
| J4.7 | Bukti serah terima (foto/tanda tangan) | P2 | ☐ | |

### J5 — Pembayaran Online

| # | Item | Prioritas | Status | Catatan |
|---|------|-----------|--------|---------|
| J5.1 | Midtrans (VA, QRIS, e-wallet) checkout web | P0 | ☑ | Q-J03 CONFIRMED · **Arif** |
| J5.2 | Bayar di toko saat pickup (cash/transfer) | P1 | ☑ | Q-J03: P1 |
| J5.3 | Webhook idempotent status bayar | P0 | ☐ | |
| J5.4 | Expired payment → batalkan order | P0 | ☐ | TTL menit? |
| J5.5 | Refund order online — alur terpisah | P1 | ☐ | Reuse void/refund POS? |

### J6 — Order → POS & Operasional Toko

| # | Item | Prioritas | Status | Catatan |
|---|------|-----------|--------|---------|
| J6.1 | Order web → record `online_orders` terpisah dari `transactions` | P0 | ☐ | Kontrak **Fajar** |
| J6.2 | Konversi order `PAID` → fulfillment queue kasir | P0 | ☐ | |
| J6.3 | Status: `NEW` → `CONFIRMED` → `READY` → `COMPLETED` / `CANCELLED` | P0 | ☐ | |
| J6.4 | Kasir/owner update status dari dashboard | P0 | ☐ | |
| J6.5 | Stok berkurang pada status mana? (`PAID` vs `READY`) | P0 | ☐ | **Eko** + konflik offline |
| J6.6 | Notifikasi order baru ke kasir (banner/socket) | P1 | ☐ | Could di backlog |
| J6.7 | Cetak struk pickup / delivery note | P1 | ☐ | |
| J6.8 | Nomor order human-readable (WEB-YYYYMMDD-####) | P0 | ☐ | |

### J7 — Sinkronisasi Stok & Harga Omnichannel

| # | Item | Prioritas | Status | Catatan |
|---|------|-----------|--------|---------|
| J7.1 | Harga jual web = harga kasir (default) | P0 | ☑ | Q-J07: sama dulu · Fase 2b promo |
| J7.2 | Penjualan kasir fisik kurangi stok web | P0 | ☐ | |
| J7.3 | Penjualan web kurangi stok kasir fisik | P0 | ☐ | |
| J7.4 | Konflik stok (web order vs offline sale) | P0 | ☐ | Align OFFLINE-SYNC server-wins |
| J7.5 | Produk hanya online / hanya toko | P1 | ☐ | |
| J7.6 | Delay sync acceptable (N detik) | P1 | ☐ | |

### J8 — Non-Functional & Compliance

| # | Item | Prioritas | Status | Catatan |
|---|------|-----------|--------|---------|
| J8.1 | Halaman storefront HTTPS, mobile-first | P0 | ☐ | |
| J8.2 | PDP load < 3s (3G) — target | P1 | ☐ | |
| J8.3 | PDP tidak expose HPP / margin | P0 | ☐ | |
| J8.4 | PII pelanggan (nama, HP, alamat) — retensi | P1 | ☐ | |
| J8.5 | Rate limit checkout / anti bot | P1 | ☐ | |

### J9 — Vertical Toko Bahan Bangunan (Pilot)

| # | Item | Prioritas | Status | Catatan |
|---|------|-----------|--------|---------|
| J9.1 | Produk bulk (semen, pasir) — satuan & MOQ | P0 | ☐ | |
| J9.2 | Pickup kendaraan besar / parkir | P2 | ☐ | |
| J9.3 | Estimasi berat order untuk delivery | P1 | ☐ | |
| J9.4 | SKU dengan panjang/potongan (pipa) — defer custom cut? | P2 | ☐ | |

---

## Pertanyaan Terbuka — Konfirmasi Pak Zaki

> **Status:** ✅ **CONFIRMED** — Pak Zaki memilih **Opsi 1 (Unlock Epic J)** · 2 Juni 2026 · Semua jawaban = default tim · Detail: [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md)

| ID | Pertanyaan | Dampak | Jawaban terkunci | Status |
|----|------------|--------|------------------|--------|
| Q-J01 | Pickup saja dulu, atau delivery wajib di MVP online? | J4 scope | **Pickup P0**, delivery **P1** | ✅ CONFIRMED |
| Q-J02 | Pelanggan wajib login atau guest checkout cukup? | J1 | **Guest checkout P0** | ✅ CONFIRMED |
| Q-J03 | Bayar online wajib atau boleh COD/bayar di toko? | J5 | **Midtrans P0** + bayar di toko **P1** | ✅ CONFIRMED |
| Q-J04 | Satu URL storefront per tenant atau per outlet? | Routing web | **Per tenant** + pilih outlet di checkout | ✅ CONFIRMED |
| Q-J05 | Stok web real-time atau snapshot berkala (mis. 60 detik)? | J7 perf | **Real-time** + cache pendek (≤ 60 detik) | ✅ CONFIRMED |
| Q-J06 | Produk tanpa gambar boleh tampil di web? | J2 | **Tidak** — placeholder wajib | ✅ CONFIRMED |
| Q-J07 | Harga web boleh berbeda dari kasir (promo online)? | J7 + Eko | **Sama dengan kasir** (promo beda → Fase 2b) | ✅ CONFIRMED |
| Q-J08 | Siapa yang mengelola konten katalog web (owner vs staff)? | RBAC | **Owner + Manager** | ✅ CONFIRMED |

---

## User Story Stubs (Dewi)

> Format stub untuk backlog — **AC detail, API, dan wireframe ditunda** ke sprint implementasi setelah Maya + Fajar sign-off.

### US-J-01 — Katalog publik

**Sebagai** pelanggan toko bahan bangunan,  
**saya ingin** melihat katalog produk dengan kategori, harga, dan status stok di web,  
**agar** saya bisa memilih barang sebelum order.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P0 |
| Depends | Master produk, gambar, outlet scope |

---

### US-J-02 — Detail produk

**Sebagai** pelanggan,  
**saya ingin** membuka halaman detail produk (gambar, satuan, varian, harga),  
**agar** saya yakin membeli SKU yang benar.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P0 |
| Depends | US-J-01, variant model |

---

### US-J-03 — Keranjang belanja

**Sebagai** pelanggan,  
**saya ingin** menambah/mengubah qty item di keranjang,  
**agar** saya bisa checkout sekali untuk beberapa SKU.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P0 |
| Depends | US-J-01 |

---

### US-J-04 — Checkout pickup

**Sebagai** pelanggan,  
**saya ingin** memilih pickup di cabang terdekat dan mengisi data kontak,  
**agar** saya bisa ambil barang di toko tanpa antre panjang di kasir.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P0 |
| Depends | Multi-outlet, US-J-03 |

---

### US-J-05 — Checkout delivery

**Sebagai** pelanggan,  
**saya ingin** memasukkan alamat pengiriman dan melihat estimasi biaya kirim,  
**agar** barang diantar ke lokasi proyek saya.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P1 (Q-J01: delivery P1 — pickup P0) |
| Depends | US-J-03, kebijakan ongkir |

---

### US-J-06 — Pembayaran digital (Midtrans)

**Sebagai** pelanggan,  
**saya ingin** membayar via QRIS/VA/e-wallet saat checkout web,  
**agar** order langsung dikonfirmasi sistem.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P0 |
| Depends | **Arif** Midtrans web, US-J-03 |

---

### US-J-07 — Order masuk ke POS

**Sebagai** owner/kasir,  
**saya ingin** order web yang sudah dibayar muncul di antrian fulfillment outlet,  
**agar** tim toko menyiapkan barang seperti order walk-in.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P0 |
| Depends | API online orders (**Fajar**) |

---

### US-J-08 — Update status order

**Sebagai** kasir/manager,  
**saya ingin** mengubah status order web (dikonfirmasi → siap diambil/dikirim → selesai),  
**agar** pelanggan dan operasional toko selaras.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P0 |
| Depends | US-J-07 |

---

### US-J-09 — Stok konsisten omnichannel

**Sebagai** owner,  
**saya ingin** stok yang terlihat di web sama dengan ketersediaan di toko fisik,  
**agar** tidak terjadi oversell saat ada penjualan paralel kasir + online.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P0 |
| Depends | **Eko** pricing/stock policy, offline sync |

---

### US-J-10 — Notifikasi order baru (Could)

**Sebagai** kasir,  
**saya ingin** mendapat alert saat ada order web baru,  
**agar** saya segera memproses tanpa refresh manual.

| Field | Nilai stub |
|-------|------------|
| Epic | J |
| Prioritas | P2 / Could |
| Depends | US-J-07, Socket.io |

---

## Kriteria Selesai Discovery (Sprint 12)

- [x] Checklist J1–J9: item **P0** terjawab via ADR-004 + default tertulis (item P1/P2 tetap di backlog)  
- [x] Q-J01 … Q-J08: **CONFIRMED** — [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md)  
- [x] User story P0 US-J-01 … US-J-07 + AC — [EPIC-J-USER-STORIES.md](./EPIC-J-USER-STORIES.md)  
- [x] Handoff ke **Hendra** — Track B ACTIVE di [SPRINT-13-PLAN.md](./SPRINT-13-PLAN.md)  
- [ ] Handoff ke **Maya** — wireframe storefront P0 (**in progress** Sprint 13)  
- [ ] Handoff ke **Fajar** — RFC API `online_orders` (**in progress** setelah Maya gate)  

**Tidak termasuk:** kode produksi storefront, migration Prisma final, UAT eksekusi storefront penuh.

---

## Handoff Log

| From | To | Task | Deliverable | Parallel OK? | Next action |
|------|-----|------|-------------|--------------|-------------|
| Pak Zaki | Budi · CEO | Opsi 1 — Unlock Epic J | [ADR-004](../decisions/ADR-004-EPIC-J-DEFAULTS-LOCKED.md) | — | Track B aktif |
| Dewi · Analyst | Hendra · Planner | Breakdown sprint Track B | [SPRINT-13-PLAN.md](./SPRINT-13-PLAN.md) | Ya (Track A) | Milestone B1–B5 |
| Dewi · Analyst | Maya · UI/UX | Wireframe storefront P0 | `docs/design/` (TBD) | Tidak — tunggu US freeze | Wireframe mobile-first guest+pickup |
| Dewi · Analyst | Fajar · Senior Dev | Kontrak API `online_orders` | RFC/OpenAPI (TBD) | Tidak — tunggu Maya | Prisma RFC stub |
| Dewi · Analyst | Dimas · Senior Frontend | Skeleton app storefront | Route group `/store` (TBD) | Tidak — tunggu Fajar B4 | Scaffold Sprint 13 |
| Rina · POS | Eko · Algorithm | Stok/harga omnichannel | Spec J6.5, J7 | Ya | Review saat RFC |

---

## Referensi

- [ADR-003](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md)  
- [FEATURE-BACKLOG.md](./FEATURE-BACKLOG.md) — Epic J  
- [OFFLINE-SYNC.md](../algorithm/OFFLINE-SYNC.md)  
- [SPRINT-11-CLOSURE.md](../sprint/SPRINT-11-CLOSURE.md) — handoff Epic J discovery  
- [SPRINT-12-PLAN.md](./SPRINT-12-PLAN.md) — Track B discovery  

---

*Disusun: Rina Wulandari & Dewi Kartika · 2 Juni 2026*
