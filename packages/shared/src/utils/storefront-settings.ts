import type {
  StorefrontSettings,
  StorefrontSortOption,
} from '../types/storefront-settings';

export const STOREFRONT_ACCENT_DEFAULT = '#2563eb';

export function defaultStorefrontSettings(tenantName = 'Toko Kami'): StorefrontSettings {
  return {
    enabled: true,
    appearance: {
      heroTitle: tenantName,
      heroSubtitle: 'Material bangunan berkualitas — pesan online, ambil di cabang terdekat.',
      heroImageUrl: null,
      accentColor: STOREFRONT_ACCENT_DEFAULT,
      tagline: 'Belanja material proyek lebih mudah',
      footerText: `© ${new Date().getFullYear()} ${tenantName}. Semua harga dapat berubah sewaktu-waktu.`,
      promoBannerText: null,
    },
    catalog: {
      featuredCategoryIds: [],
      defaultSort: 'name_asc',
      showOutOfStock: true,
    },
    branches: {
      enabledOutletIds: [],
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryRadiusKm: null,
      deliveryNotes: '',
    },
    checkout: {
      minOrderAmount: 0,
      paymentInstructions: 'Setelah checkout, Anda akan diarahkan ke halaman pembayaran Midtrans.',
      requireName: true,
      requirePhone: true,
      requireAddress: true,
      requireCustomerLogin: true,
    },
    payment: {
      manualTransferEnabled: false,
      onlinePaymentEnabled: true,
      codEnabled: true,
    },
    seo: {
      metaTitle: tenantName,
      metaDescription: `Belanja material bangunan online di ${tenantName}. Pickup di cabang atau antar ke alamat.`,
    },
    operations: {
      onlineOrderHoursStart: '00:00',
      onlineOrderHoursEnd: '23:59',
      closedMessage: 'Toko online sedang tutup. Silakan hubungi kami via WhatsApp.',
      temporarilyClosed: false,
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const SORT_OPTIONS: StorefrontSortOption[] = ['name_asc', 'name_desc', 'price_asc', 'price_desc'];

export function mergeStorefrontSettings(
  patch: unknown,
  tenantName = 'Toko Kami',
): StorefrontSettings {
  const defaults = defaultStorefrontSettings(tenantName);
  if (!isPlainObject(patch)) return defaults;

  const appearancePatch = isPlainObject(patch.appearance) ? patch.appearance : {};
  const catalogPatch = isPlainObject(patch.catalog) ? patch.catalog : {};
  const branchesPatch = isPlainObject(patch.branches) ? patch.branches : {};
  const checkoutPatch = isPlainObject(patch.checkout) ? patch.checkout : {};
  const paymentPatch = isPlainObject(patch.payment) ? patch.payment : {};
  const seoPatch = isPlainObject(patch.seo) ? patch.seo : {};
  const operationsPatch = isPlainObject(patch.operations) ? patch.operations : {};

  const defaultSort = SORT_OPTIONS.includes(catalogPatch.defaultSort as StorefrontSortOption)
    ? (catalogPatch.defaultSort as StorefrontSortOption)
    : defaults.catalog.defaultSort;

  return {
    enabled: typeof patch.enabled === 'boolean' ? patch.enabled : defaults.enabled,
    appearance: {
      ...defaults.appearance,
      ...(appearancePatch.heroTitle !== undefined ? { heroTitle: String(appearancePatch.heroTitle) } : {}),
      ...(appearancePatch.heroSubtitle !== undefined ? { heroSubtitle: String(appearancePatch.heroSubtitle) } : {}),
      ...(appearancePatch.heroImageUrl !== undefined
        ? { heroImageUrl: appearancePatch.heroImageUrl === null ? null : String(appearancePatch.heroImageUrl) }
        : {}),
      ...(appearancePatch.accentColor !== undefined ? { accentColor: String(appearancePatch.accentColor) } : {}),
      ...(appearancePatch.tagline !== undefined ? { tagline: String(appearancePatch.tagline) } : {}),
      ...(appearancePatch.footerText !== undefined ? { footerText: String(appearancePatch.footerText) } : {}),
      ...(appearancePatch.promoBannerText !== undefined
        ? { promoBannerText: appearancePatch.promoBannerText === null ? null : String(appearancePatch.promoBannerText) }
        : {}),
    },
    catalog: {
      ...defaults.catalog,
      featuredCategoryIds: Array.isArray(catalogPatch.featuredCategoryIds)
        ? catalogPatch.featuredCategoryIds.filter((id): id is string => typeof id === 'string')
        : defaults.catalog.featuredCategoryIds,
      defaultSort,
      ...(typeof catalogPatch.showOutOfStock === 'boolean'
        ? { showOutOfStock: catalogPatch.showOutOfStock }
        : {}),
    },
    branches: {
      ...defaults.branches,
      enabledOutletIds: Array.isArray(branchesPatch.enabledOutletIds)
        ? branchesPatch.enabledOutletIds.filter((id): id is string => typeof id === 'string')
        : defaults.branches.enabledOutletIds,
      ...(typeof branchesPatch.pickupEnabled === 'boolean'
        ? { pickupEnabled: branchesPatch.pickupEnabled }
        : {}),
      ...(typeof branchesPatch.deliveryEnabled === 'boolean'
        ? { deliveryEnabled: branchesPatch.deliveryEnabled }
        : {}),
      deliveryRadiusKm:
        branchesPatch.deliveryRadiusKm === null
          ? null
          : typeof branchesPatch.deliveryRadiusKm === 'number'
            ? branchesPatch.deliveryRadiusKm
            : defaults.branches.deliveryRadiusKm,
      ...(branchesPatch.deliveryNotes !== undefined
        ? { deliveryNotes: String(branchesPatch.deliveryNotes) }
        : {}),
    },
    checkout: {
      ...defaults.checkout,
      ...(typeof checkoutPatch.minOrderAmount === 'number'
        ? { minOrderAmount: checkoutPatch.minOrderAmount }
        : {}),
      ...(checkoutPatch.paymentInstructions !== undefined
        ? { paymentInstructions: String(checkoutPatch.paymentInstructions) }
        : {}),
      ...(typeof checkoutPatch.requireName === 'boolean'
        ? { requireName: checkoutPatch.requireName }
        : {}),
      ...(typeof checkoutPatch.requirePhone === 'boolean'
        ? { requirePhone: checkoutPatch.requirePhone }
        : {}),
      ...(typeof checkoutPatch.requireAddress === 'boolean'
        ? { requireAddress: checkoutPatch.requireAddress }
        : {}),
      ...(typeof checkoutPatch.requireCustomerLogin === 'boolean'
        ? { requireCustomerLogin: checkoutPatch.requireCustomerLogin }
        : {}),
    },
    payment: {
      ...defaults.payment,
      ...(typeof paymentPatch.manualTransferEnabled === 'boolean'
        ? { manualTransferEnabled: paymentPatch.manualTransferEnabled }
        : {}),
      ...(typeof paymentPatch.onlinePaymentEnabled === 'boolean'
        ? { onlinePaymentEnabled: paymentPatch.onlinePaymentEnabled }
        : {}),
      ...(typeof paymentPatch.codEnabled === 'boolean' ? { codEnabled: paymentPatch.codEnabled } : {}),
    },
    seo: {
      ...defaults.seo,
      ...(seoPatch.metaTitle !== undefined ? { metaTitle: String(seoPatch.metaTitle) } : {}),
      ...(seoPatch.metaDescription !== undefined
        ? { metaDescription: String(seoPatch.metaDescription) }
        : {}),
    },
    operations: {
      ...defaults.operations,
      ...(operationsPatch.onlineOrderHoursStart !== undefined
        ? { onlineOrderHoursStart: String(operationsPatch.onlineOrderHoursStart) }
        : {}),
      ...(operationsPatch.onlineOrderHoursEnd !== undefined
        ? { onlineOrderHoursEnd: String(operationsPatch.onlineOrderHoursEnd) }
        : {}),
      ...(operationsPatch.closedMessage !== undefined
        ? { closedMessage: String(operationsPatch.closedMessage) }
        : {}),
      ...(typeof operationsPatch.temporarilyClosed === 'boolean'
        ? { temporarilyClosed: operationsPatch.temporarilyClosed }
        : {}),
    },
  };
}

export function isMidtransSandboxKey(serverKey: string | null | undefined): boolean {
  const key = serverKey?.trim() ?? '';
  return key.startsWith('SB-') || key.startsWith('SB-Mid');
}

export interface StorefrontPaymentValidation {
  errors: string[];
  warnings: string[];
}

export function validateStorefrontPaymentSettings(
  settings: StorefrontSettings,
  midtransConfigured: boolean,
): StorefrontPaymentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const hasFulfillment = settings.branches.pickupEnabled || settings.branches.deliveryEnabled;

  if ((settings.payment.onlinePaymentEnabled || settings.payment.codEnabled) && !hasFulfillment) {
    errors.push('Aktifkan minimal satu metode pengambilan (pickup atau delivery) sebelum mengaktifkan pembayaran.');
  }

  if (settings.payment.codEnabled && !settings.branches.deliveryEnabled) {
    errors.push('COD hanya tersedia jika pengiriman ke alamat aktif.');
  }

  if (settings.payment.onlinePaymentEnabled && !midtransConfigured) {
    warnings.push('Pembayaran online aktif tanpa kunci Midtrans — checkout akan fallback mode mock.');
  }

  if (!settings.payment.onlinePaymentEnabled && !settings.payment.codEnabled) {
    warnings.push('Semua metode pembayaran webstore dinonaktifkan — pelanggan tidak bisa checkout.');
  }

  return { errors, warnings };
}

export function isWithinOnlineOrderHours(
  settings: StorefrontSettings,
  now = new Date(),
): boolean {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const currentMinutes = hour * 60 + minute;

  const [startH, startM] = settings.operations.onlineOrderHoursStart.split(':').map(Number);
  const [endH, endM] = settings.operations.onlineOrderHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
