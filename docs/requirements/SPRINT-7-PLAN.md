> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Budi, Hendra, Fajar, Arif, Fitri

# Sprint 7 Plan — Backend, Integrasi & Frontend Kasir

> **Periode:** 2 Juni 2026  
> **Status:** **CLOSED** (2 Juni 2026)  
> **Owner jalur:** Fajar (Backend/API) + Arif (Integrasi) + Dimas (Frontend)  
> **Carry-over sumber:** [SPRINT-6-CLOSURE.md](../sprint/SPRINT-6-CLOSURE.md)  
> **UAT final:** [SPRINT-7-UAT-FINAL.md](../testing/SPRINT-7-UAT-FINAL.md)

---

## Tujuan Sprint 7

Menuntaskan penguatan backend/integrasi setelah Sprint 6 dengan fokus pada policy bundle per outlet, reliability flow gabungan (bundle + konversi + idempotent checkout), dan error mapping gateway pembayaran dasar tanpa mengubah scope retail omnichannel (ADR-003).

---

## Scope In

1. Outlet-level bundle policy (aktivasi/nonaktif per outlet) dengan validasi aman tenant/outlet.
2. Reliability flow backend untuk checkout bundle dan idempotensi `clientRequestId`.
3. Gateway-level error mapping dasar untuk metode split payment yang sudah aktif.
4. Penambahan test kritikal backend.
5. Update dokumentasi sprint backend.

## Scope Out

- Perubahan scope produk (tetap retail, non-F&B).
- Integrasi payment gateway baru di luar metode yang sudah berjalan.
- E2E browser lintas app penuh (tetap pada backend reliability test + flow uji API).

---

## Deliverables Teknis

- Migrasi DB: `product_bundle_outlet_policies`.
- Endpoint katalog baru:
  - `POST /api/v1/products/bundles/outlet-policy`
- Endpoint existing yang diperkuat:
  - `GET /api/v1/products/bundles` (termasuk data policy outlet)
  - `POST /api/v1/transactions/checkout-split` (mapping error gateway dasar + outlet bundle policy resolution)
- Test backend baru untuk:
  - validasi outlet-level policy,
  - behavior checkout bundle saat policy outlet override,
  - mapping error gateway timeout.

---

## Acceptance Criteria

- Outlet policy hanya bisa di-set untuk outlet valid pada tenant user.
- Checkout bundle menghormati override policy outlet; fallback tetap ke tenant-level.
- Split payment memetakan kegagalan gateway dasar ke `ErrorCodes` yang konsisten.
- `@barokah/api` lolos lint, typecheck, test, build.
- `@barokah/web` menampilkan metadata policy bundle + error split payment; lolos lint, typecheck, test, build.
- `npm run db:generate` berhasil di environment dev (tanpa lock EPERM).

**Hasil:** semua acceptance criteria terpenuhi — lihat [SPRINT-7-CLOSURE.md](../sprint/SPRINT-7-CLOSURE.md).

---

## Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Prisma generate terkunci process OS | Medium | Tetap jaga kompatibilitas typecheck + catat prosedur rerun generate setelah lock dilepas |
| Kontrak frontend atas metadata policy outlet belum freeze penuh | Medium | API sudah expose policy; sinkronkan contoh payload uji di progress sprint |
| E2E lintas browser belum ada | Low-Medium | Gunakan reliability test backend + checklist flow uji endpoint |
