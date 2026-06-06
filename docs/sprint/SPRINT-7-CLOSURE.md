> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Closure | Audience: Pak Zaki, Budi, Hendra, Fajar, Dimas, Arif, Fitri

# Sprint 7 — Closure Report (Final)

> **Tanggal closure:** 2 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Referensi:** [SPRINT-7-PROGRESS.md](./SPRINT-7-PROGRESS.md), [SPRINT-7-PLAN.md](../requirements/SPRINT-7-PLAN.md), [SPRINT-7-UAT-FINAL.md](../testing/SPRINT-7-UAT-FINAL.md), [SPRINT-6-CLOSURE.md](./SPRINT-6-CLOSURE.md)

---

## Status Sprint

- **Status akhir Sprint 7:** **CLOSED**
- **Fokus utama:** policy bundle outlet-level, reliability checkout bundle/idempoten, gateway error mapping dasar, sinkron UI kasir.
- **Scope tetap:** tidak ada perubahan scope produk (ADR-003 aman).

---

## Ringkasan Deliverables

### Backend/API & Integrasi

- Model + migrasi `product_bundle_outlet_policies`.
- Endpoint baru: `POST /api/v1/products/bundles/outlet-policy`.
- Endpoint diperkuat: `GET /api/v1/products/bundles`, `POST /api/v1/transactions/checkout-split`.
- Checkout bundle membaca policy outlet efektif sebelum deduction stok.

### Frontend

- UI `/pos` sinkron metadata policy bundle outlet/tenant.
- Error mapping split payment di layer kasir.
- Test web lulus untuk policy display + error copy.

### Testing & Dokumentasi

- UAT final: `docs/testing/SPRINT-7-UAT-FINAL.md`
- E2E lite: `docs/testing/SPRINT-7-FRONTEND-E2E-LITE.md`
- Progress/closure/plan Sprint 7 diupdate ke status **CLOSED**.

---

## Verifikasi Akhir Sprint 7

| Verifikasi | Hasil |
|---|---|
| `npm run db:generate` | ✅ (blocker EPERM diselesaikan) |
| `@barokah/api` lint / typecheck / test / build | ✅ |
| `@barokah/web` lint / typecheck / test / build | ✅ |
| UAT final checklist | ✅ |

---

## Blocker yang Diselesaikan Saat Close

| Item | Sebelum | Sesudah |
|---|---|---|
| Prisma `EPERM` pada `query_engine-windows.dll.node` | Open | **Resolved** — proses Node dev dihentikan, `db:generate` sukses |

**Prosedur workaround Windows (dokumentasi operasional):**

```powershell
# Hentikan proses Node yang mengunci Prisma engine (bukan proses Cursor helper)
Get-Process -Name node -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -like '*\nodejs\*' } |
  ForEach-Object { Stop-Process -Id $_.Id -Force }

npm run db:generate
```

---

## Risiko Tersisa (Non-Blocking)

| Item | Status | Dampak |
|---|---|---|
| E2E browser automation lintas app penuh | Monitor | Low-Medium |
| Gateway mapping belum terhubung adaptor Midtrans nyata | Monitor | Medium (Sprint integrasi berikutnya) |
| Warning Next.js ESLint plugin pada build web | Monitor | Low |

---

## Keputusan

Sprint 7 dinyatakan **CLOSED**. Seluruh target fungsional backend, integrasi dasar gateway, dan frontend kasir yang disepakati telah diimplementasi, lolos verifikasi teknis, dan UAT final tanpa blocker.

---

## Handoff — 3 Prioritas Sprint Berikutnya

1. **E2E browser lintas layer (prioritas QA)** — satu suite otomatis untuk flow `/pos`: bundle outlet policy → checkout split → idempoten `clientRequestId` (owner: Dimas + Fajar; Maya review UX assertion).
2. **Perluasan integrasi payment gateway** — spec adaptor Midtrans/QRIS dari Arif, mapping error produksi (`issuer decline`, `network`), wiring Fajar (owner: Arif → Fajar).
3. **Smoke UAT rutin per release + hardening build** — template checklist release + tutup warning ESLint Next.js agar exit criteria CI/build frontend bersih (owner: Fitri + Dimas + Yoga).
