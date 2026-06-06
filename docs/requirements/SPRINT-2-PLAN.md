> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Hendra, Fajar, Dimas, Maya, Rina

# Sprint 2 Plan — Master Data & Buka Shift

> **Sprint Master:** Hendra Pratama  
> **Periode:** 16–29 Juni 2026 (2 minggu)  
> **Mengikuti:** [SPRINT-1-PLAN.md](./SPRINT-1-PLAN.md) (2–15 Jun 2026)  
> **Referensi:** [FEATURE-BACKLOG.md](./FEATURE-BACKLOG.md) Epic B, [VISION-ZAKI-MATURED.md](./VISION-ZAKI-MATURED.md), [ADR-002-PAK-ZAKI-CONFIRMATIONS.md](../decisions/ADR-002-PAK-ZAKI-CONFIRMATIONS.md)

> **Prasyarat:** Sprint 1 selesai — auth, schema MVP, login web, Docker/CI.  
> **Konfirmasi Pak Zaki:** vertical **retail bahan bangunan**; hold bill TTL 30 menit (implementasi penuh Sprint 4, AC direferensikan di sini).

---

## Status Penutupan (2 Juni 2026)

- **Kesimpulan:** scope utama Sprint 2 selesai dan siap ditutup.
- **S2-14 (staging deploy):** tetap optional, tidak dijadikan blocker close.
- **Hardening akhir Sprint 2 tercapai:** backend test auth/shift risk path + smoke validasi endpoint penting (`auth`, `categories`, `products`, `shifts`) + sinkronisasi dokumentasi progress/changelog.

---

## Sprint Goal

> **"Manager dan kasir bisa mengelola katalog produk bahan bangunan (kategori, satuan, produk flat) dan kasir bisa membuka shift dengan saldo awal kas — fondasi siap untuk layar kasir Sprint 3."**

**Bukan goal Sprint 2:** transaksi checkout, QRIS, hold/recall, printer, varian SKU, mobile Expo.

---

## Domain — Retail Bahan Bangunan (Rina)

| Kebutuhan | Implementasi Sprint 2 | Catatan |
|-----------|----------------------|---------|
| Satuan: sak, batang, m², kg, liter, dus | Seed `units` + CRUD satuan | Minimal 6 satuan default per tenant |
| Kategori material | Seed contoh: Semen, Cat, Pipa, Kayu/Besi, Keramik, Alat, Saniter | 1 level; nested Fase 2 |
| Produk flat | SKU, barcode, harga jual, `cost_price` opsional | Tanpa varian di S2 |
| Qty desimal | Schema/API siap `Decimal` qty | Validasi UI Sprint 3 |
| Barcode/SKU panjang bervariasi | Index + validasi panjang | Scan Sprint 3 |

---

## Scope Sprint 2

### In Scope ✅

| ID | Task | Assignee | SP |
|----|------|----------|-----|
| S2-01 | API CRUD kategori (tenant-scoped) | Fajar | 5 |
| S2-02 | API CRUD satuan (`units`) | Fajar | 3 |
| S2-03 | API CRUD produk flat (SKU, barcode, unit_id, harga, cost_price) | Fajar | 8 |
| S2-04 | Seed kategori + satuan bahan bangunan (demo tenant) | Fajar | 2 |
| S2-05 | API buka shift + get shift aktif per kasir/outlet | Fajar | 8 |
| S2-06 | API resolve shift conflict (manager) | Fajar | 3 |
| S2-07 | Grid produk kasir API (list + filter kategori) | Fajar | 5 |
| S2-08 | UI master kategori (manager) | Dimas | 5 |
| S2-09 | UI master produk + satuan (manager) | Dimas | 8 |
| S2-10 | UI buka shift (SCR-S01) | Dimas | 5 |
| S2-11 | Wireframe SCR-K01 grid + SCR-S01 approval | Maya | 3 |
| S2-12 | User story + AC Epic B (hold TTL 30m referensi) | Dewi | 5 |
| S2-13 | Glosarium satuan bahan bangunan (merchant) | Fitri | 2 |
| S2-14 | Staging deploy (optional) | Yoga | 3 |
| S2-15 | Sprint 3 backlog refinement | Hendra | 2 |
| S2-16 | Backend automated test + smoke docs (SCR-S02/auth/master/shift) | Fajar + Fitri | 3 |

