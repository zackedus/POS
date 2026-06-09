import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ErrorCodes } from '@barokah/shared';
import type { StorefrontCustomerJwtPayload } from '../storefront-customer-auth.types';

@Injectable()
export class StorefrontCustomerJwtStrategy extends PassportStrategy(Strategy, 'storefront-customer-jwt') {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') ?? 'dev-secret-change-me',
    });
  }

  validate(payload: StorefrontCustomerJwtPayload & { exp?: number; iat?: number }): StorefrontCustomerJwtPayload {
    if (payload?.kind !== 'storefront_customer' || !payload?.sub || !payload?.tenantId || !payload?.tenantSlug) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Sesi pelanggan tidak valid. Silakan login kembali.',
      });
    }
    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      tenantSlug: payload.tenantSlug,
      phone: payload.phone,
      kind: 'storefront_customer',
    };
  }
}
