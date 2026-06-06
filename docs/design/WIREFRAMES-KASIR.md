> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Design | Audience: Maya, Fajar

# Wireframes Kasir — Barokah Core POS

> Disusun oleh **@ui-ux** | Design tokens: `DESIGN-SYSTEM.md`

Wireframe text-based untuk MVP kasir. Layout web mengacu placeholder `apps/web/src/app/pos/page.tsx` (grid `1fr + 380px`).

---

## Web POS — Layout Utama (SCR-K01)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Barokah]  Outlet: Toko Pusat  │  Kasir: Budi  │  Shift: 08:12  │ Hold (2) │ 🌙│
├────────────────────────────────────────────┬─────────────────────────────────┤
│  ┌──────────────────────────────────────┐  │  KERANJANG              [Hold]│
│  │ 🔍 Scan barcode / cari SKU...        │  │  ─────────────────────────────  │
│  └──────────────────────────────────────┘  │  Indomie Goreng      Rp 3.500   │
│                                            │  [-] 2 [+]              Rp 7.000│
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │  Aqua 600ml          Rp 4.000   │
│  │ [img]   │ │ [img]   │ │ [img]   │      │  [-] 1 [+]              Rp 4.000│
│  │ Indomie │ │ Aqua    │ │ Kopi    │      │  ─────────────────────────────  │
│  │ Rp3.500 │ │ Rp4.000 │ │ Rp8.000 │      │  Subtotal              Rp 11.000│
│  └─────────┘ └─────────┘ └─────────┘      │  PPN 11%                Rp 1.089│
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │  ─────────────────────────────  │
│  │ ...     │ │ ...     │ │ ...     │      │  TOTAL                 Rp 12.089│
│  └─────────┘ └─────────┘ └─────────┘      │  ┌─────────────────────────────┐│
│                                            │  │         B A Y A R           ││
│  [Semua] [Makanan] [Minuman] [Snack]       │  └─────────────────────────────┘│
└────────────────────────────────────────────┴─────────────────────────────────┘
     ↑ Katalog (scroll)                           ↑ CartPanel 380px (sticky)
```

**Catatan:**
- Hidden `<input>` barcode di atas search; Enter = scan submit
- ProductCard min height 120px; tap area full card
- Tombol BAYAR: full width, 56px height, `primary.600`

---

## Mobile POS — Layout Utama (SCR-K01 Mobile)

```
┌─────────────────────────────┐
│ Barokah │ Toko Pusat   Hold│
├─────────────────────────────┤
│ 🔍 Scan / cari...           │
├─────────────────────────────┤
│ ┌───────┐ ┌───────┐         │
│ │ img   │ │ img   │  ...    │
│ │Indomie│ │ Aqua  │         │
│ │ Rp3.5k│ │ Rp4k  │         │
│ └───────┘ └───────┘         │
│                             │
│         (scroll)            │
├─────────────────────────────┤
│ 🛒 3 item    Total Rp12.089 │  ← tap expands bottom sheet
│ ┌─────────────────────────┐ │
│ │        B A Y A R        │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Bottom sheet expanded:**
```
┌─────────────────────────────┐
│ ─── (drag handle)           │
│ Keranjang (3)         [Hold]│
│ Item lines + steppers       │
│ Subtotal / PPN / TOTAL      │
│ [        B A Y A R        ] │
└─────────────────────────────┘
```

---

## SCR-L01 — Login

```
┌─────────────────────────────┐
│                             │
│      [Logo Barokah POS]     │
│                             │
│  Email                      │
│  ┌───────────────────────┐  │
│  │                       │  │
│  └───────────────────────┘  │
│  Password                   │
│  ┌───────────────────────┐  │
│  │ ••••••••              │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │        M A S U K      │  │
│  └───────────────────────┘  │
│                             │
│     Barokah Core © 2026     │
└─────────────────────────────┘
        max-width 400px centered
```

---

## SCR-S01 — Buka Shift (Modal)

```
┌─────────────────────────────────────┐
│  Buka Shift                    [×]  │
│  ─────────────────────────────────  │
│  Outlet: Toko Pusat                 │
│  Tanggal: 1 Jun 2026, 08:00         │
│                                     │
│  Saldo awal kas (Rp)                │
│  ┌─────────────────────────────┐    │
│  │           500.000           │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌───┐ ┌───┐ ┌───┐                  │
│  │ 7 │ │ 8 │ │ 9 │                  │
│  ├───┤ ├───┤ ├───┤                  │
│  │ 4 │ │ 5 │ │ 6 │   Numpad 3×4    │
│  ├───┤ ├───┤ ├───┤   keys 56×56     │
│  │ 1 │ │ 2 │ │ 3 │                  │
│  ├───┤ ├───┤ ├───┤                  │
│  │ C │ │ 0 │ │ ⌫ │                  │
│  └───┘ └───┘ └───┘                  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │       BUKA SHIFT            │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
         blocking — tidak bisa dismiss
```

---

## SCR-K01 — Kasir Main (Detail Zones)

