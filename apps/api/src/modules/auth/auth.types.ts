import type { UserRole } from '@barokah/database';

export interface AuthJwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole;
  outletIds: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  outletIds: string[];
}
