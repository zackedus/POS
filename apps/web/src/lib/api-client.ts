import {
  ApiRequestError,
  assertApiSuccess,
  mapHttpStatusToUserMessage,
  readApiEnvelope,
  toUserFacingError,
  wrapApiCall,
} from './api';
import { authFetch } from './auth';

export async function authApiJson<T>(
  url: string,
  init?: RequestInit,
  fallback = 'Permintaan gagal.',
): Promise<T> {
  return wrapApiCall(async () => {
    const res = await authFetch(url, init);
    const json = await readApiEnvelope<T>(res);
    if (!res.ok || !json.success) {
      const envelopeMessage = json.success === false ? json.error?.message : undefined;
      const envelopeCode = json.success === false ? json.error?.code : undefined;
      const mapped = mapHttpStatusToUserMessage(res.status, envelopeMessage, fallback);
      throw new ApiRequestError(
        mapped.message,
        envelopeCode ?? mapped.code,
        res.status,
      );
    }
    return assertApiSuccess(res, json, fallback);
  }, fallback);
}

export async function publicApiJson<T>(
  url: string,
  init?: RequestInit,
  fallback = 'Permintaan gagal.',
): Promise<T> {
  return wrapApiCall(async () => {
    const res = await fetch(url, init);
    const json = await readApiEnvelope<T>(res);
    if (!res.ok || !json.success) {
      const envelopeMessage = json.success === false ? json.error?.message : undefined;
      const envelopeCode = json.success === false ? json.error?.code : undefined;
      const mapped = mapHttpStatusToUserMessage(res.status, envelopeMessage, fallback);
      throw new ApiRequestError(
        mapped.message,
        envelopeCode ?? mapped.code,
        res.status,
      );
    }
    return assertApiSuccess(res, json, fallback);
  }, fallback);
}

export function mapApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    return err.message;
  }
  return toUserFacingError(err, fallback);
}
