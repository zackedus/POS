# ADR-002: Konfirmasi Visi Pak Zaki (Q1–Q6)

> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Keputusan Arsitektur | Audience: semua tim, Pak Zaki

| Field | Nilai |
|-------|-------|
| **Status** | Diterima |
| **Tanggal** | 1 Juni 2026 |
| **Pemutus** | Pak Zaki (pemilik proyek) |
| **Dokumentasi** | CEO Budi Santoso, tim (Rina, Dewi, Hendra, Fajar) |
| **Referensi** | [VISION-ZAKI-MATURED.md](../requirements/VISION-ZAKI-MATURED.md), [2026-06-01-VISION-ZAKI-DISCUSSION.md](../meetings/2026-06-01-VISION-ZAKI-DISCUSSION.md) |

---

## Konteks

Pada rapat matangkan visi (1 Juni 2026), tim mempublikasikan **6 pertanyaan terbuka** di [VISION-ZAKI-MATURED.md](../requirements/VISION-ZAKI-MATURED.md) sebelum perencanaan Fase 2 final. Pak Zaki telah mengonfirmasi semua jawaban pada tanggal yang sama.

Keputusan ini mengunci arah vertical produk, prioritas mobile, model bisnis MVP, stack backend, urutan fitur katalog Fase 2, dan perilaku hold bill.

---

## Keputusan

| # | Topik | Keputusan Pak Zaki |
|---|-------|-------------------|
| **Q1** | Vertical prioritas | **Retail — toko bahan bangunan** (building materials store) |
| **Q2** | Hold bill TTL | **TTL 30 menit** |
| **Q3** | Mobile Expo vs web kasir | **Web dulu; Expo Fase 2** |
| **Q4** | Model bisnis SaaS | **Satu paket MVP dulu** |
| **Q5** | Backend NestJS + Prisma | **Ya** — sesuai scaffold proyek |
| **Q6** | Varian vs bundling (minggu 9–10) | **Varian sebelum bundling** |
| **Amendemen** | Scope omnichannel & anti-F&B | Lihat **[ADR-003](./ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md)** — retail + online web + offline toko fisik; **F&B/meja/KDS OUT OF SCOPE permanen** |

---

## Dampak pada Roadmap

| Area | Sebelum konfirmasi | Setelah konfirmasi |
|------|-------------------|-------------------|
| **Vertical pilot** | Retail umum / F&B belum pasti | Katalog & UX disesuaikan **bahan bangunan** (satuan sak/batang/m², qty desimal, kategori material) |
| **MVP Sprint 1–4** | Tidak berubah | **Tidak berubah** — foundation + kasir web 1 outlet |
| **Sprint 2 (16–29 Jun)** | Master data + shift | + seed kategori bahan bangunan, satuan khusus, AC hold TTL 30m |
| **Fase 2 awal (minggu 9–10)** | Varian & bundling paralel | **Sprint 5: varian** → Sprint 6+: bundling |
| **Mobile Expo** | Opsional akhir MVP | **Fase 2** setelah API kontrak stabil |
| **F&B (meja, KDS)** | Fase 3 jika Q1 F&B | **OUT OF SCOPE permanen** — [ADR-003](./ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md) |
| **Online + offline toko** | Belum terdokumentasi | **Fase 2** — web storefront + PWA offline (ADR-003) |
| **SaaS billing** | Tier direncanakan | **Satu paket** — tanpa feature flag tier di MVP |
| **Arsitektur** | NestJS vs Supabase di dokumen sumber | **NestJS + Prisma** — tidak ada migrasi BaaS |

### Timeline indikatif (tidak mengubah 8 minggu MVP)

```
Jun 2026          Jul 2026          Agu 2026
│ Sprint 1–2      │ Sprint 3–4      │ Fase 2 start
│ Foundation      │ Kasir MVP web   │ Varian (minggu 9–10)
│ Master data     │ Hold TTL 30m    │ Bundling setelah varian
└─────────────────┴─────────────────┴── Expo mobile F2
```

---

## Pengumuman Tim

---
**Budi** · CEO  
Halo Pak Zaki, terima kasih — keenam keputusan visi sudah dikunci dan dipublikasikan di ADR ini serta [VISION-ZAKI-MATURED.md](../requirements/VISION-ZAKI-MATURED.md). Sprint 1 **tidak berubah**; tim lanjut eksekusi foundation.
---

---
**Budi** · CEO → **Hendra** · Project Planner  
Halo Hendra, Q1–Q6 confirmed. Tolong finalkan [SPRINT-2-PLAN.md](../requirements/SPRINT-2-PLAN.md) dengan domain bahan bangunan di master data. Varian dijadwalkan area Sprint 5 (minggu 9–10), bundling setelahnya.
---

---
**Budi** · CEO → **Dewi** · Business Analyst  
Halo Dewi, update AC Epic B: satuan sak/batang/m²/kg, qty desimal, hold bill **expires_at 30 menit**. User story varian prioritas Sprint 5; bundling Sprint 6+.
---

---
**Budi** · CEO → **Rina** · Spesialis POS Domain  
Halo Rina, vertical pilot = **retail bahan bangunan**. Subsection domain sudah di VISION-ZAKI-MATURED — tolong review checklist Sprint 2 master data (kategori seed, implikasi berat/volume).
---

---
**Budi** · CEO → **Fajar** · Senior Developer  
Halo Fajar, Q5 locked NestJS+Prisma. Sprint 2: CRUD master data + shift API; RFC varian tetap target akhir Sprint 1. Hold schema: `expires_at` + TTL 30m di Sprint 4.
---

## Handoff Log

| From | To | Task | Deliverable | Parallel OK? | Next action |
|------|-----|------|-------------|--------------|-------------|
| Budi · CEO | Hendra · Planner | Sprint 2 plan | SPRINT-2-PLAN.md | Tidak | Hendra assign task per agent |
| Budi · CEO | Dewi · Analyst | AC Epic B bahan bangunan | User stories S2 | Tidak | AC hold TTL, satuan |
| Budi · CEO | Rina · POS | Review domain subsection | VISION § Domain Bahan Bangunan | Ya | Validasi kategori seed |
| Budi · CEO | Fajar · Senior Dev | Master data API S2 | Catalog + shift modules | Tidak setelah S1 schema | Implement post-Sprint 1 |
| Budi · CEO | Fitri · Docs | Indeks ADR-002 | INDEX.md/json | Ya | Cross-link |

---

## Referensi

- [VISION-ZAKI-MATURED.md](../requirements/VISION-ZAKI-MATURED.md) — § Konfirmasi Pak Zaki, § Domain Bahan Bangunan
- [FEATURE-BACKLOG.md](../requirements/FEATURE-BACKLOG.md) — reprioritisasi varian/bundling/F&B
- [SPRINT-2-PLAN.md](../requirements/SPRINT-2-PLAN.md)
- [2026-06-01-VISION-ZAKI-DISCUSSION.md](../meetings/2026-06-01-VISION-ZAKI-DISCUSSION.md) — Lampiran A & C
- [ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md](./ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md) — amendemen scope omnichannel

---

*Disusun Budi Santoso · Diindeks Fitri Nugroho · 1 Juni 2026 · Cross-ref ADR-003*
