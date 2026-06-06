# Performance — Product Catalog & Categorization

> **Owners:** Fajar (API) · Dimas (Web) · Eko (query weight)  
> **Date:** 6 Jun 2026 · P0 performance pass

## Goals

- POS kasir (`/pos`) loads catalog fast for shift-long use
- Master produk (`/master/products`) scales beyond hundreds of SKUs
- Wizard kategori/satuan tidak memuat seluruh katalog

## API strategy

| Endpoint | Shape | Notes |
|----------|-------|-------|
| `GET /products/grid` | Slim DTO per SKU | `select` only kasir fields; sell units only; `isBundle` flag (no component tree) |
| `GET /products/grid?withMeta=true` | `{ items, total }` | Enables server filter threshold on web |
| `GET /products/grid?categoryId&q=outletId` | Filtered slim list | Server-side search/filter for large catalogs |
| `GET /categories/summary` | `{ id, name, productCount }` | Chips & dropdowns without full category rows |
| `GET /products?page&limit` | `{ items, meta }` | Master list pagination (default 50/page) |
| `GET /products` (no page) | Flat array | Legacy consumers (e.g. PO draft) |

### Indexes (Prisma)

- `products(tenant_id, is_active, has_variants, category_id)` — POS grid filter
- `categories(tenant_id, sort_order, name)` — category chips sort

## Web caching (TanStack Query v5)

| Query key | staleTime | gcTime (default) |
|-----------|-----------|------------------|
| `['products','grid', outletId, category, q]` | 60s | 5m |
| `['categories','summary']` | 5m | 10m |
| `['products','master', page, …]` | 2m | 5m |

Offline POS: baseline grid (no filter) still written to IndexedDB via `saveCatalogCache`.

## POS filter strategy

1. Initial fetch: full slim grid + `total`
2. If `total > 100`: category & search (300ms debounce) hit server (`categoryId`, `q`)
3. If `total ≤ 100`: client-side filter with `useMemo` (no extra round-trips)

## Master list

- Server: `page`, `limit`, `q`, `categoryId`, `includeInactive`
- Client: tipe produk filter on current page only (lightweight)
- Search debounce: 300ms

## Payload slimming (grid)

**Before (per SKU):** full product row + `unitConversions` (buy+sell) + `bundleItems[]` + `bundlePolicy` + duplicate `baseUnit`/`purchaseUnit`

**After:** `id, name, sku, price, moq, orderStep, variantLabel, imageUrl?, unit, category, sellUnits[], isBundle?, stockQty?`

Estimated reduction ~40–60% JSON size for typical multi-unit/bundle SKUs (fewer joins, no component names in grid).
