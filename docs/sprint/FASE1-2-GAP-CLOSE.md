# Fase 1+2 Gap Close — Sprint Paralel (6 Juni 2026)

> 📚 [Indeks Dokumentasi](../INDEX.md) | Owner: **Budi** · **Fajar** · **Dimas** · **Eko** · **Citra** · **Fitri**

## Ringkasan

Penutupan gap Fase 1 & Fase 2 — **FINAL STATUS parallel pass 6 Juni 2026**.

| Lane | Fitur | Status | Owner |
|------|-------|--------|-------|
| A | Import CSV produk | **DONE** | Fajar + Dimas |
| B | Fuzzy search (ILIKE + token) | **DONE** | Fajar + Dimas |
| C | Loyalty earn + **redeem MVP** | **DONE** | Eko + Fajar + Dimas |
| D | Promo terjadwal (startsAt/endsAt) | **DONE** | Eko + Fajar |
| E | Opname digital (scan SKU/barcode) | **DONE** | Dimas + Fajar |
| F | Stock alert export CSV + widget | **DONE** | Fajar + Dimas |
| G | Business logic E2E verification | **DONE** | Rina + Citra |
| H | Docs + CHANGELOG + pilot package | **DONE** | Fitri + Yoga |

## Skor Audit Final

| Fase | Skor |
|------|------|
| Fase 1 | **98%** (37/38 Must) |
| Fase 2 | **95%** (27/28 Must/Should) |
| Automated tests | **417/417 PASS** |

## API Endpoints Baru

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/products/import/template` | Download template CSV |
| `POST` | `/products/import` | Upload CSV bulk (multipart `file`) |
| `GET` | `/products/lookup?code=` | Lookup SKU/barcode exact |
| `GET` | `/reports/stock/low/export` | Export CSV stok rendah |

## Konfigurasi Loyalty (TenantSettings)

- `loyaltyPointsEnabled` (default `true`)
- `loyaltyEarnRateIdr` (default `10000` → 1 poin per Rp 10.000 net spend)

## Out of Scope (Defer)

- Fase 3 enterprise (marketplace, accounting, multi-warehouse)
- Thermal printer produksi (WebUSB stub tetap)
- Midtrans live keys (butuh Pak Zaki)
- EDC hardware
- WA blast real API — stub dokumentasi saja
- ~~Loyalty redeem~~ → **DONE** (MVP redeem 1 poin = Rp 1.000, maks 50%)
- BXGY native engine — defer; workaround diskon persen di admin UI

## Verifikasi

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

## Handoff Log

| From | To | Task | Parallel OK? |
|------|-----|------|--------------|
| Citra · QA | Pak Zaki | Manual UAT checklist di bawah | — |
| Fitri · Docs | — | INDEX + audit scores updated | Ya |
