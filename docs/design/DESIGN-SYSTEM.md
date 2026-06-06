> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Design | Audience: Maya, Fajar

# Design System — Barokah Core POS

> Maintained by **@ui-ux** | Tokens: `packages/ui/src/tokens/`

Design system untuk modul kasir MVP (web + mobile). Fokus: kecepatan operasi, kontras tinggi, touch-friendly.

---

## Brand

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary.50` | `#ECFDF5` | `#052E16` | Background highlight |
| `primary.500` | `#22C55E` | `#22C55E` | Accent, success scan |
| `primary.600` | `#16A34A` | `#4ADE80` | Primary CTA, brand Barokah |
| `primary.700` | `#15803D` | `#86EFAC` | Hover primary |
| `primary.900` | `#14532D` | `#DCFCE7` | Text on light green bg |

**Brand rationale:** Hijau Barokah = kepercayaan, halal-friendly retail, mudah dibedakan di floor toko.

---

## Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `success` | `#16A34A` | `#4ADE80` | Scan OK, payment success |
| `warning` | `#D97706` | `#FBBF24` | Stok menipis, hold expiring |
| `error` | `#DC2626` | `#F87171` | Void block, payment fail |
| `info` | `#2563EB` | `#60A5FA` | Info banner, QRIS pending |

### Surface & Text

| Token | Light | Dark |
|-------|-------|------|
| `bg.base` | `#FFFFFF` | `#0F172A` |
| `bg.muted` | `#F1F5F9` | `#1E293B` |
| `bg.elevated` | `#FFFFFF` | `#334155` |
| `text.primary` | `#0F172A` | `#F8FAFC` |
| `text.secondary` | `#64748B` | `#94A3B8` |
| `text.inverse` | `#FFFFFF` | `#0F172A` |
| `border.default` | `#E2E8F0` | `#475569` |

---

## Typography

Font stack: `system-ui, -apple-system, 'Segoe UI', sans-serif` (native performance, no webfont load delay).

| Token | Size | Weight | Line | Usage |
|-------|------|--------|------|-------|
| `display` | 32px | 700 | 1.2 | Total bayar, selisih kas |
| `heading.lg` | 24px | 600 | 1.3 | Section title (Keranjang) |
| `heading.md` | 20px | 600 | 1.4 | Modal title |
| `body.lg` | 16px | 400 | 1.5 | Item name, labels |
| `body.md` | 14px | 400 | 1.5 | Secondary info, SKU |
| `body.sm` | 12px | 500 | 1.4 | Badge, timestamp |
| `mono` | 14px | 500 | 1.4 | Receipt no, barcode display |

**Angka uang:** always `tabular-nums`; format locale `id-ID`.

---

## Spacing Scale

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon gap |
| `sm` | 8px | Between buttons |
| `md` | 16px | Card padding |
| `lg` | 24px | Section padding |
| `xl` | 32px | Page margin |
| `touchTarget` | **48px** | Min height/width interactive kasir |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 4px | Input, badge |
| `md` | 8px | Button, card |
| `lg` | 12px | Modal, panel |
| `full` | 9999px | Pill badge, avatar |

---

## Shadows & Elevation

| Level | Light | Dark |
|-------|-------|------|
| `sm` | `0 1px 2px rgba(0,0,0,0.05)` | `0 1px 2px rgba(0,0,0,0.3)` |
| `md` | `0 4px 12px rgba(0,0,0,0.08)` | `0 4px 12px rgba(0,0,0,0.4)` |
| `lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modal overlay |

---

## Dark / Light Mode

| Konteks | Mode default | Alasan |
|---------|--------------|--------|
| Kasir shift siang (08–17) | Light | Kontras dengan cahaya ruangan |
| Kasir shift malam (17–24) | Dark | Kurangi glare, kurangi fatigue mata |
| Manager dashboard | System preference | — |

- Toggle di header kasir; persist per user + outlet
- Transisi theme: instant (no animation) — hindari flash saat rush hour
- Jangan pakai pure black `#000`; gunakan `bg.base` dark slate

---

## Component Inventory (MVP Kasir)

### Actions

| Component | Variant | Min size | Notes |
|-----------|---------|----------|-------|
| `Button` | primary, secondary, danger, ghost | 48×48 | Primary = Bayar, Tutup Shift |
| `IconButton` | default | 48×48 | Qty +/-, hapus item |
| `Numpad` | 3×4 grid | 56×56 keys | Saldo awal, input cash |

### Input

| Component | Notes |
|-----------|-------|
| `SearchInput` | Barcode/SKU; auto-focus; clear on scan |
| `TextInput` | Login, catatan transaksi |
| `CurrencyInput` | Format Rp; numpad integration |
| `QtyStepper` | - [qty] + ; tap qty untuk numpad |

### Display

| Component | Notes |
|-----------|-------|
| `ProductCard` | Image, name, price; tap = add to cart |
| `CartLineItem` | Name, qty stepper, subtotal, remove |
| `CartPanel` | Sticky total, diskon row, tombol Bayar |
| `TotalDisplay` | `display` typography; PPN breakdown collapsible |
| `Badge` | Hold count, shift status, role |
| `Toast` | Scan success/error; auto-dismiss 3s |
| `Banner` | Network offline, printer status |

### Overlays

| Component | Notes |
|-----------|-------|
| `Modal` | Payment, shift open/close; focus trap |
| `BottomSheet` | Cart summary mobile; payment methods |
| `Drawer` | Hold bill list, held transaction recall |

### POS-specific

| Component | Notes |
|-----------|-------|
| `BarcodeScannerZone` | Hidden input + visual scan indicator |
| `PaymentMethodPicker` | Cash, Transfer, QRIS tiles 48px+ |
| `QrisQrDisplay` | QR + countdown timeout |
| `ReceiptPreview` | Pre-print thermal layout |
| `ShiftStatusBar` | Kasir name, shift open time, outlet |

---

## Layout Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| `mobile` | < 768px | Single column; cart bottom sheet |
| `tablet` | 768–1024px | Catalog grid 3-col; cart sidebar narrow |
| `desktop` | ≥ 1024px | Catalog + cart 380px (matches placeholder) |
| `wide` | ≥ 1366px | Catalog grid 4-col; optimal for kasir PC |

---

## Accessibility

- Kontras teks: WCAG AA minimum (4.5:1 body, 3:1 large text)
- Focus ring: 2px `primary.600` offset 2px
- Semua aksi kasir accessible via keyboard (kasir PC dengan scanner USB)
- `aria-live="polite"` pada total keranjang saat item ditambah
- Error: teks + ikon + warna (bukan warna saja)

---

## Handoff

| File | Untuk |
|------|-------|
| `WIREFRAMES-KASIR.md` | Layout detail per layar kasir |
| `WIREFRAMES-STOREFRONT.md` | Layout storefront Epic J (guest, SCR-J01–J07) |
| `USER-FLOWS.md` | Alur & screen list |
| `packages/ui/` | Token TypeScript untuk web/mobile |
