import { apiConfig } from './api';
import { authFetch } from './auth';

export interface CartMarginWarning {
  productId: string;
  productName: string;
  message: string;
}

export interface CartStockIssue {
  productId: string;
  productName: string;
  message: string;
}

export interface CartValidationResult {
  marginWarnings: CartMarginWarning[];
  stockIssues: CartStockIssue[];
  hasInsufficientStock: boolean;
}

export async function fetchCartValidation(
  items: Array<{ productId: string; quantity: number; sellUnitId?: string }>,
  outletId?: string,
): Promise<CartValidationResult> {
  if (items.length === 0) {
    return { marginWarnings: [], stockIssues: [], hasInsufficientStock: false };
  }

  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/validate-cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(outletId ? { outletId } : {}),
      items,
    }),
  });
  const json = (await res.json()) as {
    success: boolean;
    data?: {
      marginWarnings?: CartMarginWarning[];
      stockIssues?: CartStockIssue[];
      hasInsufficientStock?: boolean;
    };
  };
  if (!res.ok || !json.success || !json.data) {
    return { marginWarnings: [], stockIssues: [], hasInsufficientStock: false };
  }
  const stockIssues = json.data.stockIssues ?? [];
  return {
    marginWarnings: json.data.marginWarnings ?? [],
    stockIssues,
    hasInsufficientStock: json.data.hasInsufficientStock ?? stockIssues.length > 0,
  };
}

export async function fetchCartMarginWarnings(
  items: Array<{ productId: string; quantity: number; sellUnitId?: string }>,
  outletId?: string,
): Promise<CartMarginWarning[]> {
  const result = await fetchCartValidation(items, outletId);
  return result.marginWarnings;
}
