import { API_ROUTE_PREFIX, DEFAULT_API_PORT, ErrorCodes } from '@barokah/shared';

import type { ApiErrorResponse, ApiSuccessResponse } from '@barokah/shared';



const API_HOST = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${DEFAULT_API_PORT}`;



export const apiConfig = {

  baseUrl: API_HOST,

  prefix: API_ROUTE_PREFIX,

  healthUrl: `${API_HOST}/${API_ROUTE_PREFIX}/health`,

} as const;



export const NETWORK_ERROR_MESSAGE =

  'Tidak dapat terhubung ke server. Pastikan API berjalan.';



export const OFFLINE_ERROR_MESSAGE =

  'Koneksi jaringan bermasalah. Periksa internet lalu coba lagi.';



export const RATE_LIMIT_ERROR_MESSAGE =

  'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';



export type ApiEnvelope<T> = ApiSuccessResponse<T> | ApiErrorResponse;



const RAW_NETWORK_PATTERNS = [

  /^failed to fetch$/i,

  /^networkerror/i,

  /^load failed$/i,

  /^network request failed$/i,

];



export function isNetworkError(err: unknown): boolean {

  if (err instanceof TypeError) {

    const msg = err.message.toLowerCase();

    return msg.includes('fetch') || msg.includes('network') || msg.includes('load failed');

  }

  if (err instanceof Error) {

    return RAW_NETWORK_PATTERNS.some((pattern) => pattern.test(err.message.trim()));

  }

  return false;

}



export function isOffline(): boolean {

  return typeof navigator !== 'undefined' && !navigator.onLine;

}



/** Map thrown errors to user-facing Bahasa Indonesia messages. */

export function toUserFacingError(err: unknown, fallback: string): string {

  if (isOffline()) {

    return OFFLINE_ERROR_MESSAGE;

  }

  if (err instanceof ApiRequestError) {

    if (err.status === 429 || err.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {

      return err.message || RATE_LIMIT_ERROR_MESSAGE;

    }

    return err.message;

  }

  if (isNetworkError(err)) {

    return NETWORK_ERROR_MESSAGE;

  }

  if (err instanceof Error && err.message.trim()) {

    const msg = err.message.trim();

    if (RAW_NETWORK_PATTERNS.some((pattern) => pattern.test(msg))) {

      return NETWORK_ERROR_MESSAGE;

    }

    return msg;

  }

  return fallback;

}



export async function readApiEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {

  try {

    return (await res.json()) as ApiEnvelope<T>;

  } catch {

    throw new Error('Respons server tidak valid.');

  }

}



export function assertApiSuccess<T>(

  res: Response,

  json: ApiEnvelope<T>,

  fallback: string,

): T {

  if (!res.ok || !json.success) {

    const message = json.success === false ? json.error?.message : undefined;

    throw new Error(message ?? fallback);

  }

  if (json.data === undefined) {

    throw new Error(fallback);

  }

  return json.data;

}



export class ApiRequestError extends Error {

  readonly code?: string;

  readonly status?: number;



  constructor(message: string, code?: string, status?: number) {

    super(message);

    this.name = 'ApiRequestError';

    this.code = code;

    this.status = status;

  }

}



function throwApiRequestError(message: string, code?: string, status?: number): never {

  throw new ApiRequestError(message, code, status);

}



export function mapHttpStatusToUserMessage(

  status: number,

  envelopeMessage?: string,

  fallback = 'Permintaan gagal.',

): { message: string; code?: string } {

  if (status === 429) {

    return {

      message: envelopeMessage ?? RATE_LIMIT_ERROR_MESSAGE,

      code: ErrorCodes.RATE_LIMIT_EXCEEDED,

    };

  }

  return { message: envelopeMessage ?? fallback };

}



export async function wrapApiCall<T>(

  call: () => Promise<T>,

  fallback: string,

): Promise<T> {

  try {

    return await call();

  } catch (err) {

    if (err instanceof ApiRequestError) {

      throw err;

    }

    throwApiRequestError(toUserFacingError(err, fallback));

  }

}


