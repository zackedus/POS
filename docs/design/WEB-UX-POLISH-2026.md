# Web UX Polish 2026 — Barokah Core POS

> **Maintained by:** Maya (UI/UX) + Dimas (Frontend Lead)  
> **Date:** 6 Jun 2026  
> **Scope:** Comprehensive UI/UX polish across `apps/web`

---

## Ringkasan

Polish UX menyeluruh untuk web app Barokah Core POS — modern, informatif, konsisten dengan [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md). Semua teks user-facing dalam Bahasa Indonesia.

---

## Komponen Shared (Lane D)

**File:** `apps/web/src/components/dashboard/dashboard-ui.tsx`

| Komponen | Perubahan |
|----------|-----------|
| `PageHeader` | Breadcrumb, help text informatif |
| `AlertBanner` | Prop `variant` (fix TS error `tone`) |
| `SectionCard` | Card section dengan title + description |
| `StatCard` | KPI card dengan accent color |
| `DataTable` | Zebra rows, hover, sticky header |
| `EmptyState` | Icon opsional, spacing lebih lega |
| `HelpTooltip` | Info box Bahasa Indonesia |
| `BreadcrumbNav` | Navigasi hierarki halaman |
| `tableStyles.card` | Fix TS error missing property |

---

## Lane A — Admin / Dashboard

| Route | Perubahan |
|-------|-----------|
| `/dashboard` | PageHeader + StatCard + AlertBanner + LoadingSkeleton |
| `/dashboard/expenses` | Breadcrumb, StatCard hari ini, DataTable, SectionCard |
| `/master/bundles` | StatusBadge, DataTable, breadcrumbs, help text |
| `AdminLayout` | Loading skeleton, error card modern |
| `DashboardShell` | (existing) Sidebar icons, grouping, mobile collapse |

---

## Lane B — POS / Kasir / Shift

| Route | Perubahan |
|-------|-----------|
| `/pos` | **POS UX 2026 overhaul** — lihat [POS-UX-2026.md](./POS-UX-2026.md): kartu produk bersih, unit picker, payment conditional, accordion sidebar |
| `PosShiftBar` | Banner shift status prominent (hijau/kuning) + CTA buka shift |
| `/shift/open` | Typography + touch target 48px, deskripsi informatif |

---

## Lane C — Storefront / Auth / Landing

| Route | Perubahan |
|-------|-----------|
| `/` | Landing hero modern — feature cards, CTAs Kasir/Dashboard/Toko Online |
| `/login` | Card login dengan brand icon, tips role redirect |
| `/store/[slug]` | Subtitle katalog, kategori pills 44px, empty state, LoadingSkeleton |

---

## Prinsip Desain Diterapkan

1. **Informatif** — setiap halaman punya subtitle/deskripsi tujuan
2. **Progressive disclosure** — help text hanya saat relevan
3. **Brand hijau Barokah** — primary `#16A34A`, bukan biru generik di POS
4. **Touch 44–48px** — kasir, storefront pills, shift form
5. **Accessibility** — `aria-live` total keranjang, `role="tablist"` payment, `role="alert"` margin

---

## Typecheck & Test

```bash
npm run typecheck -w @barokah/web
npm run test -w @barokah/web -- --run
```

Fix TS: `AlertBanner tone` → `variant`, `tableStyles.card` ditambahkan.

---

## Before / After Highlights

| Area | Sebelum | Sesudah |
|------|---------|---------|
| Landing | 3 tombol sederhana | Hero + feature cards + header nav |
| Login | Card putih basic | Brand icon + tips role + gradient bg |
| Dashboard | Inline alert divs | AlertBanner + StatCard konsisten |
| POS payment | Tab biru 44px | Tab hijau Barokah 48px + shadow active |
| Shift bar | Badge kecil inline | Banner full-width dengan status dot |
| Tabel admin | Plain table | Zebra + hover + sticky header |

---

## Hydration & Browser Extensions

Beberapa ekstensi browser (Bitdefender, password manager, dll.) menyuntikkan atribut seperti `bis_skin_checked="1"` ke elemen `<div>` **sebelum** React hydration. Server HTML tidak punya atribut tersebut → React dev overlay menampilkan *hydration mismatch*.

| Lapisan | File | Perbaikan |
|---------|------|-----------|
| Root | `apps/web/src/app/layout.tsx` | `suppressHydrationWarning` pada `<html>` dan `<body>` |
| Client-only gate | `apps/web/src/components/HydrationSafeMount.tsx` | Render `children` hanya setelah `useEffect` mount — subtree tidak di-hydrate dari SSR |
| Admin / master | `AdminLayout.tsx` | Seluruh shell admin dibungkus `HydrationSafeMount` |
| POS / shift | `pos/layout.tsx`, `shift/layout.tsx` | `HydrationSafeMount` ringan — teks loading Bahasa Indonesia tetap sama, tanpa flash berlebihan |

**Verifikasi bersih (Pak Zaki):** nonaktifkan ekstensi pada `localhost`, atau buka **Incognito/InPrivate** tanpa ekstensi. Warning dev overlay **tidak memengaruhi production build** — hanya alat diagnosa development.

**Bukan bug aplikasi:** mismatch `bis_skin_checked` dari ekstensi; fix di atas mencegah hydrasi subtree client-heavy yang rentan.

---

## Handoff

- **Citra (QA):** Regression UAT halaman di atas
- **Fitri (Docs):** Link dari `docs/INDEX.md` jika diperlukan
