import { randomAlphanumeric, type RandomFn } from './auto-generate';

/** Generate tenant-unique member card code (e.g. MBR-A1B2C3D4). */
export function generateMemberCode(random?: RandomFn): string {
  return `MBR-${randomAlphanumeric(8, random)}`;
}

/** QR payload for member card scan at POS. */
export function buildMemberQrPayload(tenantSlug: string, memberCode: string): string {
  return `barokah:member:${tenantSlug}:${memberCode}`;
}

/** Parse member QR payload; returns memberCode or null. */
export function parseMemberQrPayload(payload: string): { tenantSlug: string; memberCode: string } | null {
  const trimmed = payload.trim();
  const match = /^barokah:member:([^:]+):([A-Z0-9-]+)$/i.exec(trimmed);
  if (match) {
    return { tenantSlug: match[1]!, memberCode: match[2]!.toUpperCase() };
  }
  if (/^MBR-[A-Z0-9]{4,12}$/i.test(trimmed)) {
    return { tenantSlug: '', memberCode: trimmed.toUpperCase() };
  }
  return null;
}