**Total estimasi:** ~64 SP → **commit ~45 SP** (cut S2-14 jika overload)

### Out of Scope ❌

- Transaksi / keranjang / checkout
- Hold bill implementasi (AC: TTL 30 menit — Sprint 4)
- QRIS, printer
- Varian SKU, bundling (Sprint 5+)
- Mobile Expo
- Multi-outlet

---

## Acceptance Criteria Highlights (Dewi)

### Master Produk

- [x] Produk wajib punya: nama, SKU unik per tenant, `unit_id`, harga jual ≥ 0
- [x] `cost_price` opsional; jika diisi, tampil di form manager
- [x] Barcode opsional; unik per tenant jika diisi
- [x] Kategori opsional; filter grid kasir by `category_id` (`GET /api/v1/products/grid?categoryId=...`)

### Satuan Bahan Bangunan

- [x] Seed minimal: `sak`, `batang`, `m²`, `kg`, `liter`, `dus`
- [ ] Satuan tampil di label produk (mis. "Semen 40 kg — **sak**")

### Buka Shift

- [ ] Kasir tidak bisa transaksi tanpa shift `OPEN` (validasi API siap untuk S3)
- [x] Satu shift `OPEN` per kasir per outlet; conflict → manager resolve
- [x] Saldo awal kas ≥ 0; tercatat di `cash_sessions`
- [x] SCR-S02 web: saat conflict, UI menampilkan detail shift aktif + aksi force-close untuk role MANAGER/OWNER
- [x] Kasir non-manager melihat instruksi eskalasi ke manager saat conflict shift
- [x] Automated test minimal untuk `SHIFT_ALREADY_OPEN` + manager `force-close` tersedia di backend

### UX Master Data (Manager)

- [x] Halaman kategori menampilkan status loading/error/success yang jelas setelah create/edit/delete
- [x] Halaman produk menampilkan status loading/error/success yang jelas setelah create/edit/delete

### Hold Bill (referensi — implementasi Sprint 4)

- [ ] **AC-REF-HOLD:** Hold bill expire **30 menit** setelah create (`expires_at`); recall hanya sebelum expire — [ADR-002](../decisions/ADR-002-PAK-ZAKI-CONFIRMATIONS.md) Q2

---

## Tasks per Agent

### Fajar Ramadhan · Senior Developer (Backend/API)

| Task | Deliverable | Due |
|------|-------------|-----|
| Catalog module (kategori, satuan, produk) | `apps/api/src/modules/catalog/` | 22 Jun |
| Shift module (buka shift, active, conflict) | `apps/api/src/modules/shift/` | 24 Jun |
| Grid produk endpoint | `GET /products/grid` | 26 Jun |
| Seed bahan bangunan | `prisma/seed.ts` update | 20 Jun |

**Handoff:** Fajar → Dimas (OpenAPI / contract freeze 20 Jun) sebelum UI master data.

---

### Dimas Pratama · Senior Frontend Developer

| Task | Deliverable | Due |
|------|-------------|-----|
| Halaman master kategori | `apps/web/src/app/(dashboard)/categories/` | 24 Jun |
| Halaman master produk + satuan | `apps/web/src/app/(dashboard)/products/` | 27 Jun |
| Layar buka shift SCR-S01 | `apps/web/src/app/(pos)/shift/open/` | 27 Jun |

**Gate:** Maya approval wireframe SCR-S01 + SCR-K01 sebelum implement final (≥ 18 Jun).

