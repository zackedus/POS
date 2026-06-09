'use client';

import { useQuery } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ProductType,
  formatCurrencyIDR,
  inferProductType,
  productTypeToFlags,
  validateProductForm,
} from '@barokah/shared';
import { Button } from '@barokah/ui';
import { apiConfig } from '@/lib/api';
import { authFetch, fetchMe } from '@/lib/auth';
import {
  fetchCategorySummary,
  fetchMasterProducts,
  MASTER_PRODUCTS_PAGE_SIZE,
  MASTER_PRODUCTS_STALE_MS,
  downloadProductImportTemplate,
  importProductsCsv,
  type ProductImportResult,
} from '@/lib/catalog-api';
import { ListFilterBar, FILTER_EMPTY_DESCRIPTION } from '@/components/dashboard/ListFilterBar';
import { buildFilterChips } from '@/lib/list-filters';
import { adjustStock, fetchInventory } from '@/lib/inventory-api';
import { createProductVariant } from '@/lib/variants-api';
import { canViewCostPrice } from '@/lib/rbac';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { resolveProductImageUrl, uploadProductImage } from '@/lib/uploads-api';
import { ProductVariantPanel } from '@/components/master/ProductVariantPanel';
import { ProductUnitConversionPanel } from '@/components/master/ProductUnitConversionPanel';
import {
  ProductFormWizard,
  createEmptyWizardForm,
  type ProductWizardFormState,
} from '@/components/master/ProductFormWizard';

interface Unit {
  id: string;
  name: string;
  symbol: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  costPrice?: number;
  parentProductId?: string | null;
  variantLabel?: string | null;
  hasVariants?: boolean;
  variantCount?: number;
  sellOnline?: boolean;
  isActive?: boolean;
  imageUrl?: string | null;
  unitId?: string;
  categoryId?: string | null;
  unit?: Unit | null;
  category?: Category | null;
  parentProduct?: { id: string; name: string; sku: string } | null;
  sellUnits?: Array<{
    id: string;
    name: string;
    symbol: string;
    conversionToBase?: number;
    conversionQty?: number;
    price: number;
    sellStep?: number;
    minQty?: number;
  }>;
  purchaseUnit?: {
    id: string;
    name: string;
    symbol: string;
    conversionToBase: number;
  };
  baseUnit?: Unit | null;
  moq?: number;
  orderStep?: number;
  bundleItems?: Array<{
    productId: string;
    sku?: string;
    name?: string;
    quantity: number;
  }>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const pageStyle = { maxWidth: '960px' } as const;
const cardStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  background: '#ffffff',
  padding: '0.875rem 1rem',
} as const;
const stateBoxStyle = { marginBottom: '0.75rem', borderRadius: '10px', padding: '0.625rem 0.75rem' } as const;
const badgeStyle = (bg: string, color: string) =>
  ({
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '0.125rem 0.45rem',
    borderRadius: 999,
    background: bg,
    color,
    whiteSpace: 'nowrap',
  }) as const;
type ProductFilters = {
  search: string;
  categoryId: string;
  showInactive: boolean;
};

function emptyProductFilters(): ProductFilters {
  return { search: '', categoryId: '', showInactive: false };
}

const filterSelectStyle = {
  padding: '0.5rem 0.65rem',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  minHeight: 44,
  fontSize: '0.875rem',
  minWidth: 160,
} as const;

