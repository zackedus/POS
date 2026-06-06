import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ErrorCodes } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import type { AuthJwtPayload, AuthTokens, AuthUserProfile } from './auth.types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ user: AuthUserProfile; tokens: AuthTokens }> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      include: {
        tenant: true,
        userOutlets: { select: { outletId: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Email atau password salah.',
      });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Email atau password salah.',
      });
    }

    const outletIds = user.userOutlets.map((uo) => uo.outletId);
    const payload: AuthJwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      outletIds,
    };

    const tokens = await this.issueTokens(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        tenantSlug: user.tenant.slug,
        outletIds,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = await this.jwtService.verifyAsync<AuthJwtPayload & { exp?: number; iat?: number }>(
        refreshToken,
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
        },
      );
      return this.issueTokens(this.toAuthPayload(decoded));
    } catch {
      throw new UnauthorizedException({
        code: ErrorCodes.TOKEN_EXPIRED,
        message: 'Sesi telah berakhir. Silakan login kembali.',
      });
    }
  }

  async getProfile(userId: string): Promise<AuthUserProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      include: {
        tenant: true,
        userOutlets: { select: { outletId: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      tenantSlug: user.tenant.slug,
      outletIds: user.userOutlets.map((uo) => uo.outletId),
    };
  }

  /** Strip JWT time claims before re-signing (jsonwebtoken rejects expiresIn + exp). */
  private toAuthPayload(decoded: AuthJwtPayload & { exp?: number; iat?: number }): AuthJwtPayload {
    return {
      sub: decoded.sub,
      email: decoded.email,
      tenantId: decoded.tenantId,
      role: decoded.role,
      outletIds: decoded.outletIds ?? [],
    };
  }

  private async issueTokens(payload: AuthJwtPayload): Promise<AuthTokens> {
    const accessExpiresIn = this.configService.get<string>('jwt.expiresIn') ?? '15m';
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as object, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(payload as object, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }
}
