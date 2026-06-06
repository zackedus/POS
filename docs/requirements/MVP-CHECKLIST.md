> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Rina, Dewi, semua tim

# Checklist MVP — Modul Kasir POS

> Disusun oleh **@pos-expert** | Handoff ke **@analyst** untuk user story

## Functional Requirements

### Transaksi Dasar
- [ ] **P0** — Scan barcode / input SKU manual
- [ ] **P0** — Tambah/kurangi qty item di keranjang
- [ ] **P0** — Hapus item dari keranjang
- [ ] **P0** — Hold bill (tahan transaksi, lanjut nanti)
- [ ] **P0** — Checkout dengan 1 metode pembayaran
- [ ] **P0** — Split payment (cash + QRIS)
- [ ] **P0** — Cetak struk thermal ESC/POS
- [ ] **P0** — Struk digital (PDF/share)
- [ ] **P1** — Void transaksi (butuh approval manager)
- [ ] **P1** — Refund partial

### Shift Kasir
- [ ] **P0** — Buka shift (input saldo awal kas)
- [ ] **P0** — Tutup shift (rekonsiliasi kas)
- [ ] **P0** — Laporan shift (total penjualan, selisih kas)

### Master Data
- [ ] **P0** — CRUD produk (nama, SKU, barcode, harga)
- [ ] **P0** — Kategori produk
- [ ] **P1** — Import produk CSV/Excel

### Pembayaran
- [ ] **P0** — Cash
- [ ] **P0** — Transfer manual
- [ ] **P0** — QRIS (Midtrans sandbox)
- [ ] **P1** — E-wallet

### Auth & Role
- [ ] **P0** — Login/logout
- [ ] **P0** — Role: Owner, Manager, Kasir
- [ ] **P0** — RBAC per modul

## Non-Functional Requirements

- [ ] **P0** — Response checkout < 200ms
- [ ] **P0** — Support 2 concurrent kasir per outlet
- [ ] **P1** — Mobile offline: transaksi queue saat no internet
- [ ] **P0** — Audit log semua void/refund
- [ ] **P0** — HTTPS production

## Edge Cases

- [ ] Stok habis saat checkout → block atau allow negative (config)
- [ ] Printer disconnect → fallback PDF
- [ ] QRIS timeout → retry atau switch ke cash
- [ ] Duplicate barcode scan → increment qty
- [ ] Hold bill expired (TTL 30 menit) → auto release stock reserve

## Integrasi Terkait

- [ ] Printer thermal ESC/POS → `@integration`
- [ ] Midtrans QRIS → `@integration`
- [ ] Perhitungan PPN 11% → `@algorithm`

## Handoff

| Tim | Task |
|-----|------|
| @analyst | User story per item P0 |
| @planner | Sprint 1–4 breakdown |
| @senior-dev | Module design: transactions, shifts, auth |
| @algorithm | Tax & pricing engine spec |
| @integration | Midtrans + printer POC |
| @devops | Docker dev environment |
| @docs | API docs + panduan kasir |
