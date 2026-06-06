# ADR-004: Epic J — Keputusan Discovery Terkunci (Q-J01–Q-J08)

> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Keputusan Arsitektur | Audience: semua tim, Pak Zaki

| Field | Nilai |
|-------|-------|
| **Status** | Diterima |
| **Tanggal** | 2 Juni 2026 |
| **Pemutus** | Pak Zaki (pemilik proyek) |
| **Opsi dipilih** | **Opsi 1 — Unlock Epic J (Track B)** |
| **Dokumentasi** | CEO Budi Santoso, tim (Rina, Dewi, Hendra, Maya, Fajar, Dimas) |
| **Referensi** | [EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md](../requirements/EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md), [ADR-003](./ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md), [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md) |

---

## Konteks

Sprint 12 menyelesaikan **discovery** Epic J (penjualan online web) tanpa implementasi kode. Delapan pertanyaan terbuka **Q-J01 … Q-J08** memblokir Track B di [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md).

Pada **2 Juni 2026**, Pak Zaki memilih **Opsi 1 — Unlock Epic J (Track B)** dengan mengadopsi **rekomendasi default tim** dari dokumen discovery (tidak ada override eksplisit per pertanyaan).

Keputusan ini mengunci scope MVP online Fase 2 dan membuka rantai: user story penuh (**Dewi**) → wireframe (**Maya**) → kontrak API (**Fajar**) → skeleton storefront (**Dimas**).

---

## Keputusan — Q-J01 s.d. Q-J08

| ID | Pertanyaan | **Jawaban terkunci** | Sumber | Rationale |
|----|------------|----------------------|--------|-----------|
| **Q-J01** | Pickup saja dulu, atau delivery wajib di MVP online? | **Pickup P0** · **Delivery P1** (boleh di sprint berikutnya setelah pickup stabil) | Default tim · Opsi 1 Pak Zaki | Mengurangi kompleksitas ongkir/radius di MVP; vertical bahan bangunan sering ambil sendiri di toko |
| **Q-J02** | Pelanggan wajib login atau guest checkout cukup? | **Guest checkout P0** · Registrasi/riwayat order **P1** | Default tim | Friction rendah untuk pelanggan proyek; akun opsional nanti |
| **Q-J03** | Bayar online wajib atau boleh COD/bayar di toko? | **Pembayaran digital (Midtrans) P0** · **Bayar di toko saat pickup P1** | Default tim | Konfirmasi order lebih andal dengan bayar online; COD pickup sebagai pelengkap operasional |
| **Q-J04** | Satu URL storefront per tenant atau per outlet? | **Satu URL per tenant** (`/store/{slug}` atau subdomain) · **Pilih outlet di checkout** | Default tim | Branding tenant tunggal; stok dan fulfillment tetap per `outletId` |
| **Q-J05** | Stok web real-time atau snapshot berkala? | **Real-time dengan cache pendek** (target TTL cache ≤ 60 detik) | Default tim | Minimalkan oversell; performa PDP tetap terjaga |
| **Q-J06** | Produk tanpa gambar boleh tampil di web? | **Tidak** — wajib gambar atau **placeholder generik** per tenant | Default tim | Katalog bahan bangunan butuh visual; placeholder menghindari halaman kosong |
| **Q-J07** | Harga web boleh berbeda dari kasir (promo online)? | **Sama dengan harga kasir** di Fase 2 MVP · Rule harga beda → **Fase 2b** / promo engine | Default tim | Satu sumber kebenaran harga; hindari konflik omnichannel di MVP |
| **Q-J08** | Siapa mengelola konten katalog web? | **Owner + Manager** (upload gambar, flag `sellOnline`, kategori web) | Default tim | Staff kasir tidak mengelola konten publik |

### Override Pak Zaki

| Item | Status |
|------|--------|
| Q-J01 … Q-J08 | **Tidak ada override** — semua mengikuti default discovery |
| Catatan tambahan | Track B **ACTIVE** paralel dengan Track A (offline polish) di Sprint 13 — lihat [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md) |

---

## Dampak pada Scope Epic J

