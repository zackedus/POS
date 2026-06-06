'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ProductType,
  PRODUCT_TYPE_DESCRIPTIONS,
  PRODUCT_TYPE_LABELS,
  deriveBaseCostFromPurchaseCost,
  derivePackageSellPrice,
  derivePurchaseCostFromBaseCost,
  formatConversionPreview,
  formatCurrencyIDR,
  generateProductSku,
  generateVariantSku,
  isProductFormSubmittable,
  parseCurrencyInput,
  randomAlphanumeric,
  suggestBaseUnitSymbol,
  suggestOrderStep,
  suggestPurchaseUnitSymbol,
  suggestPurchaseConversionToBase,
  validateProductForm,
  buildUnitConversionsFromMultiUnit,
  parseMultiUnitConfig,
  DEFAULT_PURCHASE_CONVERSION,
  createEmptyVariantDraft,
  type ProductFormInput,
  type MultiUnitFormConfig,
  type VariantDraft,
} from '@barokah/shared';
import { Button, CurrencyInput, Input, QuantityInput } from '@barokah/ui';
import { AutoGenerateBadge, AutoGenerateHelper, autoFieldLabelStyle } from './AutoGenerateHints';
import { UnitConversionPreview } from './UnitConversionPreview';

export interface UnitOption {
  id: string;
  name: string;
  symbol: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

const WIZARD_STEPS = ['Info dasar', 'Tipe produk', 'Satuan', 'Pratinjau'] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

const stepStyle = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap' as const,
  marginBottom: '1rem',
};

const stepButtonStyle = (active: boolean, done: boolean) => ({
  padding: '0.4rem 0.75rem',
  borderRadius: 999,
  border: `1px solid ${active ? '#2563eb' : done ? '#86efac' : '#e2e8f0'}`,
  background: active ? '#eff6ff' : done ? '#f0fdf4' : '#fff',
  color: active ? '#1d4ed8' : done ? '#166534' : '#64748b',
  fontSize: '0.8rem',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer' as const,
});

