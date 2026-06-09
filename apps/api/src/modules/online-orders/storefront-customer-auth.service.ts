import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ErrorCodes } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { CreditLimitService } from '../finance/credit-limit.service';
import type { CreateCustomerAddressDto, UpdateCustomerAddressDto } from '../customers/dto/customer-address.dto';
import { normalizePhone } from './online-order.util';
import type {
  StorefrontCustomerJwtPayload,
  StorefrontCustomerProfile,
  StorefrontCustomerTokens,
} from './storefront-customer-auth.types';
import type {
  StorefrontCustomerLoginDto,
  StorefrontCustomerRegisterDto,
  StorefrontCustomerUpdateProfileDto,
} from './dto/storefront-customer-auth.dto';

@Injectable()
export class StorefrontCustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly creditLimitService: CreditLimitService,
  ) {}

  async register(tenantSlug: string, dto: StorefrontCustomerRegisterDto) {
    const tenant = await this.resolveTenant(tenantSlug);
    const normalizedPhone = normalizePhone(dto.phone);
    const email = dto.email?.trim().toLowerCase() || null;

    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId: tenant.id, phone: normalizedPhone } },
    });
    if (existing?.passwordHash) {
      throw new ConflictException({
        code: ErrorCodes.DUPLICATE_ENTRY,
        message: 'Nomor HP sudah terdaftar. Silakan login.',
      });
    }

    if (email) {
      const emailTaken = await this.prisma.customer.findFirst({
        where: { tenantId: tenant.id, email, NOT: existing ? { id: existing.id } : undefined },
      });
      if (emailTaken) {
        throw new ConflictException({
          code: ErrorCodes.DUPLICATE_ENTRY,
          message: 'Email sudah digunakan pelanggan lain.',
        });
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    let customer = existing;

    if (!customer) {
      const memberCode = await this.generateUniqueMemberCode(tenant.id);
      const defaultLimit = this.creditLimitService.getDefaultCreditLimitDecimal();
      customer = await this.prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
          data: {
            tenantId: tenant.id,
            name: dto.name.trim(),
            phone: normalizedPhone,
            email,
            memberCode,
            passwordHash,
            creditLimit: defaultLimit,
            autoLimitEnabled: true,
          },
        });
        await this.creditLimitService.logDefaultLimitOnCreate(tx, {
          tenantId: tenant.id,
          customerId: created.id,
        });
        return created;
      });
    } else {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: dto.name.trim(),
          email: email ?? customer.email,
          passwordHash,
        },
      });
    }

    const profile = await this.buildProfile(customer.id, tenant.id);
    const tokens = await this.issueTokens({
      sub: customer.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      phone: customer.phone,
      kind: 'storefront_customer',
    });

    return {
      customer: profile,
      tokens,
      tenantName: tenant.name,
      message: 'Pendaftaran berhasil. Tambahkan alamat pengiriman sebelum checkout.',
    };
  }

  async login(tenantSlug: string, dto: StorefrontCustomerLoginDto) {
    const tenant = await this.resolveTenant(tenantSlug);
    const identifier = dto.identifier.trim();
    const normalizedPhone = /^08\d{8,11}$/.test(identifier) ? normalizePhone(identifier) : null;
    const normalizedEmail = identifier.includes('@') ? identifier.toLowerCase() : null;

    const customer = await this.prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
    });

    if (!customer?.passwordHash) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'HP/email atau password salah. Daftar terlebih dahulu jika belum punya akun.',
      });
    }

    const passwordValid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'HP/email atau password salah.',
      });
    }

    const profile = await this.buildProfile(customer.id, tenant.id);
    const tokens = await this.issueTokens({
      sub: customer.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      phone: customer.phone,
      kind: 'storefront_customer',
    });

    return { customer: profile, tokens };
  }

  async getMe(customer: StorefrontCustomerJwtPayload, tenantSlug: string) {
    await this.assertTenantSlug(customer, tenantSlug);
    return this.buildProfile(customer.sub, customer.tenantId);
  }

  async updateMe(
    customer: StorefrontCustomerJwtPayload,
    tenantSlug: string,
    dto: StorefrontCustomerUpdateProfileDto,
  ) {
    await this.assertTenantSlug(customer, tenantSlug);

    if (dto.email?.trim()) {
      const email = dto.email.trim().toLowerCase();
      const taken = await this.prisma.customer.findFirst({
        where: { tenantId: customer.tenantId, email, NOT: { id: customer.sub } },
      });
      if (taken) {
        throw new ConflictException({
          code: ErrorCodes.DUPLICATE_ENTRY,
          message: 'Email sudah digunakan pelanggan lain.',
        });
      }
    }

    let normalizedPhone: string | undefined;
    if (dto.phone !== undefined) {
      normalizedPhone = normalizePhone(dto.phone.trim());
      const taken = await this.prisma.customer.findUnique({
        where: { tenantId_phone: { tenantId: customer.tenantId, phone: normalizedPhone } },
      });
      if (taken && taken.id !== customer.sub) {
        throw new ConflictException({
          code: ErrorCodes.DUPLICATE_ENTRY,
          message: 'Nomor HP sudah digunakan pelanggan lain.',
        });
      }
    }

    const updateData: {
      name?: string;
      email?: string | null;
      phone?: string;
      passwordHash?: string;
    } = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() || null } : {}),
      ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
    };

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Password saat ini wajib diisi untuk mengubah password.',
        });
      }
      const row = await this.prisma.customer.findFirst({
        where: { id: customer.sub },
        select: { passwordHash: true },
      });
      if (!row?.passwordHash) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Akun belum memiliki password. Hubungi toko.',
        });
      }
      const passwordValid = await bcrypt.compare(dto.currentPassword, row.passwordHash);
      if (!passwordValid) {
        throw new UnauthorizedException({
          code: ErrorCodes.INVALID_CREDENTIALS,
          message: 'Password saat ini salah.',
        });
      }
      updateData.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    await this.prisma.customer.update({
      where: { id: customer.sub },
      data: updateData,
    });

    return this.buildProfile(customer.sub, customer.tenantId);
  }

  async listAddresses(customer: StorefrontCustomerJwtPayload, tenantSlug: string) {
    await this.assertTenantSlug(customer, tenantSlug);
    const rows = await this.prisma.customerAddress.findMany({
      where: { customerId: customer.sub },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return { addresses: rows.map((row) => this.mapAddress(row)) };
  }

  async createAddress(
    customer: StorefrontCustomerJwtPayload,
    tenantSlug: string,
    dto: CreateCustomerAddressDto,
  ) {
    await this.assertTenantSlug(customer, tenantSlug);
    const isDefault = dto.isDefault ?? false;

    const row = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId: customer.sub },
          data: { isDefault: false },
        });
      } else {
        const count = await tx.customerAddress.count({ where: { customerId: customer.sub } });
        if (count === 0) {
          dto = { ...dto, isDefault: true };
        }
      }
      return tx.customerAddress.create({
        data: {
          customerId: customer.sub,
          label: dto.label.trim(),
          addressLine1: dto.addressLine1.trim(),
          addressLine2: dto.addressLine2?.trim() || null,
          city: dto.city.trim(),
          province: dto.province?.trim() || null,
          postalCode: dto.postalCode?.trim() || null,
          isDefault: dto.isDefault ?? isDefault,
        },
      });
    });
    return this.mapAddress(row);
  }

  async updateAddress(
    customer: StorefrontCustomerJwtPayload,
    tenantSlug: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    await this.assertTenantSlug(customer, tenantSlug);
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId: customer.sub },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Alamat tidak ditemukan.',
      });
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.customerAddress.updateMany({
          where: { customerId: customer.sub, NOT: { id: addressId } },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
          ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1.trim() } : {}),
          ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2?.trim() || null } : {}),
          ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
          ...(dto.province !== undefined ? { province: dto.province?.trim() || null } : {}),
          ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode?.trim() || null } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
    return this.mapAddress(row);
  }

  async deleteAddress(customer: StorefrontCustomerJwtPayload, tenantSlug: string, addressId: string) {
    await this.assertTenantSlug(customer, tenantSlug);
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId: customer.sub },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Alamat tidak ditemukan.',
      });
    }
    await this.prisma.customerAddress.delete({ where: { id: addressId } });
    if (existing.isDefault) {
      const next = await this.prisma.customerAddress.findFirst({
        where: { customerId: customer.sub },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await this.prisma.customerAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return { deleted: true };
  }

  async resolveCustomerAddress(
    customerId: string,
    tenantId: string,
    addressId: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });
    if (!customer) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Akun pelanggan tidak valid.',
      });
    }
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Alamat pengiriman tidak ditemukan.',
      });
    }
    return address;
  }

  private async buildProfile(customerId: string, tenantId: string): Promise<StorefrontCustomerProfile> {
    const row = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: { _count: { select: { addresses: true } } },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      memberCode: row.memberCode,
      points: row.points,
      memberSince: row.memberSince.toISOString(),
      addressCount: row._count.addresses,
    };
  }

  private mapAddress(row: {
    id: string;
    label: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    province: string | null;
    postalCode: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      label: row.label,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      province: row.province,
      postalCode: row.postalCode,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async issueTokens(payload: StorefrontCustomerJwtPayload): Promise<StorefrontCustomerTokens> {
    const accessExpiresIn = '7d';
    const refreshExpiresIn = '30d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as object, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload as object, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: accessExpiresIn };
  }

  private async resolveTenant(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_STORE_NOT_FOUND,
        message: 'Toko tidak ditemukan.',
      });
    }
    return tenant;
  }

  private async assertTenantSlug(customer: StorefrontCustomerJwtPayload, tenantSlug: string) {
    if (customer.tenantSlug !== tenantSlug) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Sesi tidak valid untuk toko ini.',
      });
    }
  }

  private async generateUniqueMemberCode(tenantId: string): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
      const memberCode = `MBR-${suffix}`;
      const exists = await this.prisma.customer.findFirst({
        where: { tenantId, memberCode },
        select: { id: true },
      });
      if (!exists) return memberCode;
    }
    throw new ConflictException({
      code: ErrorCodes.CONFLICT,
      message: 'Gagal membuat kode member. Coba lagi.',
    });
  }
}
