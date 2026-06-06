# Model Produk — Satuan & Varian (Barokah Core POS)

> Dokumen domain untuk membedakan **varian SKU** vs **konversi satuan** agar input data minim kesalahan.
> Owner: Rina (domain) + Eko (algoritma). Implementasi: Fajar (API) + Dimas (web).

## Ringkasan

| Tipe | Kode | Kapan dipakai | Stok internal |
|------|------|---------------|---------------|
| Sederhana | `SIMPLE` | Satu satuan jual = satuan stok (pcs, sak) | Satuan dasar |
| Multi-satuan | `MULTI_UNIT` | Beli beda satuan, jual beda satuan (paku: dus → kg) | Selalu satuan dasar |
| Induk varian | `VARIANT` | SKU berbeda per ukuran/merek (Cat 5L vs 10L) | Per SKU anak |

**Aturan emas:** Varian ≠ konversi satuan. Jangan campur dalam satu section UI.

---

## 1. SIMPLE — Produk Sederhana

Produk dengan **satu satuan** untuk stok dan penjualan.

### Contoh: Semen sak

| Field | Nilai |
|-------|-------|
| SKU | `SMN-40` |
| Satuan dasar (stok) | sak |
| Harga jual | Rp 75.000 / sak |
| Beli PO | sak (sama) |
| Jual kasir | sak |

### Contoh: Paku pcs

| Field | Nilai |
|-------|-------|
| SKU | `PAK-2IN` |
| Satuan dasar | pcs |
| MOQ / step | 1 |

**Validasi:** `unitId` wajib. Tidak ada `ProductUnitConversion`.

---

## 2. MULTI_UNIT — Multi-Satuan (Satu SKU)

Satu SKU, **stok selalu di satuan dasar**, beli dan jual bisa pakai satuan berbeda.

### Model penyimpanan harga (P0 — Juni 2026)

| Field DB | Satuan penyimpanan | Contoh paku | Contoh seng |
|----------|-------------------|-------------|-------------|
| `Product.price` | **Satuan stok (base)** — harga jual ecer | Rp 18.000 / **kg** | Rp 45.000 / **m** |
| `Product.costPrice` | **Satuan stok (base)** — HPP | Rp 15.000 / **kg** | Rp 38.000 / **m** |
| Harga jual paket (dus/roll) | **Tidak disimpan terpisah** — dihitung otomatis | 18.000 × 20 = **Rp 360.000 / dus** | 45.000 × 50 = **Rp 2.250.000 / roll** |
| Harga beli distributor | Input UI per satuan beli → konversi ke base | Rp 300.000 / dus → **15.000 / kg** | Rp 1.900.000 / roll → **38.000 / m** |

**Aturan emas harga:**
1. Kasir & margin selalu hitung dari harga **per satuan stok**.
2. Jual per dus/roll = `price × conversionToBase` (bulatkan ke rupiah).
3. Form wizard menampilkan label eksplisit + pratinjau live: `1 dus (20 kg) = Rp 360.000 jual / Rp 300.000 beli`.
4. PO receive **mengubah HPP** dari harga beli aktual per satuan distributor → konversi ke base.

Fungsi shared: `derivePackageSellPrice`, `deriveBaseCostFromPurchaseCost`, `formatMultiUnitPricingPreview` di `@barokah/shared`.

### Contoh: Paku (beli dus, jual kg + dus)

**Before (UX lama — membingungkan):**
- Step 1: label generik "Harga jual (IDR)" — user input Rp 300.000 (pikir per dus)
- Sistem simpan Rp 300.000 sebagai harga **per kg** → kasir jual dus = Rp 6.000.000

**After (UX baru):**
- Step Satuan: "Harga jual ecer per **kg**" = Rp 18.000
- "Harga beli per **dus** (dari distributor)" = Rp 300.000 → simpan HPP 15.000/kg
- Pratinjau: `1 dus (20 kg) = Rp 360.000 jual / Rp 300.000 beli`

| Peran | Satuan | Faktor ke base |
|-------|--------|----------------|
| Stok (base) | kg | 1 |
| Beli (supplier) | dus | 20 (= 1 dus = 20 kg) |
| Jual ecer (kasir) | kg | via `moq` / `orderStep` produk (step 0,5) |
| Jual paket (kasir) | dus | sama baris beli, `isSellUnit: true` |

**Alur stok:**
- Terima 10 dus → +200 kg stok
- Jual 2,5 kg → −2,5 kg stok
- Jual 1 dus → −20 kg stok

**Preview UI:** `Beli: 10 dus → +200 kg stok | Jual: 2,5 kg @ Rp 18.000`

### Contoh: Seng galvalum (beli roll, jual meter + roll)

| Peran | Satuan | Faktor ke base |
|-------|--------|----------------|
| Stok (base) | m | 1 |
| Beli (supplier) | roll | 50 (= 1 roll = 50 m) |
| Jual ecer (kasir) | m | via `moq` / `orderStep` produk (step 0,5) |
| Jual paket (kasir) | roll | sama baris beli, `isSellUnit: true` |

**Alur stok:**
- Terima 2 roll → +100 m stok
- Jual 12,5 m → −12,5 m stok (sisa 87,5 m)
- Jual 1 roll → −50 m stok (sisa 37,5 m)

**Seed dev:** SKU `SNG-GAL`, kategori `Atap & Seng`, harga per meter.

**UX wizard:** kategori mengandung "seng"/"atap" → default satuan stok `m`, beli `roll`, faktor 50.