| Area | Sebelum ADR-004 | Setelah ADR-004 |
|------|-----------------|-----------------|
| **Status Epic J** | Discovery (Sprint 12) | **Planning / Build prep** (Sprint 13 Track B) |
| **MVP checkout** | Belum pasti pickup vs delivery | **Pickup wajib**; delivery sprint lanjutan |
| **Identitas pelanggan** | Terbuka | **Guest**; login P1 |
| **Pembayaran** | Terbuka | **Midtrans web P0** |
| **Routing storefront** | Terbuka | **Per tenant** + pilih outlet |
| **Stok & harga web** | Terbuka | **Real-time + cache**; **harga = kasir** |
| **Katalog** | Terbuka | **Gambar/placeholder wajib** |
| **RBAC konten** | Terbuka | **Owner + Manager** |

### Item discovery yang masih terbuka (bukan Q-J)

Tetap ditunda ke RFC / workshop teknis — **bukan blocker** unlock Track B:

| Topik | Owner | Catatan |
|-------|-------|---------|
| Stok berkurang pada status `PAID` vs `READY` | Eko + Fajar | Spec J6.5 — default rekomendasi: **`PAID`** (dokumentasi di RFC API) |
| Biaya delivery (flat / km / manual) | Pak Zaki opsional | P1 — tidak menghalangi pickup MVP |
| TTL pembayaran expired (menit) | Arif + Fajar | Ikuti pola Midtrans kasir; usulan **60 menit** di RFC |
| Reserve stok vs cek final di checkout | Eko + Fajar | RFC `online_orders` |

---

## Pengumuman Tim

---
**Budi** · CEO  
Halo Pak Zaki, terima kasih — **Opsi 1** dan jawaban Q-J01–Q-J08 sudah dikunci di ADR ini. Track B Epic J **aktif** di Sprint 13 (planning + gate Maya/Fajar; tanpa kode produksi storefront sebelum wireframe + kontrak API).
---

## Handoff Log

| From | To | Task | Deliverable | Parallel OK? | Next action |
|------|-----|------|-------------|--------------|-------------|
| Budi · CEO | Dewi · Analyst | User story P0 + AC | [EPIC-J-USER-STORIES.md](../requirements/EPIC-J-USER-STORIES.md) | Ya (Track A) | AC US-J-01 … US-J-07 |
| Dewi · Analyst | Hendra · Planner | Sprint breakdown Track B | [SPRINT-13-PLAN.md](../requirements/SPRINT-13-PLAN.md) | Ya | Milestone & SP |
| Dewi · Analyst | Maya · UI/UX | Wireframe storefront P0 | [WIREFRAMES-STOREFRONT.md](../design/WIREFRAMES-STOREFRONT.md) | Tidak — setelah US freeze | Mobile-first P0 flows |
| Budi · CEO | Fajar · Senior Dev | RFC API `online_orders` | [ONLINE-ORDERS-RFC.md](../api/ONLINE-ORDERS-RFC.md) (DRAFT) | Ya setelah Maya gate | Review Eko + Arif → migrasi |
| Budi · CEO | Dimas · Senior Frontend | Skeleton route storefront | `apps/web` (post B4) | Tidak — tunggu Fajar kontrak | App skeleton Sprint 13 |
| Budi · CEO | Fitri · Docs | Indeks ADR-004 + Epic J | INDEX.md/json | Ya | Cross-link |

---

## Referensi

- [ADR-003](./ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md) — scope omnichannel  
- [EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md](../requirements/EPIC-J-ONLINE-STOREFRONT-DISCOVERY.md) — checklist J1–J9  
- [EPIC-J-USER-STORIES.md](../requirements/EPIC-J-USER-STORIES.md) — user story P0  
- [FEATURE-BACKLOG.md](../requirements/FEATURE-BACKLOG.md) — Epic J  
- [OFFLINE-SYNC.md](../algorithm/OFFLINE-SYNC.md) — kebijakan stok omnichannel  

---

*Disusun: Budi Santoso (CEO) · 2 Juni 2026 · Konfirmasi Pak Zaki: Opsi 1 — Unlock Epic J*
