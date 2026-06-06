> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Closure | Audience: Pak Zaki, Budi, Fitri, Hendra

# Sprint 10 — Closure (Void & Struk MVP — Gabungan)

> **Tanggal closure:** 2 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Status:** **CLOSED** (backend + frontend/UX/docs)  
> **Referensi:** [SPRINT-10-PROGRESS.md](./SPRINT-10-PROGRESS.md), [SPRINT-10-UAT-FINAL.md](../testing/SPRINT-10-UAT-FINAL.md), [SPRINT-10-PLAN.md](../requirements/SPRINT-10-PLAN.md), [SPRINT-9-CLOSURE.md](./SPRINT-9-CLOSURE.md)

---

## Status Sprint

- **Status akhir Sprint 10:** **CLOSED** (gabungan backend + frontend)
- **Fokus:** void transaksi + approval manager, struk digital, thermal ESC/POS stub, UI kasir & admin
- **UAT final:** [SPRINT-10-UAT-FINAL.md](../testing/SPRINT-10-UAT-FINAL.md) — **PASS**

---

## Status Akhir

| Area | Hasil |
|------|-------|
| Backend void/refund/receipt/audit | ✅ |
| Void UI + approval manager (ID) | ✅ `/pos` + `/dashboard/transactions` |
| Struk digital post-checkout | ✅ |
| Cetak browser + ESC/POS stub | ✅ |
| Test API 54/54 + Web 40/40 | ✅ |
| Docs + INDEX + UAT final | ✅ |

---

## Verifikasi Teknis (Re-run Final — 2 Juni 2026)

### `@barokah/api`

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/api` | ✅ |
| `npm run typecheck -w @barokah/api` | ✅ |
| `npm run test -w @barokah/api` | ✅ **54/54** |
| `npm run build -w @barokah/api` | ✅ |

### `@barokah/web`

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ |
| `npm run typecheck -w @barokah/web` | ✅ |
| `npm run test -w @barokah/web` | ✅ **40/40** |
| `npm run build -w @barokah/web` | ✅ |

---

## Uji Manual Pak Zaki (~5 menit)

1. **Kasir** → http://localhost:3001/pos — checkout → struk otomatis → **Cetak Struk**.
2. **Transaksi Terakhir** → **Void** → alasan + login manager → sukses.
3. **Manager** → http://localhost:3001/dashboard/transactions — void hanya dengan alasan.
4. Struk transaksi void menampilkan **STATUS: VOID**.

---

## Blocker / Defer

| Item | Catatan |
|------|---------|
| Driver printer fisik | Stub ESC/POS — lihat [THERMAL-ESC-POS.md](../integration/THERMAL-ESC-POS.md) |
| Refund partial UI | API ada; UI defer |
| Window void 30 menit | Defer post-MVP |

---

## Handoff — 3 Prioritas Sprint 11 (selaras ADR-003)

> **Konteks Fase 2:** MVP kasir toko fisik (Sprint 1–10) selesai. Sprint 11 membuka track **Growth** per [ADR-003](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md).

| # | Prioritas | Track | Owner | Alasan ADR-003 |
|---|-----------|-------|-------|----------------|
| **1** | **Offline PWA toko fisik (spike fondasi)** | Fase 2 — **prioritas** | Dimas + Fajar + Eko | Pak Zaki butuh jual saat internet tidak stabil; PWA + IndexedDB queue + sync idempotent |
| **2** | **Online sales — discovery & kontrak API (Epic J)** | Fase 2 — storefront web | Rina → Dewi → Fajar + Dimas | Penjualan online via web terintegrasi POS; **belum full build** — wireframe Maya + user story dulu |
| **3** | **Hardening release + thermal hardware POC** | Operasional | Yoga + Arif + Dimas | ESLint Next flat config, smoke UAT template, driver printer ESC/POS (Arif) |

**Urutan disarankan Hendra:** Sprint 11 utama = **#1 Offline PWA** (spike: service worker, queue schema, sync policy). **#2 Online sales** paralel hanya setelah checklist Rina + wireframe Maya approved (**Parallel OK? Tidak** untuk implementasi UI storefront). **#3** bisa overlap ringan dengan Yoga/Arif.

**Tidak masuk Sprint 11:** refund partial UI (unless Pak Zaki naikkan prioritas), marketplace sync (Fase 3), F&B/meja/KDS (permanen OUT).

**Defer Fase 2+:** PDF/Excel terjadwal, konsolidasi lintas cabang satu file, Expo mobile offline (alternatif PWA).

---

## Handoff Log

| From | To | Task | Deliverable | Parallel OK? | Next action |
|------|-----|------|-------------|--------------|-------------|
| Budi | Hendra | Draft SPRINT-11-PLAN dari 3 prioritas di atas | Closure ini + ADR-003 | Tidak | Plan Sprint 11 + estimasi |
| Budi | Rina | Checklist offline PWA + sync policy | ADR-003 § offline | Tidak | Handoff Dewi AC |
| Fitri | — | INDEX + UAT Sprint 10 | Docs terbaru | Ya | — |

---

## Keputusan

**Sprint 10 dinyatakan CLOSED (gabungan).** UAT final PASS; verifikasi teknis API 54/54 + web 40/40; void, struk digital, dan thermal stub siap uji internal Pak Zaki. Sprint 11 mengarah ke **offline PWA toko fisik** sebagai track utama Fase 2, dengan **discovery online sales (Epic J)** sebagai jalur paralel terkontrol setelah requirement + UX gate.
