# Phase 8 — UAT Final

> **Tanggal:** 6 Juni 2026  
> **QA:** Citra Lestari · **Sign-off target:** Pak Zaki (pilot toko bahan bangunan)

## Ringkasan

| Area | Status | Catatan |
|------|--------|---------|
| Business logic edge audit | ✅ PASS (automated) | 9/9 flows — lihat `docs/domain/BUSINESS-LOGIC-AUDIT-2026-06.md` |
| PPN checkout | ✅ PASS (automated) | Aktifkan PPN di Settings → checkout total + tax |
| Offline PWA queue | ✅ PASS (unit) | Hold multi-unit AUD-MU-03 automated |
| Mobile MVP | ⚠️ Manual | Cart + cash checkout butuh shift aktif |
| Cross-outlet stock view | ⚠️ Manual | Dashboard widget multi cabang |
| Midtrans sandbox test | ⚠️ Manual | Tombol **Uji Koneksi** di Settings |
| Thermal WebUSB | ⚠️ Stub | Connect stub only — browser print fallback |

## Checklist manual Pak Zaki

1. **PPN:** Settings → aktifkan PPN 11% → kasir checkout → total termasuk PPN di struk/preview.
2. **Hold + tutup shift:** Buat hold bill → tutup shift → lihat peringatan hold aktif (shift tetap bisa ditutup).
3. **Stok cabang lain:** Dashboard owner → widget **Stok Cabang Lain** menampilkan qty cabang lain.
4. **Midtrans:** Settings owner → **Uji Koneksi Midtrans** (mock OK tanpa key; sandbox jika key diisi).
5. **Mobile:** Login Expo → `/pos` → tambah item → **Bayar Tunai** (shift harus sudah dibuka di web/API).
6. **Offline:** Matikan jaringan → checkout kasir → banner antrean → nyalakan → **Sinkronkan Sekarang**.

## Defer Phase 9

- Midtrans live keys production
- Thermal printer hardware driver
- Offline conflict auto-resolution
- Mobile QRIS + shift native

**Verdict:** Web MVP **production-ready** untuk pilot; Phase 8 menambah audit mendalam + fondasi multi-outlet/offline/mobile.
