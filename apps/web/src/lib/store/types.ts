export type StockStatus = 'AVAILABLE' | 'OUT_OF_STOCK';

export interface StoreOutlet {
  id: string;
  name: string;
  code: string;
  address: string;
  pickupHoursLabel?: string;
}

export interface StoreCategory {
  id: string;
  name: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  sku: string;
  unitSymbol: string;
  price: number;
  imageUrl: string | null;
  placeholderKey: string;
  categoryId: string;
  description: string;
  stockByOutlet: Record<string, number>;
  stockStatus?: 'AVAILABLE' | 'OUT_OF_STOCK';
  moq: number;
  orderStep: number;
}

export interface CartLine {
  productId: string;
  name: string;
  sku: string;
  unitSymbol: string;
  price: number;
  quantity: number;
}

export interface CheckoutCustomer {
  name: string;
  phone: string;
  notes?: string;
}

export interface MockOrder {
  id: string;
  orderNo: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
  outlet: StoreOutlet;
  customer: CheckoutCustomer;
  items: CartLine[];
  subtotal: number;
  tax: number;
  total: number;
  expiresAt: string;
  payment: {
    snapToken: string;
    redirectUrl: string;
  };
}
