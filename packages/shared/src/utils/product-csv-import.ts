export const PRODUCT_CSV_TEMPLATE_HEADERS = [
  'sku',
  'name',
  'price',
  'category',
  'unit',
  'stock',
] as const;

export type ProductCsvHeader = (typeof PRODUCT_CSV_TEMPLATE_HEADERS)[number];

export interface ProductCsvRow {
  rowNumber: number;
  sku: string;
  name: string;
  price: number;
  category: string;
  unit: string;
  stock?: number;
}

export interface ProductCsvRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ProductCsvParseResult {
  rows: ProductCsvRow[];
  errors: ProductCsvRowError[];
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function buildProductCsvTemplate(): string {
  return `${PRODUCT_CSV_TEMPLATE_HEADERS.join(',')}\nSKU-001,Semen 40kg,65000,Bahan Bangunan,sak,100\n`;
}

export function parseProductCsv(content: string): ProductCsvParseResult {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, field: 'file', message: 'File CSV kosong.' }],
    };
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const required = ['sku', 'name', 'price', 'category', 'unit'];
  const missing = required.filter((col) => !headerCells.includes(col));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          field: 'header',
          message: `Kolom wajib hilang: ${missing.join(', ')}. Gunakan template: ${PRODUCT_CSV_TEMPLATE_HEADERS.join(', ')}`,
        },
      ],
    };
  }

  const indexOf = (col: string) => headerCells.indexOf(col);
  const rows: ProductCsvRow[] = [];
  const errors: ProductCsvRowError[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const cells = parseCsvLine(lines[i]);
    const get = (col: string) => cells[indexOf(col)]?.trim() ?? '';

    const sku = get('sku');
    const name = get('name');
    const priceRaw = get('price');
    const category = get('category');
    const unit = get('unit');
    const stockRaw = headerCells.includes('stock') ? get('stock') : '';

    if (!sku) errors.push({ rowNumber, field: 'sku', message: 'SKU wajib diisi.' });
    if (!name) errors.push({ rowNumber, field: 'name', message: 'Nama wajib diisi.' });
    if (!category) errors.push({ rowNumber, field: 'category', message: 'Kategori wajib diisi.' });
    if (!unit) errors.push({ rowNumber, field: 'unit', message: 'Satuan wajib diisi.' });

    const priceDigits = priceRaw ? priceRaw.replace(/[^\d.-]/g, '') : '';
    const price = priceDigits ? Number(priceDigits) : NaN;
    if (!priceRaw) {
      errors.push({ rowNumber, field: 'price', message: 'Harga wajib diisi.' });
    } else if (!priceDigits || !Number.isFinite(price) || price < 0 || !Number.isInteger(price)) {
      errors.push({ rowNumber, field: 'price', message: 'Harga harus integer rupiah ≥ 0.' });
    }

    let stock: number | undefined;
    if (stockRaw) {
      const parsedStock = Number(stockRaw.replace(',', '.'));
      if (!Number.isFinite(parsedStock) || parsedStock < 0) {
        errors.push({ rowNumber, field: 'stock', message: 'Stok harus angka ≥ 0.' });
      } else {
        stock = parsedStock;
      }
    }

    if (sku && name && category && unit && priceRaw && priceDigits && Number.isFinite(price) && price >= 0 && Number.isInteger(price)) {
      rows.push({ rowNumber, sku, name, price, category, unit, stock });
    }
  }

  return { rows, errors };
}