| Zone | Width | Behavior |
|------|-------|----------|
| Header | 100% | 56px; shift status always visible |
| Search/Scan | 100% katalog | 48px input; autofocus |
| Category tabs | scroll horizontal | 44px height chips |
| Product grid | flex 1 | auto-fill minmax(140px, 1fr) |
| Cart panel | 380px web | sticky top; internal scroll |

**Keyboard shortcuts (web kasir PC):**
- `F2` — focus search
- `F4` — Hold bill
- `F8` — Bayar (jika cart not empty)
- `Esc` — close modal

---

## SCR-P01 — Payment Modal

```
┌─────────────────────────────────────────┐
│  Pembayaran                        [×]  │
│  ─────────────────────────────────────  │
│                                         │
│           TOTAL BAYAR                   │
│         Rp 12.089                       │
│     (Subtotal Rp11.000 + PPN Rp1.089)   │
│                                         │
│  Pilih metode:                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │  💵     │ │  🏦     │ │  📱     │    │
│  │  Cash   │ │Transfer │ │  QRIS   │    │
│  └─────────┘ └─────────┘ └─────────┘    │
│       ↑ tiles min 80×80, selected ring  │
│                                         │
│  [ area metode-specific — see below ]   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      KONFIRMASI PEMBAYARAN      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Cash sub-view (SCR-P02)

```
  Jumlah diterima:
  ┌─────────────────────────┐
  │        20.000           │
  └─────────────────────────┘
  [Uang pas] [50rb] [100rb]   ← quick chips

  Kembalian:
  Rp 7.911                    ← success color, display size

  [ Numpad 3×4 ]
```

### QRIS sub-view (SCR-P04)

```
  ┌─────────────────┐
  │                 │
  │   [QR CODE]     │
  │                 │
  └─────────────────┘
  Scan dengan e-wallet
  ⏱ 01:45 remaining
  Status: Menunggu pembayaran...

  [ Batalkan QRIS ]
```

---

## SCR-P08 — Receipt / Struk

```
┌──────────────────────┐
│   TOKO BAROKAH       │
│   Jl. Contoh No.1    │
│   ─────────────────  │
│   Struk: TRX-001234  │
│   01/06/2026 14:32   │
│   Kasir: Budi        │
│   ─────────────────  │
│   Indomie x2  7.000  │
│   Aqua x1     4.000  │
│   ─────────────────  │
│   Subtotal   11.000  │
│   PPN 11%     1.089  │
│   TOTAL      12.089  │
│   ─────────────────  │
│   Cash       20.000  │
│   Kembalian   7.911  │
│   ─────────────────  │
│   Terima kasih!      │
└──────────────────────┘
   width ~58mm thermal preview

  [ Cetak ]  [ PDF ]  [ Transaksi Baru ]
```

---

## SCR-C02 — Tutup Shift Summary

```
┌─────────────────────────────────────┐
│  Tutup Shift — Ringkasan            │
│  ─────────────────────────────────  │
│  Shift: 08:00 – 16:00 (8j 0m)       │
│                                     │
│  Total penjualan      Rp 2.450.000  │
│  Jumlah transaksi              87   │
│  ─────────────────────────────────  │
│  Cash                 Rp 1.200.000  │
│  Transfer               Rp 800.000  │
│  QRIS                   Rp 450.000  │
│  ─────────────────────────────────  │
│  Expected cash        Rp 1.250.000  │
│  (saldo awal + cash sales)          │
│                                     │
│  Saldo akhir di laci:               │
│  [ Numpad input ]                   │
│                                     │
│  Selisih: Rp 0 ✓                    │
│                                     │
│  [        TUTUP SHIFT        ]      │
└─────────────────────────────────────┘
```

---

## Error State Patterns

### Toast (scan error)
```
┌──────────────────────────────────────┐
│ ✕  Produk tidak ditemukan: 8991234  │
└──────────────────────────────────────┘
  bottom-center, auto-dismiss 3s, red border-left
```

### Banner (printer offline)
```
┌──────────────────────────────────────┐
│ ⚠ Printer offline — struk ke PDF    │  [Coba lagi]
└──────────────────────────────────────┘
  top sticky, warning color
```

### Block checkout (stok habis)
```
CartLineItem dengan border warning + badge "Stok habis"
Tombol BAYAR disabled + tooltip "Selesaikan item bermasalah"
```

---

## Screen → Route Mapping (suggested)

| Screen ID | Route | Layout |
|-----------|-------|--------|
| SCR-L01 | `/login` | Auth layout centered |
| SCR-S01 | `/pos` (modal) | Blocking if no shift |
| SCR-K01 | `/pos` | Main kasir grid |
| SCR-H02 | `/pos` (drawer) | Overlay |
| SCR-P01 | `/pos` (modal) | Payment |
| SCR-C02 | `/pos/shift/close` | Wizard or modal |

---

## Handoff Checklist

- [ ] @senior-dev: implement layout grid matching web wireframe
- [ ] @senior-dev: CartPanel sticky + TotalDisplay typography tokens
- [ ] @docs: `[SS: SCR-*]` placeholders in panduan kasir
- [ ] @integration: printer preview matches SCR-P08 dimensions (58mm)