const radioCardStyle = (selected: boolean) => ({
  display: 'grid',
  gap: '0.25rem',
  padding: '0.75rem',
  borderRadius: 10,
  border: `2px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
  background: selected ? '#eff6ff' : '#fff',
  cursor: 'pointer' as const,
});

const errorBoxStyle = {
  color: '#b45309',
  background: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: 10,
  padding: '0.625rem 0.75rem',
  fontSize: '0.85rem',
};

export type ProductWizardFormState = ProductFormInput;

export type ProductWizardOnChange = (
  next: ProductWizardFormState | ((prev: ProductWizardFormState) => ProductWizardFormState),
) => void;

export function createEmptyWizardForm(): ProductWizardFormState {
  return {
    sku: '',
    name: '',
    price: '',
    costPrice: '',
    unitId: '',
    categoryId: '',
    productType: ProductType.SIMPLE,
    hasVariants: false,
    sellOnline: false,
    imageUrl: '',
    moq: '1',
    orderStep: '1',
    unitConversions: [],
    variantDrafts: [],
    initialStockQty: '',
  };
}

export function ProductFormWizard({
  form,
  onChange,
  units,
  categories,
  disabled,
  showCostFields,
  mode,
  parentSku,
  onImageUpload,
  uploadingImage,
  imagePreviewUrl,
  onSubmit,
  submitLabel,
  isVariantChild,
}: {
  form: ProductWizardFormState;
  onChange: ProductWizardOnChange;
  units: UnitOption[];
  categories: CategoryOption[];
  disabled?: boolean;
  showCostFields?: boolean;
  mode: 'create' | 'edit';
  /** Parent SKU — used for variant-child auto SKU. */
  parentSku?: string;
  onImageUpload?: (file: File) => void;
  uploadingImage?: boolean;
  imagePreviewUrl?: string | null;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  isVariantChild?: boolean;
}) {
  const [step, setStep] = useState<WizardStep>('Info dasar');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(mode === 'edit' && !!form.sku.trim());
  const [skuAutoFilled, setSkuAutoFilled] = useState(false);
  const [costInputMode, setCostInputMode] = useState<'purchase' | 'base'>('purchase');
  const autoSkuSuffixRef = useRef<string | null>(null);
  const autoSkuTimestampRef = useRef<number | null>(null);
  const lastAutoSkuRef = useRef('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const selectedUnit = units.find((u) => u.id === form.unitId);
  const categoryName = selectedCategory?.name;

  function buildAutoSku(freshSuffix = false) {
    if (freshSuffix || !autoSkuSuffixRef.current) {
      autoSkuSuffixRef.current = randomAlphanumeric(4);
    }
    if (freshSuffix || autoSkuTimestampRef.current === null) {
      autoSkuTimestampRef.current = Date.now();
    }
    if (isVariantChild && parentSku?.trim()) {
      return generateVariantSku(parentSku, form.variantLabel ?? '', { existingSkus: [] });
    }
    return generateProductSku({
      name: form.name,
      categoryName,
      randomSuffix: autoSkuSuffixRef.current,
      timestamp: autoSkuTimestampRef.current,
    });
  }

  function applyAutoSku(force = false) {
    const allowCreate = mode === 'create' && !skuManuallyEdited;
    const allowEdit = mode === 'edit' && !form.sku.trim() && !skuManuallyEdited;
    if (!allowCreate && !allowEdit && !force) return;

    const nextSku = buildAutoSku(force);
    if (!force && nextSku === lastAutoSkuRef.current) return;

    lastAutoSkuRef.current = nextSku;
    setSkuAutoFilled(true);
    onChangeRef.current((prev) => (prev.sku === nextSku ? prev : { ...prev, sku: nextSku }));
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    applyAutoSku();
  }, [isMounted, mode, skuManuallyEdited, form.name, form.categoryId, form.variantLabel, form.sku, categoryName, isVariantChild, parentSku]);

  /** Empty on SSR/first paint (create) so server HTML matches client before auto-SKU runs. */
  const skuInputValue = mode === 'edit' || isMounted ? form.sku : '';

  function handleSkuChange(value: string) {
    setSkuManuallyEdited(true);
    setSkuAutoFilled(false);
    patch({ sku: value });
  }

  function handleRegenerateSku() {
    setSkuManuallyEdited(false);
    applyAutoSku(true);
  }

  const isVariantParent =
    form.productType === ProductType.VARIANT && !isVariantChild && form.hasVariants !== false;
  const validationOptions = useMemo(
    () => ({
      requireCost: showCostFields,
      isVariantChild,
      requireVariantDrafts: isVariantParent && mode === 'create',
    }),
    [showCostFields, isVariantChild, isVariantParent, mode],
  );

  const validation = useMemo(
    () => validateProductForm(form, validationOptions),
    [form, validationOptions],
  );

  const submittable = useMemo(
    () => isProductFormSubmittable(form, validationOptions),
    [form, validationOptions],
  );

  useEffect(() => {
    if (!form.categoryId || form.unitId) return;
    const suggested = suggestBaseUnitSymbol(categoryName);
    if (!suggested) return;
    const match = units.find((u) => u.symbol.toLowerCase() === suggested);
    if (!match) return;
    const suggestedStep = suggestOrderStep(match.symbol);
    onChangeRef.current((prev) => {
      if (!prev.categoryId || prev.unitId) return prev;
      const nextOrderStep = String(suggestedStep);
      const nextMoq = String(suggestedStep);
      if (
        prev.unitId === match.id &&
        prev.orderStep === nextOrderStep &&
        prev.moq === nextMoq
      ) {
        return prev;
      }
      return {
        ...prev,
        unitId: match.id,
        orderStep: nextOrderStep,
        moq: nextMoq,
      };
    });
  }, [form.categoryId, form.unitId, categoryName, units]);

  useEffect(() => {
    if (form.productType !== ProductType.MULTI_UNIT || !selectedUnit) return;
    const suggestedStep = suggestOrderStep(selectedUnit.symbol);
    if (suggestedStep === 1) return;
    const nextStep = String(suggestedStep);
    onChangeRef.current((prev) => {
      if (prev.productType !== ProductType.MULTI_UNIT || prev.orderStep !== '1') return prev;
      if (prev.orderStep === nextStep && prev.moq === nextStep) return prev;
      return {
        ...prev,
        orderStep: nextStep,
        moq: nextStep,
      };
    });
  }, [form.productType, form.unitId, selectedUnit?.symbol]);

  function patch(partial: Partial<ProductWizardFormState>) {
    onChange((prev) => ({ ...prev, ...partial }));
  }

  function setProductType(productType: ProductType) {
    onChange((prev) => ({
      ...prev,
      productType,
      hasVariants: productType === ProductType.VARIANT,
      parentProductId: productType === ProductType.VARIANT ? undefined : prev.parentProductId,
      variantLabel: productType === ProductType.VARIANT ? undefined : prev.variantLabel,
      sellOnline: productType === ProductType.VARIANT ? false : prev.sellOnline,
      price: productType === ProductType.VARIANT ? '0' : prev.price,
      costPrice: productType === ProductType.VARIANT ? '' : prev.costPrice,
      variantDrafts:
        productType === ProductType.VARIANT
          ? prev.variantDrafts?.length
            ? prev.variantDrafts
            : [createEmptyVariantDraft()]
          : [],
    }));
  }

  function patchVariantDraft(id: string, partial: Partial<VariantDraft>) {
    onChange((prev) => ({
      ...prev,
      variantDrafts: (prev.variantDrafts ?? []).map((row) =>
        row.id === id ? { ...row, ...partial } : row,
      ),
    }));
  }

  function addVariantDraftRow() {
    onChange((prev) => ({
      ...prev,
      variantDrafts: [...(prev.variantDrafts ?? []), createEmptyVariantDraft()],
    }));
  }

  function removeVariantDraftRow(id: string) {
    onChange((prev) => {
      const next = (prev.variantDrafts ?? []).filter((row) => row.id !== id);
      return {
        ...prev,
        variantDrafts: next.length > 0 ? next : [createEmptyVariantDraft()],
      };
    });
  }

  function handleVariantLabelChange(row: VariantDraft, label: string) {
    const existingSkus = (form.variantDrafts ?? [])
      .filter((draft) => draft.id !== row.id)
      .map((draft) => draft.sku)
      .filter(Boolean);
    const nextSku = row.skuManuallyEdited
      ? row.sku
      : generateVariantSku(form.sku, label, { existingSkus });
    patchVariantDraft(row.id, { variantLabel: label, sku: nextSku });
  }

  function handleVariantSkuChange(row: VariantDraft, sku: string) {
    patchVariantDraft(row.id, { sku, skuManuallyEdited: true });
  }

  function getUnitLabel(unit?: UnitOption | null) {
    if (!unit) return '-';
    return `${unit.name} (${unit.symbol})`;
  }

  function patchMultiUnitConfig(partial: Partial<MultiUnitFormConfig>) {
    const current = parseMultiUnitConfig(form.unitConversions);
    const next: MultiUnitFormConfig = { ...current, ...partial };
    patch({
      unitConversions: buildUnitConversionsFromMultiUnit(next, form.unitConversions),
    });
  }

  const prevCategoryIdRef = useRef(form.categoryId);

  function applyMultiUnitDefaults(forceRefresh = false) {
    if (form.productType !== ProductType.MULTI_UNIT) return;

    const suggestedBase = suggestBaseUnitSymbol(categoryName);
    const baseUnit = suggestedBase
      ? units.find((u) => u.symbol.toLowerCase() === suggestedBase)
      : units.find((u) => u.id === form.unitId);
    if (!baseUnit) return;

    const purchase = form.unitConversions?.find((c) => c.isPurchaseUnit);
    if (!forceRefresh && purchase?.unitId && baseUnit.id === form.unitId) return;

    const suggestedPurchase = suggestPurchaseUnitSymbol(categoryName);
    const purchaseUnit = suggestedPurchase
      ? units.find((u) => u.symbol.toLowerCase() === suggestedPurchase)
      : units.find((u) => u.id !== baseUnit.id);

    if (!purchaseUnit) return;

    const config: MultiUnitFormConfig = {
      purchaseUnitId: purchaseUnit.id,
      purchaseConversionToBase:
        suggestPurchaseConversionToBase(categoryName) ?? DEFAULT_PURCHASE_CONVERSION,
      sellInPurchaseUnit: true,
    };
    onChangeRef.current((prev) => {
      if (prev.productType !== ProductType.MULTI_UNIT) return prev;
      const nextConversions = buildUnitConversionsFromMultiUnit(config);
      const nextOrderStep = String(suggestOrderStep(baseUnit.symbol));
      const nextMoq = String(suggestOrderStep(baseUnit.symbol));
      if (
        !forceRefresh &&
        prev.unitId === baseUnit.id &&
        prev.unitConversions?.find((c) => c.isPurchaseUnit)?.unitId &&
        prev.orderStep === nextOrderStep &&
        prev.moq === nextMoq
      ) {
        return prev;
      }
      return {
        ...prev,
        unitId: baseUnit.id,
        unitConversions: nextConversions,
        orderStep: nextOrderStep,
        moq: nextMoq,
      };
    });
  }

  useEffect(() => {
    if (form.productType !== ProductType.MULTI_UNIT) return;
    const categoryChanged = prevCategoryIdRef.current !== form.categoryId;
    prevCategoryIdRef.current = form.categoryId;
    applyMultiUnitDefaults(categoryChanged);
  }, [form.productType, form.unitId, form.categoryId, categoryName, units.length]);

  const multiUnitConfig = parseMultiUnitConfig(form.unitConversions);
  const purchaseUnit = multiUnitConfig.purchaseUnitId
    ? units.find((u) => u.id === multiUnitConfig.purchaseUnitId)
    : undefined;
  const baseUnitSymbol = selectedUnit?.symbol ?? 'satuan stok';
  const purchaseConversion = multiUnitConfig.purchaseConversionToBase;
  const baseSellPrice = Number(form.price) || 0;
  const baseCostPrice = Number(form.costPrice) || 0;
  const derivedPackageSellPrice =
    purchaseConversion > 0 ? derivePackageSellPrice(baseSellPrice, purchaseConversion) : 0;
  const derivedPurchaseCost =
    purchaseConversion > 0 ? derivePurchaseCostFromBaseCost(baseCostPrice, purchaseConversion) : 0;

  function handlePurchaseCostInput(value: string) {
    if (!value.trim()) {
      patch({ costPrice: '' });
      return;
    }
    const purchaseCost = parseCurrencyInput(value);
    const baseCost = deriveBaseCostFromPurchaseCost(purchaseCost, purchaseConversion || 1);
    patch({ costPrice: String(baseCost) });
  }

  function validateCurrentStep(): boolean {
    const result = validateProductForm(form, validationOptions);
    setFieldErrors(result.errors);

    if (step === 'Info dasar') {
      const stepErrors: Record<string, string> = {};
      if (result.errors.sku) stepErrors.sku = result.errors.sku;
      if (result.errors.name) stepErrors.name = result.errors.name;
      if (form.productType === ProductType.SIMPLE) {
        if (result.errors.price) stepErrors.price = result.errors.price;
        if (result.errors.costPrice) stepErrors.costPrice = result.errors.costPrice;
      }
      setFieldErrors(stepErrors);
      return Object.keys(stepErrors).length === 0;
    }
    if (step === 'Satuan') {
      const stepErrors: Record<string, string> = {};
      if (result.errors.unitId) stepErrors.unitId = result.errors.unitId;
      if (result.errors.moq) stepErrors.moq = result.errors.moq;
      if (result.errors.orderStep) stepErrors.orderStep = result.errors.orderStep;
      if (result.errors.unitConversions) stepErrors.unitConversions = result.errors.unitConversions;
      if (form.productType === ProductType.MULTI_UNIT || form.productType === ProductType.SIMPLE) {
        if (result.errors.price) stepErrors.price = result.errors.price;
        if (result.errors.costPrice) stepErrors.costPrice = result.errors.costPrice;
      }
      if (isVariantParent && mode === 'create') {
        if (result.errors.variantDrafts) stepErrors.variantDrafts = result.errors.variantDrafts;
        Object.entries(result.errors).forEach(([key, message]) => {
          if (key.startsWith('variantDrafts[')) stepErrors[key] = message;
        });
      }
      setFieldErrors(stepErrors);
      return Object.keys(stepErrors).length === 0;
    }
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx < WIZARD_STEPS.length - 1) {
      setStep(WIZARD_STEPS[idx + 1]);
    }
  }

  function goPrev() {
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx > 0) {
      setStep(WIZARD_STEPS[idx - 1]);
    }
  }

  /** Block implicit form submit (Enter in inputs) — save only via explicit Simpan click on final step. */
  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
  }

  function handleSaveClick(e: FormEvent) {
    e.preventDefault();
    if (disabled || !submittable || step !== 'Pratinjau') return;
    onSubmit(e);
  }

  const stepIndex = WIZARD_STEPS.indexOf(step);
  const isFinalStep = stepIndex === WIZARD_STEPS.length - 1;

  return (
    <form onSubmit={handleFormSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
      <nav style={stepStyle} aria-label="Langkah form produk">
        {WIZARD_STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            style={stepButtonStyle(step === label, idx < stepIndex)}
            onClick={() => setStep(label)}
            disabled={disabled}
          >
            {idx + 1}. {label}
          </button>
        ))}
      </nav>

      {step === 'Info dasar' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gap: '0.375rem' }}>
              <div style={autoFieldLabelStyle()}>
                <label htmlFor="product-sku" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  SKU
                </label>
                {isMounted && skuAutoFilled && !skuManuallyEdited ? <AutoGenerateBadge /> : null}
              </div>
              <Input
                id="product-sku"
                aria-label="SKU"
                value={skuInputValue}
                onChange={(e) => handleSkuChange(e.target.value)}
                placeholder="SMN-001"
                fullWidth
                disabled={disabled}
                error={fieldErrors.sku}
              />
              <AutoGenerateHelper>SKU dibuat otomatis, bisa diubah manual</AutoGenerateHelper>
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                onClick={handleRegenerateSku}
                style={{ justifySelf: 'start', padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
              >
                Generate ulang
              </Button>
            </div>
            <Input
              label="Nama produk"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Semen Portland 40kg"
              fullWidth
              disabled={disabled}
              error={fieldErrors.name}
            />
            {form.productType === ProductType.SIMPLE ? (
              <>
                <CurrencyInput
                  label={
                    selectedUnit
                      ? `Harga jual per ${baseUnitSymbol}`
                      : 'Harga jual per satuan stok'
                  }
                  value={form.price}
                  onChange={(price) => patch({ price })}
                  placeholder="75.000"
                  fullWidth
                  disabled={disabled}
                  error={fieldErrors.price}
                />
                {showCostFields ? (
                  <CurrencyInput
                    label={
                      selectedUnit
                        ? `Harga beli per ${baseUnitSymbol} (HPP)`
                        : 'Harga beli per satuan stok (HPP)'
                    }
                    value={form.costPrice ?? ''}
                    onChange={(costPrice) => patch({ costPrice })}
                    placeholder="70.000"
                    fullWidth
                    disabled={disabled}
                    error={fieldErrors.costPrice}
                  />
                ) : null}
              </>
            ) : form.productType === ProductType.MULTI_UNIT ? (
              <div
                style={{
                  gridColumn: 'span 2',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8125rem',
                  color: '#475569',
                }}
              >
                Harga jual & beli diatur di langkah <strong>Satuan</strong> setelah satuan stok dan beli dipilih.
              </div>
            ) : (
              <div
                style={{
                  gridColumn: 'span 2',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  fontSize: '0.8125rem',
                  color: '#1e3a8a',
                }}
              >
                Produk induk varian tidak dijual langsung. Atur <strong>harga per ukuran</strong> di langkah Satuan
                (contoh: 5 Liter Rp 85.000, 25 Liter Rp 350.000).
              </div>
            )}
          </div>
          {form.productType === ProductType.SIMPLE && !selectedUnit ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
              Satuan stok dipilih di langkah berikutnya — harga di atas selalu per satuan stok (kg, m, pcs, dll.).
            </p>
          ) : null}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'grid', gap: '0.375rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Kategori</span>
              <select
                value={form.categoryId ?? ''}
                onChange={(e) => patch({ categoryId: e.target.value })}
                disabled={disabled}
                style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid #cbd5e1' }}
              >
                <option value="">Tanpa kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'end', marginBottom: '0.25rem' }}>
              <input
                type="checkbox"
                checked={form.sellOnline ?? false}
                disabled={disabled || form.productType === ProductType.VARIANT}
                onChange={(e) => patch({ sellOnline: e.target.checked })}
              />
              <span style={{ fontSize: '0.875rem' }}>Jual online (storefront)</span>
            </label>
          </div>
          <Input
            label="URL gambar produk (opsional)"
            value={form.imageUrl ?? ''}
            onChange={(e) => patch({ imageUrl: e.target.value })}
            placeholder="https://... atau unggah file di bawah"
            fullWidth
            disabled={disabled}
          />
          {onImageUpload ? (
            <label style={{ display: 'grid', gap: '0.375rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Unggah gambar (maks. 2 MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={disabled || uploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImageUpload(file);
                }}
              />
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Pratinjau produk"
                  style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              ) : null}
            </label>
          ) : null}
        </>
      ) : null}

      {step === 'Tipe produk' ? (
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Pilih tipe produk terlebih dahulu. Field satuan akan menyesuaikan — varian dan konversi satuan tidak dicampur.
          </p>
          {(Object.values(ProductType) as ProductType[]).map((type) => (
            <label key={type} style={radioCardStyle(form.productType === type)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="productType"
                  checked={form.productType === type}
                  disabled={disabled || (isVariantChild && type !== ProductType.VARIANT)}
                  onChange={() => setProductType(type)}
                />
                <strong>{PRODUCT_TYPE_LABELS[type]}</strong>
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', paddingLeft: '1.5rem' }}>
                {PRODUCT_TYPE_DESCRIPTIONS[type]}
              </span>
            </label>
          ))}
          {form.productType === ProductType.VARIANT && !isVariantChild ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#1e40af', background: '#eff6ff', padding: '0.625rem', borderRadius: 8 }}>
              Tiap ukuran punya SKU &amp; harga sendiri — bukan konversi satuan seperti multi-satuan (paku dus→kg).
              {mode === 'create' ? ' Tambahkan varian di langkah Satuan.' : ' Kelola varian lewat panel "Kelola varian".'}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 'Satuan' ? (
        <>
          <label style={{ display: 'grid', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Satuan dasar (stok internal)</span>
            <select
              value={form.unitId}
              onChange={(e) => patch({ unitId: e.target.value })}
              disabled={disabled}
              style={{ padding: '0.75rem', borderRadius: 8, border: fieldErrors.unitId ? '1px solid #f59e0b' : '1px solid #cbd5e1' }}
            >
              <option value="">Pilih satuan</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{getUnitLabel(unit)}</option>
              ))}
            </select>
            {fieldErrors.unitId ? <span style={{ color: '#b45309', fontSize: '0.8125rem' }}>{fieldErrors.unitId}</span> : null}
          </label>

          {form.productType === ProductType.SIMPLE ? (
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Produk sederhana: beli dan jual menggunakan satuan dasar yang sama ({selectedUnit?.symbol ?? '—'}).
            </p>
          ) : null}

          {form.productType === ProductType.MULTI_UNIT ? (
            <div style={{ display: 'grid', gap: '0.875rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Stok dihitung dalam <strong>{selectedUnit?.symbol ?? 'satuan dasar'}</strong>.
                Atur cara beli dari supplier dan cara jual ke pelanggan.
              </p>

              <fieldset
                style={{
                  margin: 0,
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  display: 'grid',
                  gap: '0.625rem',
                }}
              >
                <legend style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.25rem' }}>
                  Satuan beli ke supplier
                </legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.85rem' }}>
                    Satuan beli
                    <select
                      value={multiUnitConfig.purchaseUnitId}
                      onChange={(e) => patchMultiUnitConfig({ purchaseUnitId: e.target.value })}
                      disabled={disabled}
                      style={{ padding: '0.65rem', borderRadius: 8, border: '1px solid #cbd5e1' }}
                    >
                      <option value="">Pilih satuan (contoh: dus)</option>
                      {units.filter((u) => u.id !== form.unitId).map((u) => (
                        <option key={u.id} value={u.id}>{getUnitLabel(u)}</option>
                      ))}
                    </select>
                  </label>
                  <QuantityInput
                    label={`1 ${purchaseUnit?.symbol ?? 'satuan beli'} = … ${selectedUnit?.symbol ?? 'stok'}`}
                    value={String(multiUnitConfig.purchaseConversionToBase)}
                    onChange={(v) =>
                      patchMultiUnitConfig({ purchaseConversionToBase: Number(v) || 0 })
                    }
                    disabled={disabled}
                  />
                </div>
                {purchaseUnit && multiUnitConfig.purchaseConversionToBase > 0 && selectedUnit ? (
                  <UnitConversionPreview
                    purchaseQty={1}
                    purchaseSymbol={purchaseUnit.symbol}
                    conversionToBase={multiUnitConfig.purchaseConversionToBase}
                    baseSymbol={selectedUnit.symbol}
                  />
                ) : null}
              </fieldset>

              <fieldset
                style={{
                  margin: 0,
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  display: 'grid',
                  gap: '0.625rem',
                }}
              >
                <legend style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.25rem' }}>
                  Satuan jual ke pelanggan
                </legend>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                  Ecer per {selectedUnit?.symbol ?? 'satuan stok'} selalu tersedia di kasir.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <QuantityInput
                    label={`Min. jual ecer (${selectedUnit?.symbol ?? 'stok'})`}
                    value={form.moq ?? '1'}
                    onChange={(moq) => patch({ moq })}
                    disabled={disabled}
                    error={fieldErrors.moq}
                  />
                  <QuantityInput
                    label={`Kelipatan ecer (${selectedUnit?.symbol ?? 'stok'})`}
                    value={form.orderStep ?? '1'}
                    onChange={(orderStep) => patch({ orderStep })}
                    disabled={disabled}
                    error={fieldErrors.orderStep}
                  />
                </div>
                {purchaseUnit ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={multiUnitConfig.sellInPurchaseUnit}
                      disabled={disabled}
                      onChange={(e) => patchMultiUnitConfig({ sellInPurchaseUnit: e.target.checked })}
                    />
                    Juga jual per {purchaseUnit.symbol} ({purchaseUnit.name})
                  </label>
                ) : null}
              </fieldset>

              {fieldErrors.unitConversions ? (
                <span style={{ color: '#b45309', fontSize: '0.8125rem' }}>{fieldErrors.unitConversions}</span>
              ) : null}

              <fieldset
                style={{
                  margin: 0,
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  display: 'grid',
                  gap: '0.625rem',
                }}
              >
                <legend style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.25rem' }}>
                  Harga jual & beli
                </legend>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                  Harga ecer disimpan per <strong>{baseUnitSymbol}</strong> (satuan stok).
                  Harga paket {purchaseUnit?.symbol ?? 'beli'} dihitung otomatis untuk kasir.
                </p>
                <CurrencyInput
                  label={`Harga jual ecer per ${baseUnitSymbol}`}
                  value={form.price}
                  onChange={(price) => patch({ price })}
                  placeholder="18.000"
                  fullWidth
                  disabled={disabled}
                  error={fieldErrors.price}
                />
                {showCostFields ? (
                  <>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                          type="radio"
                          name="costInputMode"
                          checked={costInputMode === 'purchase'}
                          disabled={disabled || !purchaseUnit}
                          onChange={() => setCostInputMode('purchase')}
                        />
                        Input per {purchaseUnit?.symbol ?? 'satuan beli'} (distributor)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                          type="radio"
                          name="costInputMode"
                          checked={costInputMode === 'base'}
                          disabled={disabled}
                          onChange={() => setCostInputMode('base')}
                        />
                        Input per {baseUnitSymbol} (HPP)
                      </label>
                    </div>
                    {costInputMode === 'purchase' && purchaseUnit ? (
                      <CurrencyInput
                        label={`Harga beli per ${purchaseUnit.symbol} (dari distributor)`}
                        value={derivedPurchaseCost > 0 ? String(derivedPurchaseCost) : ''}
                        onChange={handlePurchaseCostInput}
                        placeholder="300.000"
                        fullWidth
                        disabled={disabled}
                        error={fieldErrors.costPrice}
                      />
                    ) : (
                      <CurrencyInput
                        label={`Harga beli per ${baseUnitSymbol} (HPP)`}
                        value={form.costPrice ?? ''}
                        onChange={(costPrice) => patch({ costPrice })}
                        placeholder="15.000"
                        fullWidth
                        disabled={disabled}
                        error={fieldErrors.costPrice}
                      />
                    )}
                  </>
                ) : null}
                {purchaseUnit && purchaseConversion > 0 && baseSellPrice > 0 ? (
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#1e40af' }}>
                    Harga jual per {purchaseUnit.symbol} (otomatis):{' '}
                    <strong>{formatCurrencyIDR(derivedPackageSellPrice)}</strong>
                    {multiUnitConfig.sellInPurchaseUnit
                      ? ' — tersedia di kasir'
                      : ` — aktifkan "Juga jual per ${purchaseUnit.symbol}" untuk jual paket`}
                  </p>
                ) : null}
                {purchaseUnit && purchaseConversion > 0 && (baseSellPrice > 0 || baseCostPrice > 0) ? (
                  <UnitConversionPreview
                    purchaseQty={1}
                    purchaseSymbol={purchaseUnit.symbol}
                    conversionToBase={purchaseConversion}
                    baseSymbol={baseUnitSymbol}
                    sellPrice={baseSellPrice || undefined}
                    baseCostPrice={baseCostPrice || undefined}
                  />
                ) : null}
              </fieldset>
            </div>
          ) : null}

          {form.productType === ProductType.SIMPLE && selectedUnit ? (
            <fieldset
              style={{
                margin: 0,
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                display: 'grid',
                gap: '0.625rem',
              }}
            >
              <legend style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.25rem' }}>
                Harga jual & beli
              </legend>
              <CurrencyInput
                label={`Harga jual per ${baseUnitSymbol}`}
                value={form.price}
                onChange={(price) => patch({ price })}
                placeholder="75.000"
                fullWidth
                disabled={disabled}
                error={fieldErrors.price}
              />
              {showCostFields ? (
                <CurrencyInput
                  label={`Harga beli per ${baseUnitSymbol} (HPP)`}
                  value={form.costPrice ?? ''}
                  onChange={(costPrice) => patch({ costPrice })}
                  placeholder="70.000"
                  fullWidth
                  disabled={disabled}
                  error={fieldErrors.costPrice}
                />
              ) : null}
            </fieldset>
          ) : null}

          {mode === 'create' && !isVariantChild && form.productType !== ProductType.VARIANT ? (
            <fieldset
              style={{
                margin: 0,
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                display: 'grid',
                gap: '0.625rem',
              }}
            >
              <legend style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.25rem' }}>
                Stok awal (opsional)
              </legend>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                Qty dalam satuan dasar untuk cabang yang sedang dipilih di header dashboard.
              </p>
              <QuantityInput
                label={`Stok awal (${baseUnitSymbol})`}
                value={form.initialStockQty ?? ''}
                onChange={(initialStockQty) => patch({ initialStockQty })}
                placeholder="0"
                disabled={disabled}
                style={{ maxWidth: 200, padding: '0.5rem' }}
              />
            </fieldset>
          ) : null}

          {form.productType === ProductType.VARIANT && !isVariantChild ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Satuan dasar induk: {getUnitLabel(selectedUnit)} — diwarisi ke semua SKU anak. Stok &amp; harga per varian.
              </p>
              {mode === 'create' ? (
                <fieldset
                  style={{
                    margin: 0,
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    display: 'grid',
                    gap: '0.625rem',
                  }}
                >
                  <legend style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.25rem' }}>
                    Daftar varian (ukuran &amp; harga)
                  </legend>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                    Contoh: 5 Liter Rp 85.000, 25 Liter Rp 350.000 — masing-masing jadi item terpisah di kasir.
                  </p>
                  {fieldErrors.variantDrafts ? (
                    <p style={{ margin: 0, color: '#b45309', fontSize: '0.8125rem' }}>{fieldErrors.variantDrafts}</p>
                  ) : null}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '0.4rem' }}>Ukuran</th>
                          <th style={{ padding: '0.4rem' }}>SKU</th>
                          <th style={{ padding: '0.4rem' }}>Harga jual</th>
                          {showCostFields ? <th style={{ padding: '0.4rem' }}>Harga beli</th> : null}
                          <th style={{ padding: '0.4rem' }}>Stok awal</th>
                          <th style={{ padding: '0.4rem' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {(form.variantDrafts ?? []).map((row, index) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.35rem', minWidth: 120 }}>
                              <Input
                                aria-label={`Ukuran varian ${index + 1}`}
                                value={row.variantLabel}
                                onChange={(e) => handleVariantLabelChange(row, e.target.value)}
                                placeholder="5 Liter"
                                fullWidth
                                disabled={disabled}
                              />
                            </td>
                            <td style={{ padding: '0.35rem', minWidth: 110 }}>
                              <Input
                                aria-label={`SKU varian ${index + 1}`}
                                value={row.sku}
                                onChange={(e) => handleVariantSkuChange(row, e.target.value)}
                                placeholder="CAT-5L"
                                fullWidth
                                disabled={disabled}
                              />
                            </td>
                            <td style={{ padding: '0.35rem', minWidth: 120 }}>
                              <CurrencyInput
                                aria-label={`Harga jual varian ${index + 1}`}
                                value={row.price}
                                onChange={(price) => patchVariantDraft(row.id, { price })}
                                placeholder="85.000"
                                fullWidth
                                disabled={disabled}
                              />
                            </td>
                            {showCostFields ? (
                              <td style={{ padding: '0.35rem', minWidth: 120 }}>
                                <CurrencyInput
                                  aria-label={`Harga beli varian ${index + 1}`}
                                  value={row.costPrice ?? ''}
                                  onChange={(costPrice) => patchVariantDraft(row.id, { costPrice })}
                                  placeholder="70.000"
                                  fullWidth
                                  disabled={disabled}
                                />
                              </td>
                            ) : null}
                            <td style={{ padding: '0.35rem', minWidth: 90 }}>
                              <QuantityInput
                                label=""
                                value={row.stockQty ?? ''}
                                onChange={(stockQty) => patchVariantDraft(row.id, { stockQty })}
                                placeholder="0"
                                disabled={disabled}
                              />
                            </td>
                            <td style={{ padding: '0.35rem' }}>
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={disabled || (form.variantDrafts?.length ?? 0) <= 1}
                                onClick={() => removeVariantDraftRow(row.id)}
                              >
                                Hapus
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button type="button" variant="secondary" disabled={disabled} onClick={addVariantDraftRow}>
                    + Tambah varian
                  </Button>
                </fieldset>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#1e40af' }}>
                  Varian yang sudah ada dikelola lewat panel &quot;Kelola varian&quot; di daftar produk.
                </p>
              )}
            </div>
          ) : null}
        </>
      ) : null}

      {step === 'Pratinjau' ? (
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#334155' }}>
            <p style={{ margin: '0 0 0.35rem' }}><strong>{form.name || '—'}</strong> ({form.sku || '—'})</p>
            <p style={{ margin: '0 0 0.35rem' }}>Tipe: {PRODUCT_TYPE_LABELS[form.productType]}</p>
            <p style={{ margin: '0 0 0.35rem' }}>Satuan stok: {getUnitLabel(selectedUnit)}</p>
            {form.productType === ProductType.MULTI_UNIT && purchaseUnit && multiUnitConfig.purchaseConversionToBase > 0 ? (
              <UnitConversionPreview
                variant="block"
                purchaseQty={10}
                purchaseSymbol={purchaseUnit.symbol}
                conversionToBase={multiUnitConfig.purchaseConversionToBase}
                baseSymbol={selectedUnit?.symbol}
                sellQty={Number(form.orderStep) || 0.5}
                sellSymbol={selectedUnit?.symbol}
                sellPrice={Number(form.price) || undefined}
                baseCostPrice={Number(form.costPrice) || undefined}
              />
            ) : null}
            {form.productType === ProductType.SIMPLE && selectedUnit ? (
              <UnitConversionPreview
                variant="block"
                sellQty={1}
                sellSymbol={selectedUnit.symbol}
                sellPrice={Number(form.price) || undefined}
              />
            ) : null}
            {isVariantParent && (form.variantDrafts?.length ?? 0) > 0 ? (
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>Varian ({form.variantDrafts?.length})</p>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8125rem' }}>
                  {(form.variantDrafts ?? [])
                    .filter((row) => row.variantLabel.trim() || row.price.trim())
                    .map((row) => (
                      <li key={row.id}>
                        <strong>{row.variantLabel || '—'}</strong> ({row.sku || '—'}) —{' '}
                        {row.price.trim() ? formatCurrencyIDR(Number(row.price)) : '—'}
                        {showCostFields && row.costPrice?.trim()
                          ? ` / beli ${formatCurrencyIDR(Number(row.costPrice))}`
                          : ''}
                        {row.stockQty?.trim() ? ` · stok awal ${row.stockQty}` : ''}
                      </li>
                    ))}
                </ul>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                  Induk tidak muncul di kasir — tiap varian tampil sebagai item terpisah.
                </p>
              </div>
            ) : null}
          </div>
          {validation.messages.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8125rem', color: '#92400e' }}>
              {validation.messages.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          ) : null}
          {!submittable && Object.keys(validation.errors).length > 0 ? (
            <div style={errorBoxStyle}>
              Periksa field berikut: {Object.values(validation.errors).join('; ')}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {stepIndex > 0 ? (
          <Button type="button" variant="secondary" disabled={disabled} onClick={goPrev}>
            Sebelumnya
          </Button>
        ) : null}
        {!isFinalStep ? (
          <Button type="button" disabled={disabled} onClick={goNext}>
            Lanjut
          </Button>
        ) : (
          <Button type="button" disabled={disabled || !submittable} onClick={handleSaveClick}>
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}

export { formatConversionPreview };