---

### Maya Anggraini · UI/UX Specialist

| Task | Deliverable | Due |
|------|-------------|-----|
| Wireframe SCR-K01 (grid kasir) final | [WIREFRAMES-KASIR.md](../design/WIREFRAMES-KASIR.md) | 18 Jun |
| Wireframe SCR-S01 buka shift | Same doc | 18 Jun |
| Touch target review master data forms | Approval note | 20 Jun |

**Handoff:** Maya → Dimas — Parallel OK? **Tidak** untuk implement UI sebelum approval.

---

### Rina Wulandari · Spesialis POS Domain

| Task | Deliverable | Due |
|------|-------------|-----|
| Review seed kategori bahan bangunan | Comment di PR seed / checklist | 19 Jun |
| Validasi satuan & edge case qty desimal | Note di Dewi AC | 20 Jun |

---

### Dewi Kartika · Business Analyst

| Task | Deliverable | Due |
|------|-------------|-----|
| User stories Epic B lengkap | `docs/requirements/` atau linked issues | 17 Jun |
| AC hold TTL 30m (referensi S4) | Epic D cross-ref | 17 Jun |

---

### Eko Susilo · Algorithm Specialist

| Task | Deliverable | Due |
|------|-------------|-----|
| Review PPN spec (carry dari S1) | Ready for S3 wiring | 22 Jun |
| Stub price-tier-by-qty (Fase 2) | `docs/algorithms/` draft optional | 29 Jun |

---

### Arif Hidayat · Integration Specialist

| Task | Deliverable | Due |
|------|-------------|-----|
| Barcode scanner readiness note (web) | `docs/integration/` | 26 Jun |

---

### Yoga Permana · DevOps Engineer

| Task | Deliverable | Due |
|------|-------------|-----|
| Staging environment (optional) | `docker/` / deploy doc | 29 Jun |

---

### Fitri Nugroho · Documentation Specialist

| Task | Deliverable | Due |
|------|-------------|-----|
| Glosarium satuan merchant | `docs/guides/` atau appendix backlog | 22 Jun |
| Smoke test case auth/master/shift + changelog Sprint 2 | `docs/testing/SPRINT-2-BACKEND-SMOKE.md`, `CHANGELOG.md` | 29 Jun |

---

### Hendra Pratama · Project Planner

| Task | Deliverable | Due |
|------|-------------|-----|
| Sprint 2 tracking + burndown | Board / doc | ongoing |
| Sprint 3 prep (transaksi core) | Backlog refined | 29 Jun |

---

## Ceremonies

| Ceremony | Waktu | Peserta |
|----------|-------|---------|
| Sprint Planning | 16 Jun | All |
| Mid-sprint check | 23 Jun | Budi, Hendra, Fajar, Dimas |
| Sprint Review | 29 Jun | All + Pak Zaki (demo master data + buka shift) |
| Retrospective | 29 Jun | All |

---

## Risiko Sprint 2

| Risiko | Mitigasi |
|--------|----------|
| Schema churn produk | Freeze catalog schema 18 Jun |
| Dimas blocked tanpa wireframe | Maya SCR-K01/S01 by 18 Jun |
| Satuan salah untuk pilot | Rina review seed 19 Jun |
| Scope creep varian | Hendra gate — varian Sprint 5 only |

---

## Handoff ke Sprint 3

| From | To | Deliverable | Next action |
|------|-----|-------------|-------------|
| Fajar | Fajar | Catalog + shift API merged | Keranjang + transaksi module |
| Maya | Dimas | SCR-K01 approved | Implement layar kasir |
| Dewi | Dewi | Epic C user stories | AC scan, checkout cash |
| Eko | Fajar | PPN-SPEC approved | Wire tax Sprint 3 |

---

*Disusun Hendra Pratama · Disetujui Budi Santoso · 1 Juni 2026*