function productToWizardForm(product: Product, _showCost: boolean): ProductWizardFormState {
  const productType = inferProductType({
    hasVariants: product.hasVariants,
    parentProductId: product.parentProductId,
    hasPurchaseUnit: !!product.purchaseUnit,
    sellUnitCount: product.sellUnits?.length,
  });

  const unitConversions: ProductWizardFormState['unitConversions'] = [];
  if (product.purchaseUnit) {
    const purchaseSellMeta = product.sellUnits?.find((u) => u.id === product.purchaseUnit!.id);
    unitConversions.push({
      unitId: product.purchaseUnit.id,
      conversionToBase: product.purchaseUnit.conversionToBase,
      isPurchaseUnit: true,
      isSellUnit: !!purchaseSellMeta,
      sellStep: purchaseSellMeta?.sellStep,
      minQty: purchaseSellMeta?.minQty,
    });
  }
  for (const sellUnit of product.sellUnits ?? []) {
    if (sellUnit.id === product.unitId || sellUnit.id === product.purchaseUnit?.id) continue;
    unitConversions.push({
      unitId: sellUnit.id,
      conversionToBase: sellUnit.conversionToBase ?? 1,
      isPurchaseUnit: false,
      isSellUnit: true,
      sellStep: sellUnit.sellStep,
      minQty: sellUnit.minQty,
    });
  }

  return {
    sku: product.sku,
    name: product.name,
    price: String(product.price),
    costPrice: product.costPrice != null ? String(product.costPrice) : '',
    unitId: product.unitId ?? product.unit?.id ?? '',
    categoryId: product.categoryId ?? product.category?.id ?? '',
    productType,
    hasVariants: product.hasVariants ?? false,
    parentProductId: product.parentProductId ?? undefined,
    variantLabel: product.variantLabel ?? undefined,
    sellOnline: product.sellOnline ?? false,
    imageUrl: product.imageUrl ?? '',
    moq: String(product.moq ?? 1),
    orderStep: String(product.orderStep ?? 1),
    unitConversions,
  };
}

async function applyUnitConversions(productId: string, form: ProductWizardFormState) {
  if (form.productType !== ProductType.MULTI_UNIT || !form.unitConversions?.length) return;
  for (const row of form.unitConversions) {
    if (!row.unitId || row.conversionToBase <= 0) continue;
    const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products/unit-conversions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        sellUnitId: row.unitId,
        conversionToBase: row.conversionToBase,
        isPurchaseUnit: row.isPurchaseUnit,
        isSellUnit: row.isSellUnit,
        sellStep: row.isSellUnit ? row.sellStep : undefined,
        minQty: row.isSellUnit ? row.minQty : undefined,
      }),
    });
    const json = (await res.json()) as ApiEnvelope<unknown>;
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message ?? 'Gagal menyimpan konversi satuan.');
    }
  }
}

