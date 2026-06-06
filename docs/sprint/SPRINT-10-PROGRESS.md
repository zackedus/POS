> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Progress | Audience: Pak Zaki, Budi, Fajar, Dimas, Fitri

# Sprint 10 — Progress (Void & Struk — Gabungan)

> **Tanggal:** 2 Juni 2026  
> **Status:** **CLOSED** (backend + frontend/UX/docs + UAT final PASS)  
> **UAT:** [SPRINT-10-UAT-FINAL.md](../testing/SPRINT-10-UAT-FINAL.md)

---

## Ringkasan Deliverables

| # | Prioritas | Area | Status |
|---|-----------|------|--------|
| 1 | Void + audit | API `POST :id/void` + approval manager untuk kasir | ✅ |
| 2 | Struk digital | `GET :id/receipt` + UI `ReceiptPanel` | ✅ |
| 3 | Thermal stub | `buildEscPosStub` + browser print | ✅ |
| 4 | Wire API | Web `lib/transactions.ts` | ✅ |
| 5 | Test | API SCR-V01…V06 + web **40/40** vitest | ✅ |
| 6 | Docs | PLAN, PROGRESS, CLOSURE, UAT, THERMAL specs | ✅ |
| 7 | Verify API + Web | lint / typecheck / test / build | ✅ |

---

## Verifikasi Akhir (2 Juni 2026)

| Workspace | lint | typecheck | test | build |
|-----------|------|-----------|------|-------|
| `@barokah/api` | ✅ | ✅ | ✅ **54/54** | ✅ |
| `@barokah/web` | ✅ | ✅ | ✅ **40/40** | ✅ |

---

## Endpoint (Backend)

| Method | Path | RBAC / Catatan |
|--------|------|----------------|
| GET | `/api/v1/transactions/recent` | Semua role terautentikasi |
| GET | `/api/v1/transactions/:id/receipt` | Semua role (outlet scope) |
| POST | `/api/v1/transactions/:id/void` | Manager/owner langsung; kasir + kredensial manager |
| POST | `/api/v1/transactions/:id/refund` | OWNER, MANAGER (di luar scope UI Sprint 10) |

---

## URL Uji (Dev)

| Halaman | URL |
|---------|-----|
| Kasir | http://localhost:3001/pos |
| Admin void & struk | http://localhost:3001/dashboard/transactions |
| API | http://localhost:3000/api/v1 |

---

## File Utama

| Layer | Path |
|-------|------|
| API void/receipt | `apps/api/src/modules/transactions/` |
| ESC/POS stub | `apps/api/src/modules/transactions/receipt.util.ts` |
| Web client | `apps/web/src/lib/transactions.ts` |
| UI struk | `apps/web/src/components/pos/ReceiptPanel.tsx` |
| UI void | `apps/web/src/components/pos/VoidTransactionModal.tsx` |

---

## Handoff Log

| From | To | Task | Parallel OK? |
|------|-----|------|--------------|
| Fajar | Dimas | Kontrak receipt + void | Ya |
| Dimas | Fitri | Docs sprint 10 + INDEX + UAT | Ya |
| Arif | Dimas | Hardware thermal (defer) | Ya — stub only |
| Fitri | Hendra | Draft prioritas Sprint 11 (ADR-003) | Tidak — tunggu CLOSURE |