**UX wizard (step Satuan):** dua section — *Satuan beli ke supplier* (pilih dus + `1 dus = 20 kg`) dan *Satuan jual ke pelanggan* (MOQ/step ecer kg + checkbox *Juga jual per dus*). Tanpa tabel konversi atau radio PO/jual.

### Aturan validasi

1. `conversionToBase > 0` untuk setiap baris konversi
2. Satuan beli (`isPurchaseUnit`) **harus berbeda** dari satuan dasar
3. Tidak boleh duplikat `sellUnitId` per produk
4. Satuan dasar jual (jika dicatat) faktor = 1
5. `moq` / `orderStep` / `sellStep` > 0
6. Produk induk varian (`hasVariants`) **tidak boleh** punya konversi — atur di SKU anak

---

## 3. VARIANT — Induk & Anak SKU

Varian = **produk terpisah** (SKU, harga jual, harga beli, stok sendiri) yang dikelompokkan di bawah induk.

**Bukan MULTI_UNIT:** Cat 5L vs 25L = **harga berbeda per SKU**, bukan `harga per liter × faktor konversi`.

### Contoh: Cat tembok (ukuran berbeda)

**Induk** (`hasVariants: true`):

| Field | Nilai |
|-------|-------|
| SKU | `CAT-PARENT` |
| Nama | Cat Tembok Interior |
| Harga induk | 0 (placeholder — tidak dijual langsung) |
| Satuan dasar | liter — diwarisi anak |

**Anak varian:**

| SKU | Ukuran | Harga jual | Harga beli (opsional) | Stok |
|-----|--------|------------|-------------------------|------|
| `CAT-5L` | 5 Liter | Rp 85.000 | Rp 72.000 | per outlet |
| `CAT-25L` | 25 Liter | Rp 350.000 | Rp 310.000 | per outlet |

**Before (UX lama — membingungkan):**
- Wizard induk varian menampilkan field harga seperti produk sederhana
- Varian hanya bisa ditambah **setelah** induk disimpan (panel terpisah)
- User bingung dengan MULTI_UNIT (paku dus→kg)

**After (UX baru — Juni 2026):**
- Step Info dasar: induk **tanpa** harga jual (harga 0)
- Step Satuan: tabel varian — ukuran, SKU, harga jual, harga beli, stok awal
- Kasir: tiap varian = **item terpisah** di grid (induk disembunyikan)
- Panel "Kelola varian" tetap untuk edit/hapus setelah simpan

### Anak varian bisa SIMPLE atau MULTI_UNIT

- Cat 5L: SIMPLE (jual per kaleng/liter)
- Cat 25L: bisa MULTI_UNIT jika jual per liter dengan stok liter

**Aturan:**
- Induk: `hasVariants = true`, tanpa `parentProductId`, `price = 0`
- Anak: `parentProductId` → induk, `variantLabel` wajib, `price` & `costPrice` per SKU
- Induk tidak muncul di grid kasir (`hasVariants: false` filter)
- Stok per anak via `InventoryItem` (bukan induk)
- Wizard create: minimal 1 baris varian wajib; edit induk → panel "Kelola varian"

---

## Inferensi Tipe (Backward Compatible)

Tidak ada kolom `productType` di DB — tipe **diinfer** dari data existing:

```
hasVariants OR parentProductId  → VARIANT
unitConversions.length > 0      → MULTI_UNIT
else                            → SIMPLE
```

Fungsi: `inferProductType()` di `@barokah/shared`.

---

## Progressive Disclosure (Form Master Produk)

| Step | Isi |
|------|-----|
| 1. Info dasar | SKU, nama, kategori — harga hanya untuk SIMPLE/VARIANT |
| 2. Tipe produk | Radio: Sederhana / Multi-satuan / Induk varian |
| 3. Satuan | Conditional — satuan + **harga berlabel satuan** untuk MULTI_UNIT |
| 4. Preview | Ringkasan beli/jual/stok + pratinjau harga paket |

| Tipe dipilih | Field yang tampil |
|--------------|-------------------|
| SIMPLE | Pilih satuan dasar saja |
| MULTI_UNIT | Satuan stok + beli ke supplier + **harga jual/beli berlabel satuan** + checkbox jual ecer & jual per satuan beli |
| VARIANT | Satuan dasar induk + **tabel varian** (ukuran, SKU, harga jual/beli, stok awal) |

---

## Smart Defaults (Anti-Error)

| Konteks | Default |
|---------|---------|
| Kategori mengandung "semen", "paku", "besi" | Satuan dasar: kg atau pcs (match symbol di master) |
| Kategori seng, atap, galvalum | Satuan dasar: m; beli: roll (= 50 m) |
| Kategori cat, cat tembok | Satuan: klg / liter |
| Satuan dasar = kg | `orderStep` suggest 0,5 |
| Satuan dasar = pcs, sak | `orderStep` suggest 1 |

Input wajib pakai `CurrencyInput` dan `QuantityInput` (format Indonesia).

---

## Referensi Teknis

- Schema: `packages/database/prisma/schema.prisma` — `Product`, `ProductUnitConversion`
- Shared: `packages/shared/src/utils/product-type.ts`, `product-pricing.ts`, `validate-product-form.ts`
- Web: `apps/web/src/components/master/ProductFormWizard.tsx`, `UnitConversionPreview.tsx`
- API: `apps/api/src/modules/catalog/catalog.service.ts`