export default function ProductsPage() {
  const { selectedOutletId } = useOutletSelection();
  const [products, setProducts] = useState<Product[]>([]);
  const [stockByProductId, setStockByProductId] = useState<Map<string, { quantity: number; isLowStock: boolean }>>(
    new Map(),
  );
  const [draftFilters, setDraftFilters] = useState<ProductFilters>(emptyProductFilters);
  const [appliedFilters, setAppliedFilters] = useState<ProductFilters>(emptyProductFilters);
  const [filterType, setFilterType] = useState<'ALL' | 'SIMPLE' | 'MULTI_UNIT' | 'VARIANT'>('ALL');
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState({ total: 0, totalPages: 1 });
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<ProductWizardFormState>(createEmptyWizardForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductWizardFormState>(createEmptyWizardForm());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createValidationError, setCreateValidationError] = useState<string | null>(null);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
  const [uploadingCreateImage, setUploadingCreateImage] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [expandedVariantParentId, setExpandedVariantParentId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ProductImportResult | null>(null);
  const showCostFields = viewerRole ? canViewCostPrice(viewerRole) : false;

  async function handleImageUpload(file: File | undefined, target: 'create' | 'edit') {
    if (!file) return;
    if (target === 'create') setUploadingCreateImage(true);
    else setUploadingEditImage(true);
    setError(null);
    try {
      const result = await uploadProductImage(file);
      if (target === 'create') {
        setForm((prev) => ({ ...prev, imageUrl: result.url }));
      } else {
        setEditForm((prev) => ({ ...prev, imageUrl: result.url }));
      }
      setSuccess('Gambar produk berhasil diunggah.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar.');
    } finally {
      if (target === 'create') setUploadingCreateImage(false);
      else setUploadingEditImage(false);
    }
  }

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'summary'],
    queryFn: fetchCategorySummary,
    enabled: Boolean(viewerRole),
    staleTime: MASTER_PRODUCTS_STALE_MS,
  });

  const productActiveChips = useMemo(
    () =>
      buildFilterChips([
        {
          key: 'category',
          label: `Kategori: ${categories.find((c) => c.id === appliedFilters.categoryId)?.name ?? appliedFilters.categoryId}`,
          active: Boolean(appliedFilters.categoryId),
        },
        {
          key: 'search',
          label: `Cari: ${appliedFilters.search}`,
          active: Boolean(appliedFilters.search.trim()),
        },
        { key: 'inactive', label: 'Tampilkan nonaktif', active: appliedFilters.showInactive },
      ]),
    [appliedFilters, categories],
  );

  function applyProductFilters() {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  }

  function resetProductFilters() {
    const defaults = emptyProductFilters();
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
    setPage(1);
  }

  const productsQuery = useQuery({
    queryKey: [
      'products',
      'master',
      page,
      appliedFilters.search,
      appliedFilters.categoryId,
      appliedFilters.showInactive,
      viewerRole,
    ],
    queryFn: () =>
      fetchMasterProducts<Product>({
        page,
        limit: MASTER_PRODUCTS_PAGE_SIZE,
        q: appliedFilters.search || undefined,
        categoryId: appliedFilters.categoryId || undefined,
        includeCost: canViewCostPrice(viewerRole ?? ''),
        includeInactive: appliedFilters.showInactive,
      }),
    enabled: Boolean(viewerRole),
    staleTime: MASTER_PRODUCTS_STALE_MS,
  });

  async function loadSupportingMasterData() {
    const unitsRes = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/units`);
    const unitsJson = (await unitsRes.json()) as ApiEnvelope<Unit[]>;
    if (!unitsRes.ok || !unitsJson.success || !unitsJson.data) {
      throw new Error(unitsJson.error?.message ?? 'Gagal memuat satuan.');
    }
    setUnits(unitsJson.data);

    if (selectedOutletId) {
      try {
        const inv = await fetchInventory({ outletId: selectedOutletId });
        const map = new Map<string, { quantity: number; isLowStock: boolean }>();
        for (const row of inv.items) {
          map.set(row.productId, { quantity: row.quantity, isLowStock: row.isLowStock });
        }
        setStockByProductId(map);
      } catch {
        setStockByProductId(new Map());
      }
    } else {
      setStockByProductId(new Map());
    }
  }

  async function loadMasterData() {
    setError(null);
    setSuccess(null);
    try {
      await Promise.all([productsQuery.refetch(), categoriesQuery.refetch(), loadSupportingMasterData()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const isVariantParent = form.productType === ProductType.VARIANT;
    const validation = validateProductForm(form, {
      requireCost: showCostFields,
      requireVariantDrafts: isVariantParent,
    });
    if (!validation.valid) {
      setCreateValidationError(Object.values(validation.errors).join(' '));
      return;
    }

    setSaving(true);
    setCreateValidationError(null);
    setError(null);
    setSuccess(null);
    try {
      const flags = productTypeToFlags(form.productType);
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        price: isVariantParent ? 0 : Number(form.price),
        ...(showCostFields && form.costPrice?.trim()
          ? { costPrice: Number(form.costPrice) }
          : showCostFields
            ? { costPrice: 0 }
            : {}),
        unitId: form.unitId,
        categoryId: form.categoryId || undefined,
        hasVariants: flags.hasVariants,
        sellOnline: form.sellOnline,
        imageUrl: form.imageUrl?.trim() || undefined,
        moq: form.productType === ProductType.MULTI_UNIT ? Number(form.moq ?? 1) : 1,
        orderStep: form.productType === ProductType.MULTI_UNIT ? Number(form.orderStep ?? 1) : 1,
      };

      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiEnvelope<Product>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Gagal menambahkan produk.');
      }

      await applyUnitConversions(json.data.id, form);

      const stockOutletId = selectedOutletId;
      const initialStock = Number(form.initialStockQty ?? 0);
      if (
        stockOutletId &&
        initialStock > 0 &&
        !isVariantParent &&
        form.productType !== ProductType.VARIANT
      ) {
        await adjustStock({
          outletId: stockOutletId,
          productId: json.data.id,
          direction: 'IN',
          quantity: initialStock,
          notes: 'Stok awal produk',
        });
      }

      if (isVariantParent && form.variantDrafts?.length) {
        const outletId = stockOutletId ?? (await fetchMe())?.outletIds?.[0];
        const parentName = form.name.trim();

        for (const draft of form.variantDrafts) {
          if (!draft.variantLabel.trim() && !draft.price.trim()) continue;
          const variant = await createProductVariant(json.data.id, {
            sku: draft.sku.trim(),
            name: `${parentName} — ${draft.variantLabel.trim()}`,
            variantLabel: draft.variantLabel.trim(),
            price: Number(draft.price),
            ...(showCostFields && draft.costPrice?.trim()
              ? { costPrice: Number(draft.costPrice) }
              : {}),
          });
          const stockQty = Number(draft.stockQty);
          if (outletId && stockQty > 0) {
            await adjustStock({
              outletId,
              productId: variant.id,
              direction: 'IN',
              quantity: stockQty,
              notes: 'Stok awal varian',
            });
          }
        }
      }

      setForm(createEmptyWizardForm());
      await loadMasterData();
      setSuccess(
        isVariantParent
          ? 'Produk induk varian dan SKU anak berhasil ditambahkan.'
          : 'Produk baru berhasil ditambahkan.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditForm(productToWizardForm(product, showCostFields));
    setError(null);
    setSuccess(null);
    setEditValidationError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(createEmptyWizardForm());
  }

  async function handleDownloadImportTemplate() {
    setError(null);
    try {
      await downloadProductImportTemplate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunduh template.');
    }
  }

  async function handleImportCsv(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    setError(null);
    setSuccess(null);
    setImportResult(null);
    try {
      const result = await importProductsCsv(file, selectedOutletId ?? undefined);
      setImportResult(result);
      await loadMasterData();
      setSuccess(`Import selesai: ${result.imported} produk ditambahkan, ${result.skipped} dilewati.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal import CSV.');
    } finally {
      setImporting(false);
    }
  }

  async function handleUpdate(productId: string, product: Product) {
    const isVariantChild = !!product.parentProductId;
    const validation = validateProductForm(editForm, { requireCost: showCostFields, isVariantChild });
    if (!validation.valid) {
      setEditValidationError(Object.values(validation.errors).join(' '));
      return;
    }

    setSaving(true);
    setEditValidationError(null);
    setError(null);
    setSuccess(null);
    try {
      const flags = productTypeToFlags(editForm.productType);
      const payload = {
        sku: editForm.sku.trim(),
        name: editForm.name.trim(),
        price: Number(editForm.price),
        ...(showCostFields
          ? { costPrice: editForm.costPrice?.trim() ? Number(editForm.costPrice) : 0 }
          : {}),
        unitId: editForm.unitId,
        categoryId: editForm.categoryId || null,
        hasVariants: flags.hasVariants,
        parentProductId: isVariantChild ? product.parentProductId : null,
        variantLabel: isVariantChild ? editForm.variantLabel?.trim() || null : null,
        sellOnline: editForm.sellOnline,
        imageUrl: editForm.imageUrl?.trim() || null,
        moq: editForm.productType === ProductType.MULTI_UNIT ? Number(editForm.moq ?? 1) : 1,
        orderStep: editForm.productType === ProductType.MULTI_UNIT ? Number(editForm.orderStep ?? 1) : 1,
      };

      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiEnvelope<Product>;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal memperbarui produk.');
      }

      await applyUnitConversions(productId, editForm);
      cancelEdit();
      await loadMasterData();
      setSuccess('Perubahan produk berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(product: Product) {
    const nextActive = !(product.isActive ?? true);
    const confirmed = window.confirm(
      nextActive
        ? `Aktifkan produk "${product.name}"? Akan muncul di katalog kasir.`
        : `Nonaktifkan produk "${product.name}"? Tidak akan muncul di kasir (stok tetap tersimpan).`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const json = (await res.json()) as ApiEnvelope<Product>;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal mengubah status produk.');
      }
      await loadMasterData();
      setSuccess(nextActive ? `Produk "${product.name}" diaktifkan.` : `Produk "${product.name}" dinonaktifkan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(`Hapus produk "${product.name}"? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;
    setDeletingId(product.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products/${product.id}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as ApiEnvelope<{ deleted: boolean }>;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal menghapus produk.');
      }
      if (editingId === product.id) cancelEdit();
      await loadMasterData();
      setSuccess(`Produk "${product.name}" berhasil dihapus.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchMe();
        setViewerRole(me.role);
        await loadSupportingMasterData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      }
    })();
  }, [selectedOutletId]);

  useEffect(() => {
    setLoading(productsQuery.isFetching);
    if (productsQuery.data) {
      setProducts(productsQuery.data.items);
      setListMeta({
        total: productsQuery.data.meta.total,
        totalPages: productsQuery.data.meta.totalPages,
      });
    }
    if (productsQuery.error) {
      setError(
        productsQuery.error instanceof Error ? productsQuery.error.message : 'Gagal memuat produk.',
      );
    }
  }, [productsQuery.data, productsQuery.error, productsQuery.isFetching]);

  useEffect(() => {
    if (Array.isArray(categoriesQuery.data)) {
      setCategories(categoriesQuery.data.map((category) => ({ id: category.id, name: category.name })));
    }
  }, [categoriesQuery.data]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        if (filterType !== 'ALL') {
          const type = inferProductType({
            hasVariants: product.hasVariants,
            parentProductId: product.parentProductId,
            hasPurchaseUnit: !!product.purchaseUnit,
            sellUnitCount: product.sellUnits?.length,
          });
          if (type !== filterType) return false;
        }
        return true;
      }),
    [products, filterType],
  );

  function getUnitLabel(unit?: Unit | null) {
    if (!unit) return '-';
    return `${unit.name} (${unit.symbol})`;
  }

  function getProductTypeLabel(product: Product): string {
    const type = inferProductType({
      hasVariants: product.hasVariants,
      parentProductId: product.parentProductId,
      hasPurchaseUnit: !!product.purchaseUnit,
      sellUnitCount: product.sellUnits?.length,
    });
    if (type === ProductType.VARIANT) return product.hasVariants ? 'Induk varian' : 'Varian';
    if (type === ProductType.MULTI_UNIT) return 'Multi-satuan';
    return 'Sederhana';
  }

  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Master Produk</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Button type="button" variant="secondary" onClick={() => void handleDownloadImportTemplate()}>
          Unduh Template CSV
        </Button>
        <label style={{ display: 'inline-flex', alignItems: 'center' }}>
          <input
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              void handleImportCsv(file);
              e.target.value = '';
            }}
          />
          <span
            style={{
              display: 'inline-block',
              padding: '0.5rem 0.875rem',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: importing ? '#f1f5f9' : '#fff',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {importing ? 'Mengimport…' : 'Import CSV'}
          </span>
        </label>
        </div>
      </div>
      {importResult && importResult.errors.length > 0 ? (
        <div style={{ ...stateBoxStyle, background: '#fff7ed', border: '1px solid #fdba74', marginBottom: '0.75rem' }}>
          <strong>Laporan error import ({importResult.errors.length})</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.8125rem' }}>
            {importResult.errors.slice(0, 20).map((row, index) => (
              <li key={`${row.rowNumber}-${row.field}-${index}`}>
                Baris {row.rowNumber} ({row.field}): {row.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ListFilterBar
        selects={[
          {
            id: 'category',
            label: 'Kategori',
            value: draftFilters.categoryId,
            options: [
              { value: '', label: 'Semua kategori' },
              ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
            ],
            onChange: (value) => setDraftFilters((prev) => ({ ...prev, categoryId: value })),
          },
        ]}
        showDateRange={false}
        search={draftFilters.search}
        searchPlaceholder="Cari nama / SKU…"
        onSearchChange={(value) => setDraftFilters((prev) => ({ ...prev, search: value }))}
        toggles={[
          {
            id: 'showInactive',
            label: 'Tampilkan nonaktif',
            checked: draftFilters.showInactive,
            onChange: (checked) => setDraftFilters((prev) => ({ ...prev, showInactive: checked })),
          },
        ]}
        onApply={applyProductFilters}
        onReset={resetProductFilters}
        activeChips={productActiveChips}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 4, minWidth: 160 }}>
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Tipe produk</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              aria-label="Filter tipe produk"
              style={filterSelectStyle}
            >
              <option value="ALL">Semua tipe</option>
              <option value="SIMPLE">Sederhana</option>
              <option value="MULTI_UNIT">Multi-satuan</option>
              <option value="VARIANT">Varian</option>
            </select>
          </label>
        </div>
      </ListFilterBar>

      <section style={{ ...cardStyle, marginBottom: '0.875rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600 }}>Tambah Produk</h2>

        <ProductFormWizard
          form={form}
          onChange={setForm}
          units={units}
          categories={categories}
          disabled={saving}
          showCostFields={showCostFields}
          mode="create"
          onImageUpload={(file) => void handleImageUpload(file, 'create')}
          uploadingImage={uploadingCreateImage}
          imagePreviewUrl={form.imageUrl ? resolveProductImageUrl(form.imageUrl) ?? form.imageUrl : null}
          onSubmit={handleCreate}
          submitLabel={saving ? 'Menyimpan...' : 'Tambah produk'}
        />
        {createValidationError ? (
          <div style={{ ...stateBoxStyle, marginTop: '0.75rem', marginBottom: 0, color: '#b45309', background: '#fffbeb', border: '1px solid #fcd34d' }}>
            {createValidationError}
          </div>
        ) : null}
      </section>

      {error ? (
        <div style={{ ...stateBoxStyle, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <strong>Gagal memproses data produk.</strong>
          <p style={{ margin: '0.35rem 0 0' }}>{error}</p>
          <Button type="button" variant="secondary" onClick={() => void loadMasterData()} style={{ marginTop: '0.75rem' }}>
            Coba muat ulang
          </Button>
        </div>
      ) : null}
      {success ? (
        <div style={{ ...stateBoxStyle, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          {success}
        </div>
      ) : null}
      {loading ? (
        <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.875rem' }}>Memuat produk…</p>
      ) : null}

      <div style={{ ...cardStyle, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
          {listMeta.total > 0
            ? `Menampilkan halaman ${page} dari ${listMeta.totalPages} (${listMeta.total} produk)`
            : 'Belum ada produk'}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Sebelumnya
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || page >= listMeta.totalPages}
            onClick={() => setPage((current) => Math.min(listMeta.totalPages, current + 1))}
          >
            Berikutnya
          </Button>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ padding: '1rem' }}>
            <p style={{ margin: 0, color: '#64748b' }}>
              {products.length === 0
                ? productActiveChips.length > 0
                  ? FILTER_EMPTY_DESCRIPTION
                  : 'Belum ada produk. Tambahkan produk pertama untuk mulai transaksi kasir.'
                : 'Tidak ada produk sesuai filter tipe.'}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const stockInfo = !product.hasVariants ? stockByProductId.get(product.id) : undefined;
            return (
            <div
              key={product.id}
              style={{
                padding: '0.875rem 1rem',
                borderBottom: '1px solid #f1f5f9',
                background: product.isActive === false ? '#f8fafc' : '#fff',
                opacity: product.isActive === false ? 0.85 : 1,
              }}
            >
              {editingId === product.id ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <ProductFormWizard
                    form={editForm}
                    onChange={setEditForm}
                    units={units}
                    categories={categories}
                    disabled={saving}
                    showCostFields={showCostFields}
                    mode="edit"
                    isVariantChild={!!product.parentProductId}
                    parentSku={product.parentProduct?.sku}
                    onImageUpload={(file) => void handleImageUpload(file, 'edit')}
                    uploadingImage={uploadingEditImage}
                    imagePreviewUrl={editForm.imageUrl ? resolveProductImageUrl(editForm.imageUrl) ?? editForm.imageUrl : null}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleUpdate(product.id, product);
                    }}
                    submitLabel={saving ? 'Menyimpan...' : 'Simpan perubahan'}
                  />
                  {editValidationError ? (
                    <div style={{ ...stateBoxStyle, marginBottom: 0, color: '#b45309', background: '#fffbeb', border: '1px solid #fcd34d' }}>
                      {editValidationError}
                    </div>
                  ) : null}
                  <Button type="button" variant="secondary" disabled={saving} onClick={cancelEdit}>
                    Batal
                  </Button>
                  {!editForm.hasVariants && !product.parentProductId && editForm.productType === ProductType.MULTI_UNIT ? (
                    <ProductUnitConversionPanel product={product} units={units} onSaved={loadMasterData} />
                  ) : null}
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.9375rem', lineHeight: 1.3 }}>{product.name}</strong>
                      <span style={badgeStyle('#f1f5f9', '#475569')}>{getProductTypeLabel(product)}</span>
                      {product.isActive === false ? (
                        <span style={badgeStyle('#fef2f2', '#b91c1c')}>Nonaktif</span>
                      ) : null}
                      {stockInfo?.isLowStock ? (
                        <span style={badgeStyle('#fffbeb', '#b45309')}>Stok rendah</span>
                      ) : null}
                      {product.sellOnline ? (
                        <span style={badgeStyle('#eff6ff', '#1d4ed8')}>Online</span>
                      ) : null}
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                      {product.sku}
                    </p>
                    <div
                      style={{
                        marginTop: '0.35rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'baseline',
                        gap: '0.35rem 0.65rem',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrencyIDR(product.price)}
                      </span>
                      <span style={{ color: '#64748b' }}>/ {getUnitLabel(product.unit)}</span>
                      {stockInfo ? <span style={{ color: '#475569' }}>Stok {stockInfo.quantity}</span> : null}
                      {product.category?.name ? (
                        <span style={{ color: '#64748b' }}>{product.category.name}</span>
                      ) : null}
                    </div>
                    {(product.hasVariants ||
                      product.parentProduct?.name ||
                      product.variantLabel ||
                      (showCostFields && product.costPrice != null && product.costPrice > 0) ||
                      (product.sellUnits && product.sellUnits.length > 1) ||
                      (product.bundleItems && product.bundleItems.length > 0)) ? (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                        {product.hasVariants && product.variantCount != null ? `${product.variantCount} varian` : null}
                        {product.parentProduct?.name ? `Varian dari ${product.parentProduct.name}` : null}
                        {product.variantLabel ? ` · ${product.variantLabel}` : null}
                        {showCostFields && product.costPrice != null && product.costPrice > 0
                          ? ` · Modal ${formatCurrencyIDR(product.costPrice)}`
                          : ''}
                        {product.sellUnits && product.sellUnits.length > 1
                          ? ` · ${product.sellUnits.length} satuan jual`
                          : ''}
                        {product.bundleItems && product.bundleItems.length > 0
                          ? ` · Paket ${product.bundleItems.length} item`
                          : ''}
                      </p>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {product.hasVariants ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!!deletingId || saving}
                        onClick={() => setExpandedVariantParentId((prev) => (prev === product.id ? null : product.id))}
                      >
                        {expandedVariantParentId === product.id ? 'Tutup varian' : 'Kelola varian'}
                      </Button>
                    ) : null}
                    <Button type="button" variant="secondary" disabled={!!deletingId || saving} onClick={() => startEdit(product)}>
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!!deletingId || saving}
                      onClick={() => void handleToggleActive(product)}
                    >
                      {product.isActive === false ? 'Aktifkan' : 'Nonaktifkan'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={deletingId === product.id || saving}
                      onClick={() => void handleDelete(product)}
                    >
                      {deletingId === product.id ? 'Menghapus...' : 'Hapus'}
                    </Button>
                  </div>
                </div>
              )}
              {product.hasVariants && expandedVariantParentId === product.id ? (
                <ProductVariantPanel
                  parentProductId={product.id}
                  parentName={product.name}
                  parentSku={product.sku}
                  unitSymbol={product.unit?.symbol}
                  showCostFields={showCostFields}
                  onVariantsChanged={() => void loadMasterData()}
                />
              ) : null}
            </div>
          );
          })
        )}
      </div>
    </main>
  );
}
