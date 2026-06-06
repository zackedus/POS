# Web Completion UAT — Phase 4 (6 Juni 2026)

> **Owner:** Citra Lestari (QA) · **AC source:** WEB-COMPLETION-PROGRESS Pass 4  
> **Environment:** staging / local dev dengan API + web running

---

## PASS Criteria

### Lane A — Promo POS

- [ ] **A1** Admin buat promo PERCENTAGE aktif di `/dashboard/promotions`
- [ ] **A2** Kasir buka `/pos` — dropdown promo muncul jika ada promo aktif
- [ ] **A3** Pilih "Otomatis" — diskon terbesar diterapkan, total berkurang
- [ ] **A4** Checkout tunai/split — struk `discount` > 0, total = subtotal − diskon
- [ ] **A5** Promo nonaktif / min purchase tidak terpenuhi — checkout tanpa diskon atau error jelas

### Lane B — Storefront Orders

- [ ] **B1** Header storefront menampilkan link **Pesanan Saya**
- [ ] **B2** `/store/{slug}/orders` — input orderNo + HP valid menampilkan status
- [ ] **B3** OrderNo/HP salah — pesan error Bahasa Indonesia

### Lane C — Auth Hardening

- [ ] **C1** Dev: login tetap localStorage + session cookie middleware
- [ ] **C2** Production path (`NODE_ENV=production` atau `NEXT_PUBLIC_USE_HTTPONLY_AUTH=true`): login set httpOnly cookie, API via `/api/proxy`
- [ ] **C3** Kasir akses `/dashboard` — redirect ke `/pos` tanpa flash konten admin
- [ ] **C4** Middleware test: session cookie OR access cookie → allow protected route

### Lane D — Expired Orders

- [ ] **D1** Order PENDING_PAYMENT lewat `expiresAt` → status **Kedaluwarsa** (EXPIRED)
- [ ] **D2** Storefront cek status order expired menampilkan label Kedaluwarsa
- [ ] **D3** Dashboard online orders filter **Kedaluwarsa** berfungsi

### Lane E — Dashboard UX

- [ ] **E1** Halaman inventory/expenses/outlets/promotions/analytics/PO — error API tampil pesan user-facing (bukan raw stack)
- [ ] **E2** Loading skeleton tampil saat fetch awal

---

## Regression Smoke

- [ ] Login owner → dashboard OK
- [ ] Login kasir → POS OK
- [ ] Checkout POS tanpa promo — regression OK
- [ ] Online order create + mock pay — regression OK

---

## Sign-off

| Role | Nama | PASS? | Tanggal |
|------|------|-------|---------|
| QA | Citra | | |
| Frontend | Dimas | | |
| Backend | Fajar | | |
| Docs | Fitri | | |
| CEO | Budi | | |

---

*Disusun: Fitri Nugroho · Gate: Citra UAT*
