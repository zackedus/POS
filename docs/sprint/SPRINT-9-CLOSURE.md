> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Closure | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Fitri

# Sprint 9 — Closure Report (Gabungan)

> **Tanggal closure:** 2 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Referensi:** [SPRINT-9-PROGRESS.md](./SPRINT-9-PROGRESS.md), [SPRINT-9-UAT-FINAL.md](../testing/SPRINT-9-UAT-FINAL.md), [SPRINT-8-CLOSURE.md](./SPRINT-8-CLOSURE.md)

---

## Status Sprint

- **Status akhir Sprint 9:** **CLOSED** (backend + frontend/UX/docs)
- **Fokus:** export laporan harian, multi-outlet API, shell admin terintegrasi, picker + tombol ekspor web
- **Scope:** CSV/JSON export, list outlets, dashboard shell — tanpa PDF terjadwal / konsolidasi lintas cabang

---

## Ringkasan Deliverables

| Area | Deliverable | Status |
|------|-------------|--------|
| Export harian | `GET /reports/daily/export` | ✅ |
| Multi-outlet API | `GET /reports/outlets` + aturan `outletId` | ✅ |
| CSV util + BOM | `daily-export.util.ts` | ✅ |
| Test SCR-R03/R04 | `reports.service.test.ts` + util test | ✅ |
| Docs sprint 9 | PLAN + PROGRESS + CLOSURE + UAT + INDEX | ✅ |
| UAT final | [SPRINT-9-UAT-FINAL.md](../testing/SPRINT-9-UAT-FINAL.md) | ✅ PASS |
| Admin shell web | `AdminLayout` + master/shift | ✅ |
| Outlet picker + export UI | `/reports/outlets` + CSV export | ✅ |
| Test web | 33/33 vitest | ✅ |

---

## Endpoint Baru / Diperkuat

| Method | Path | RBAC | Catatan |
|--------|------|------|---------|
| GET | `/api/v1/reports/daily/export` | OWNER, MANAGER | `format=json` (default) atau `format=csv` |
| GET | `/api/v1/reports/outlets` | OWNER, MANAGER | Owner: semua outlet tenant; manager: assigned only |
| GET | `/api/v1/reports/daily` | OWNER, MANAGER | `outletId` wajib jika JWT >1 outlet |

**Query bersama:** `outletId` (UUID), `date` (`YYYY-MM-DD`, opsional, default hari ini WIB).

---

## Verifikasi Akhir (@barokah/api)

| Verifikasi | Hasil |
|------------|-------|
| lint | ✅ |
| typecheck | ✅ |
| test | ✅ 45/45 |
| build | ✅ |

---

## Uji Manual Pak Zaki (Backend, ~3 menit)

1. Login owner → `GET /api/v1/reports/outlets` → daftar cabang tampil.
2. `GET /api/v1/reports/daily/export?outletId=<id>&date=2026-06-02&format=csv` → file CSV terunduh.
3. `format=json` → respons envelope berisi `exportedAt` + `report`.
4. Login manager cabang lain → `outletId` cabang asing → 403.
5. Owner multi-outlet tanpa `outletId` pada `/reports/daily` → 400.

---

## Verifikasi Akhir (@barokah/web)

| Verifikasi | Hasil |
|------------|-------|
| lint | ✅ |
| typecheck | ✅ |
| test | ✅ **33/33** |
| build | ✅ (⚠ ESLint Next plugin warning) |

---

## Uji Manual Pak Zaki (Frontend, ~5 menit)

1. Login owner → `/dashboard` — sidebar tetap saat buka Produk/Kategori/Buka Shift.
2. Klik **Ekspor** → file CSV `laporan-harian-*.csv` terunduh (jika API jalan).
3. Ubah tanggal → **Muat ulang** → widget omzet terisi dari API.
4. Login kasir → `/pos`; akses `/dashboard` → redirect `/pos`.

---

## Handoff — 3 Prioritas Sprint 10

1. **Void transaksi + audit trail (P0 MVP)** — void dengan approval manager, record terpisah (immutable setelah closed). Owner: **Rina** checklist → **Dewi** AC → **Fajar** API + **Dimas** UI kasir.
2. **Struk digital & cetak thermal ESC/POS (P0)** — spec integrasi **Arif**, endpoint receipt **Fajar**, trigger post-checkout **Dimas**; docs **Fitri**.
3. **Hardening release & multi-outlet dev** — seed 2 outlet untuk UAT picker, ESLint Next flat config (warning build), template smoke UAT per release. Owner: **Yoga** + **Dimas** + **Fitri**.

**Defer Fase 2 (bukan Sprint 10):** PDF/Excel terjadwal, konsolidasi lintas cabang satu file.

---

## Risiko Tersisa

| Risiko | Tingkat | Mitigasi |
|--------|---------|----------|
| UX export CSV | Low | Terintegrasi; PDF masih backlog |
| Permintaan PDF operasional | Low | CSV MVP; PDF di backlog Fase 2 |
| Konsolidasi multi-cabang satu file | Low | Out of scope MVP; per-outlet export |

---

## Keputusan

**Sprint 9 dinyatakan CLOSED (gabungan).** UAT final PASS; verifikasi teknis API 45/45 + web 33/33; export & multi-outlet terintegrasi ke dashboard; shell admin, picker outlet, dan tombol ekspor CSV siap uji internal Pak Zaki.
