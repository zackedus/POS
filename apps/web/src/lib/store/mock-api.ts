import { MOCK_CATEGORIES, MOCK_OUTLETS, MOCK_PRODUCTS, MOCK_TENANT_NAME } from './mock-data';
import { calculateOrderTotals, calculateSubtotal } from './pricing';
import type { CartLine, CheckoutCustomer, MockOrder, StockStatus, StoreProduct } from './types';

const PAYMENT_TTL_MS = 60 * 60 * 1000;

function padSequence(n: number): string {
  return String(n).padStart(4, '0');
}

function formatOrderNo(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = padSequence(Math.floor(Math.random() * 9999) + 1);
  return `WEB-${y}${m}${d}-${seq}`;
}

export function getTenantDisplayName(_slug: string): string {
  return MOCK_TENANT_NAME;
}

export function getOutlets(_slug: string) {
  return MOCK_OUTLETS;
}

export function getCategories(_slug: string) {
  return MOCK_CATEGORIES;
}

export function getProducts(
  _slug: string,
  opts: { outletId: string; categoryId?: string; q?: string },
): StoreProduct[] {
  let items = [...MOCK_PRODUCTS];
  if (opts.categoryId && opts.categoryId !== 'all') {
    items = items.filter((p) => p.categoryId === opts.categoryId);
  }
  if (opts.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    items = items.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }
  return items;
}

export function getProduct(_slug: string, productId: string): StoreProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.id === productId);
}

export function getStockStatus(product: StoreProduct, outletId: string): StockStatus {
  const qty = product.stockByOutlet[outletId] ?? 0;
  return qty > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK';
}

export function getStockQty(product: StoreProduct, outletId: string): number {
  return product.stockByOutlet[outletId] ?? 0;
}

export function validateCartStock(
  lines: CartLine[],
  outletId: string,
): Array<{ productId: string; name: string; requested: number; available: number }> {
  const issues: Array<{ productId: string; name: string; requested: number; available: number }> = [];
  for (const line of lines) {
    const product = MOCK_PRODUCTS.find((p) => p.id === line.productId);
    if (!product) continue;
    const available = getStockQty(product, outletId);
    if (line.quantity > available) {
      issues.push({
        productId: line.productId,
        name: line.name,
        requested: line.quantity,
        available,
      });
    }
  }
  return issues;
}

export async function createMockOrder(input: {
  slug: string;
  outletId: string;
  customer: CheckoutCustomer;
  items: CartLine[];
  clientRequestId: string;
}): Promise<MockOrder> {
  const outlet = MOCK_OUTLETS.find((o) => o.id === input.outletId);
  if (!outlet) {
    throw new Error('Outlet tidak ditemukan.');
  }

  const stockIssues = validateCartStock(input.items, input.outletId);
  if (stockIssues.length > 0) {
    throw new Error('INSUFFICIENT_STOCK');
  }

  const subtotal = calculateSubtotal(input.items);
  const { tax, total } = calculateOrderTotals(subtotal);
  const orderNo = formatOrderNo();
  const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS).toISOString();

  return {
    id: `order-${input.clientRequestId}`,
    orderNo,
    status: 'PENDING_PAYMENT',
    outlet,
    customer: input.customer,
    items: input.items,
    subtotal,
    tax,
    total,
    expiresAt,
    payment: {
      snapToken: `mock-snap-${orderNo}`,
      redirectUrl: `/store/${input.slug}/order/${orderNo}/success?mockPaid=1`,
    },
  };
}
