export type StorefrontSortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';

export interface StorefrontAppearanceSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  accentColor: string;
  tagline: string;
  footerText: string;
  promoBannerText: string | null;
}

export interface StorefrontCatalogSettings {
  featuredCategoryIds: string[];
  defaultSort: StorefrontSortOption;
  showOutOfStock: boolean;
}

export interface StorefrontBranchesSettings {
  enabledOutletIds: string[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryRadiusKm: number | null;
  deliveryNotes: string;
}

export interface StorefrontCheckoutSettings {
  minOrderAmount: number;
  paymentInstructions: string;
  requireName: boolean;
  requirePhone: boolean;
  requireAddress: boolean;
  /** When true, guest must register/login before checkout (default ON). */
  requireCustomerLogin: boolean;
}

export interface StorefrontPaymentSettings {
  manualTransferEnabled: boolean;
  onlinePaymentEnabled: boolean;
  /** COD with 20% deposit — delivery orders only. */
  codEnabled: boolean;
}

export interface StorefrontSeoSettings {
  metaTitle: string;
  metaDescription: string;
}

export interface StorefrontOperationsSettings {
  onlineOrderHoursStart: string;
  onlineOrderHoursEnd: string;
  closedMessage: string;
  temporarilyClosed: boolean;
}

export interface StorefrontSettings {
  enabled: boolean;
  appearance: StorefrontAppearanceSettings;
  catalog: StorefrontCatalogSettings;
  branches: StorefrontBranchesSettings;
  checkout: StorefrontCheckoutSettings;
  payment: StorefrontPaymentSettings;
  seo: StorefrontSeoSettings;
  operations: StorefrontOperationsSettings;
}

export interface StorefrontPublicConfig {
  tenant: {
    name: string;
    slug: string;
    description: string;
    contactPhone: string | null;
    whatsapp: string | null;
    logoUrl: string | null;
  };
  settings: StorefrontSettings;
  storefrontUrl: string;
  midtransMode: 'mock' | 'sandbox' | 'live';
  featuredCategories: Array<{ id: string; name: string }>;
}
