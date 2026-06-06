import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductType } from '@barokah/shared';
import {
  ProductFormWizard,
  createEmptyWizardForm,
} from '@/components/master/ProductFormWizard';

function WizardHarness({
  initialForm,
  units,
  categories,
  mode = 'create' as const,
  onSubmit = vi.fn(),
}: {
  initialForm?: ReturnType<typeof createEmptyWizardForm>;
  units: { id: string; name: string; symbol: string }[];
  categories: { id: string; name: string }[];
  mode?: 'create' | 'edit';
  onSubmit?: ReturnType<typeof vi.fn>;
}) {
  const [form, setForm] = useState(initialForm ?? createEmptyWizardForm());
  return (
    <ProductFormWizard
      form={form}
      onChange={setForm}
      units={units}
      categories={categories}
      mode={mode}
      onSubmit={onSubmit}
      submitLabel="Tambah produk"
    />
  );
}

function fillBasicInfo() {
  fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'TST-001' } });
  fireEvent.change(screen.getByLabelText('Nama produk'), { target: { value: 'Semen Test' } });
  const priceInput = screen.getByLabelText(/Harga jual/);
  fireEvent.change(priceInput, { target: { value: '75000' } });
  fireEvent.blur(priceInput);
}

describe('ProductFormWizard', () => {
  const units = [
    { id: 'u-kg', name: 'Kilogram', symbol: 'kg' },
    { id: 'u-dus', name: 'Dus', symbol: 'dus' },
  ];
  const categories = [{ id: 'c-1', name: 'Semen & Mortar' }];

  it('shows wizard steps and product type options', () => {
    render(
      <ProductFormWizard
        form={createEmptyWizardForm()}
        onChange={vi.fn()}
        units={units}
        categories={categories}
        mode="create"
        onSubmit={vi.fn()}
        submitLabel="Tambah produk"
      />,
    );

    expect(screen.getByText('1. Info dasar')).toBeInTheDocument();
    expect(screen.getByText('2. Tipe produk')).toBeInTheDocument();
    fireEvent.click(screen.getByText('2. Tipe produk'));
    expect(screen.getByText('Sederhana')).toBeInTheDocument();
    expect(screen.getByText('Multi-satuan')).toBeInTheDocument();
    expect(screen.getByText('Induk varian')).toBeInTheDocument();
  });

  it('shows unit-labeled pricing fields on MULTI_UNIT satuan step', () => {
    const form = {
      ...createEmptyWizardForm(),
      sku: 'PAK-001',
      name: 'Paku 2"',
      price: '18000',
      costPrice: '15000',
      productType: ProductType.MULTI_UNIT,
      unitId: 'u-kg',
      unitConversions: [
        {
          unitId: 'u-dus',
          conversionToBase: 20,
          isPurchaseUnit: true,
          isSellUnit: true,
        },
      ],
    };
    render(
      <ProductFormWizard
        form={form}
        onChange={vi.fn()}
        units={units}
        categories={categories}
        mode="create"
        showCostFields
        onSubmit={vi.fn()}
        submitLabel="Tambah"
      />,
    );

    fireEvent.click(screen.getByText('3. Satuan'));
    expect(screen.getByLabelText(/Harga jual ecer per kg/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Harga beli per dus \(dari distributor\)/)).toBeInTheDocument();
    expect(screen.getByText(/1 dus \(20 kg\) = Rp 360\.000 jual/)).toBeInTheDocument();
  });

  it('hides price fields on step 1 for VARIANT parent and shows variant table on satuan step', () => {
    const form = {
      ...createEmptyWizardForm(),
      sku: 'CAT-PARENT',
      name: 'Cat Tembok Interior',
      productType: ProductType.VARIANT,
      hasVariants: true,
      price: '0',
      unitId: 'u-liter',
      variantDrafts: [
        {
          id: 'vd-1',
          variantLabel: '5 Liter',
          sku: 'CAT-5L',
          price: '85000',
          costPrice: '',
          stockQty: '',
        },
      ],
    };
    const literUnits = [
      { id: 'u-liter', name: 'Liter', symbol: 'liter' },
      ...units,
    ];
    render(
      <ProductFormWizard
        form={form}
        onChange={vi.fn()}
        units={literUnits}
        categories={[{ id: 'c-cat', name: 'Cat' }, ...categories]}
        mode="create"
        onSubmit={vi.fn()}
        submitLabel="Tambah"
      />,
    );

    expect(screen.queryByLabelText(/Harga jual per/)).not.toBeInTheDocument();
    expect(screen.getByText(/harga per ukuran/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('3. Satuan'));
    expect(screen.getByText(/Daftar varian \(ukuran & harga\)/)).toBeInTheDocument();
    expect(screen.getByLabelText('Ukuran varian 1')).toHaveValue('5 Liter');
    expect(screen.getByLabelText('Harga jual varian 1')).toBeInTheDocument();
  });

  it('hides price fields on step 1 for MULTI_UNIT type', () => {
    const form = {
      ...createEmptyWizardForm(),
      productType: ProductType.MULTI_UNIT,
    };
    render(
      <ProductFormWizard
        form={form}
        onChange={vi.fn()}
        units={units}
        categories={categories}
        mode="create"
        onSubmit={vi.fn()}
        submitLabel="Tambah"
      />,
    );

    expect(screen.queryByLabelText(/Harga jual per/)).not.toBeInTheDocument();
    expect(screen.getByText(/Harga jual & beli diatur di langkah/)).toBeInTheDocument();
  });

  it('switches to unit step fields for MULTI_UNIT type', () => {
    const form = {
      ...createEmptyWizardForm(),
      sku: 'PAK-001',
      name: 'Paku',
      price: '18000',
      productType: ProductType.MULTI_UNIT,
      unitId: 'u-kg',
      unitConversions: [
        {
          unitId: 'u-dus',
          conversionToBase: 20,
          isPurchaseUnit: true,
          isSellUnit: true,
        },
      ],
    };
    const units = [
      { id: 'u-kg', name: 'Kilogram', symbol: 'kg' },
      { id: 'u-dus', name: 'Dus', symbol: 'dus' },
    ];
    render(
      <ProductFormWizard
        form={form}
        onChange={vi.fn()}
        units={units}
        categories={categories}
        mode="create"
        onSubmit={vi.fn()}
        submitLabel="Tambah"
      />,
    );

    fireEvent.click(screen.getByText('3. Satuan'));
    expect(screen.getByText(/Stok dihitung dalam/)).toBeInTheDocument();
    expect(screen.getByText('Satuan beli ke supplier')).toBeInTheDocument();
    expect(screen.getByLabelText(/Min\. jual ecer/)).toBeInTheDocument();
  });

  it('disables submit on preview when form invalid', () => {
    render(
      <ProductFormWizard
        form={createEmptyWizardForm()}
        onChange={vi.fn()}
        units={units}
        categories={categories}
        mode="create"
        onSubmit={vi.fn()}
        submitLabel="Simpan produk"
      />,
    );

    fireEvent.click(screen.getByText('4. Pratinjau'));
    expect(screen.getByRole('button', { name: 'Simpan produk' })).toBeDisabled();
  });

  it('preserves step 1 fields when navigating next and back', () => {
    render(<WizardHarness units={units} categories={categories} />);

    fillBasicInfo();
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(screen.getByText('Sederhana')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    expect(screen.getByLabelText('SKU')).toHaveValue('TST-001');
    expect(screen.getByLabelText('Nama produk')).toHaveValue('Semen Test');
    expect(screen.getByLabelText(/Harga jual/)).toHaveValue('75.000');
  });

  it('preserves fields across all wizard steps including product type and unit', () => {
    render(<WizardHarness units={units} categories={categories} />);

    fillBasicInfo();
    fireEvent.change(screen.getByDisplayValue('Tanpa kategori'), { target: { value: 'c-1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('radio', { name: /Multi-satuan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    expect(screen.getByDisplayValue('Kilogram (kg)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    expect(screen.getByText(/Semen Test/)).toBeInTheDocument();
    expect(screen.getByText(/TST-001/)).toBeInTheDocument();
    expect(screen.getByText(/Multi-satuan/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    expect(screen.getByDisplayValue('Kilogram (kg)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    expect(screen.getByRole('radio', { name: /Multi-satuan/ })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    expect(screen.getByLabelText('SKU')).toHaveValue('TST-001');
    expect(screen.getByLabelText('Nama produk')).toHaveValue('Semen Test');
    expect(screen.getByDisplayValue('Semen & Mortar')).toBeInTheDocument();
  });

  it('refreshes multi-unit purchase conversion when category changes (AUD-WIZ-01)', () => {
    const multiCategories = [
      { id: 'c-besi', name: 'Besi & Baja' },
      { id: 'c-atap', name: 'Atap & Seng' },
    ];
    const extendedUnits = [
      { id: 'u-kg', name: 'Kilogram', symbol: 'kg' },
      { id: 'u-dus', name: 'Dus', symbol: 'dus' },
      { id: 'u-roll', name: 'Roll', symbol: 'roll' },
      { id: 'u-m', name: 'Meter', symbol: 'm' },
    ];

    render(<WizardHarness units={extendedUnits} categories={multiCategories} />);

    fillBasicInfo();
    fireEvent.change(screen.getByDisplayValue('Tanpa kategori'), { target: { value: 'c-besi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('radio', { name: /Multi-satuan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    expect(screen.getByDisplayValue('Kilogram (kg)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(screen.getByText(/Beli: 10 dus/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    fireEvent.change(screen.getByDisplayValue('Besi & Baja'), { target: { value: 'c-atap' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    expect(screen.getByText(/Satuan stok:.*Meter \(m\)/)).toBeInTheDocument();
    expect(screen.getByText(/Beli: 10 roll → \+500 m stok/)).toBeInTheDocument();
  });

  it('preserves fields when category auto-suggests unit after units load', () => {
    function AsyncUnitsHarness() {
      const [form, setForm] = useState(createEmptyWizardForm());
      const [loadedUnits, setLoadedUnits] = useState<typeof units>([]);

      return (
        <>
          <button type="button" onClick={() => setLoadedUnits(units)}>
            Muat satuan
          </button>
          <ProductFormWizard
            form={form}
            onChange={setForm}
            units={loadedUnits}
            categories={categories}
            mode="create"
            onSubmit={vi.fn()}
            submitLabel="Tambah produk"
          />
        </>
      );
    }

    render(<AsyncUnitsHarness />);

    fillBasicInfo();
    fireEvent.change(screen.getByDisplayValue('Tanpa kategori'), { target: { value: 'c-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Muat satuan' }));

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));

    expect(screen.getByLabelText('SKU')).toHaveValue('TST-001');
    expect(screen.getByLabelText('Nama produk')).toHaveValue('Semen Test');
    expect(screen.getByLabelText(/Harga jual/)).toHaveValue('75.000');
  });

  it('auto-generates SKU on create and updates when name or category changes', () => {
    render(<WizardHarness units={units} categories={categories} />);

    const skuInput = screen.getByLabelText('SKU') as HTMLInputElement;
    expect(skuInput.value.length).toBeGreaterThan(0);
    expect(screen.getByText('Otomatis')).toBeInTheDocument();
    expect(screen.getByText('SKU dibuat otomatis, bisa diubah manual')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nama produk'), { target: { value: 'Semen Test' } });
    expect(skuInput.value.toUpperCase()).toMatch(/SEMEN/);

    fireEvent.change(screen.getByDisplayValue('Tanpa kategori'), { target: { value: 'c-1' } });
    expect(skuInput.value.toUpperCase()).toMatch(/^SM-/);

    fireEvent.change(skuInput, { target: { value: 'MANUAL-SKU' } });
    fireEvent.change(screen.getByLabelText('Nama produk'), { target: { value: 'Nama Baru' } });
    expect(skuInput.value).toBe('MANUAL-SKU');
  });

  it('keeps auto-generated SKU stable across wizard step navigation', () => {
    render(<WizardHarness units={units} categories={categories} />);

    const skuInput = screen.getByLabelText('SKU') as HTMLInputElement;

    fireEvent.change(screen.getByLabelText('Nama produk'), { target: { value: 'Semen Test' } });
    fireEvent.change(screen.getByLabelText(/Harga jual/), { target: { value: '75000' } });
    const skuAfterInput = skuInput.value;

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));

    expect(skuInput.value).toBe(skuAfterInput);
  });

  it('keeps auto-generated SKU stable when units load asynchronously', () => {
    function AsyncUnitsHarness() {
      const [form, setForm] = useState(createEmptyWizardForm());
      const [loadedUnits, setLoadedUnits] = useState<typeof units>([]);

      return (
        <>
          <button type="button" onClick={() => setLoadedUnits(units)}>
            Muat satuan
          </button>
          <ProductFormWizard
            form={form}
            onChange={setForm}
            units={loadedUnits}
            categories={categories}
            mode="create"
            onSubmit={vi.fn()}
            submitLabel="Tambah produk"
          />
        </>
      );
    }

    render(<AsyncUnitsHarness />);

    const skuInput = screen.getByLabelText('SKU') as HTMLInputElement;

    fireEvent.change(screen.getByLabelText('Nama produk'), { target: { value: 'Semen Test' } });
    fireEvent.change(screen.getByDisplayValue('Tanpa kategori'), { target: { value: 'c-1' } });
    const skuAfterInput = skuInput.value;
    fireEvent.click(screen.getByRole('button', { name: 'Muat satuan' }));

    expect(skuInput.value).toBe(skuAfterInput);
  });

  it('regenerate SKU button produces new value', () => {
    render(<WizardHarness units={units} categories={categories} />);
    const skuInput = screen.getByLabelText('SKU') as HTMLInputElement;
    const first = skuInput.value;
    fireEvent.click(screen.getByRole('button', { name: 'Generate ulang' }));
    expect(skuInput.value).not.toBe(first);
  });

  it('does not loop onChange on initial mount (empty create form)', async () => {
    const onChange = vi.fn();
    render(
      <ProductFormWizard
        form={createEmptyWizardForm()}
        onChange={onChange}
        units={units}
        categories={categories}
        mode="create"
        onSubmit={vi.fn()}
        submitLabel="Tambah produk"
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onChange.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('keeps auto-generated SKU stable after mount without user input', async () => {
    render(<WizardHarness units={units} categories={categories} />);
    const skuInput = screen.getByLabelText('SKU') as HTMLInputElement;
    const initialSku = skuInput.value;
    expect(initialSku.length).toBeGreaterThan(0);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(skuInput.value).toBe(initialSku);
  });

  it('preserves edit mode values when navigating steps', () => {
    render(
      <WizardHarness
        units={units}
        categories={categories}
        mode="edit"
        initialForm={{
          ...createEmptyWizardForm(),
          sku: 'EDIT-001',
          name: 'Produk Edit',
          price: '99000',
          unitId: 'u-kg',
          categoryId: 'c-1',
          productType: ProductType.MULTI_UNIT,
          moq: '0.5',
          orderStep: '0.5',
        }}
      />,
    );

    fireEvent.click(screen.getByText('1. Info dasar'));
    expect(screen.getByLabelText('SKU')).toHaveValue('EDIT-001');

    fireEvent.click(screen.getByText('3. Satuan'));
    expect(screen.getByDisplayValue('Kilogram (kg)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Harga jual ecer per kg/)).toHaveValue('99.000');

    fireEvent.click(screen.getByText('4. Pratinjau'));
    expect(screen.getByText(/Produk Edit/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('3. Satuan'));
    expect(screen.getByLabelText(/Harga jual ecer per kg/)).toHaveValue('99.000');
  });

  it('does not call onSubmit when navigating wizard steps', () => {
    const onSubmit = vi.fn();
    render(
      <WizardHarness units={units} categories={categories} onSubmit={onSubmit} />,
    );

    fillBasicInfo();
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    fireEvent.click(screen.getByText('4. Pratinjau'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit on implicit form submit before preview step', () => {
    const onSubmit = vi.fn();
    render(
      <ProductFormWizard
        form={createEmptyWizardForm()}
        onChange={vi.fn()}
        units={units}
        categories={categories}
        mode="create"
        onSubmit={onSubmit}
        submitLabel="Tambah produk"
      />,
    );

    fillBasicInfo();
    const form = screen.getByLabelText('Nama produk').closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit only when Simpan is clicked on preview step with valid form', () => {
    const onSubmit = vi.fn();
    const validForm = {
      ...createEmptyWizardForm(),
      sku: 'TST-001',
      name: 'Semen Test',
      price: '75000',
      unitId: 'u-kg',
      productType: ProductType.SIMPLE,
    };
    render(
      <ProductFormWizard
        form={validForm}
        onChange={vi.fn()}
        units={units}
        categories={categories}
        mode="create"
        onSubmit={onSubmit}
        submitLabel="Tambah produk"
      />,
    );

    fireEvent.click(screen.getByText('4. Pratinjau'));
    fireEvent.click(screen.getByRole('button', { name: 'Tambah produk' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
