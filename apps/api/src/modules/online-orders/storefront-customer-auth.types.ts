export interface StorefrontCustomerJwtPayload {
  sub: string;
  tenantId: string;
  tenantSlug: string;
  phone: string;
  kind: 'storefront_customer';
}

export interface StorefrontCustomerTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface StorefrontCustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  memberCode: string;
  points: number;
  memberSince: string;
  addressCount: number;
}
