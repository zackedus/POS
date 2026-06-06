import { apiConfig } from './api';
import { authFetch } from './auth';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface ProductImageUploadResult {
  url: string;
  filename: string;
}

export function resolveProductImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    return null;
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  if (imageUrl.startsWith('/')) {
    return `${apiConfig.baseUrl}${imageUrl}`;
  }
  return imageUrl;
}

export async function uploadProductImage(file: File): Promise<ProductImageUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/uploads/product-image`, {
    method: 'POST',
    body: formData,
  });

  const json = (await res.json()) as ApiEnvelope<ProductImageUploadResult>;

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal mengunggah gambar produk.');
  }

  return json.data;
}
