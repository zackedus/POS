import type { ConfigService } from '@nestjs/config';

export interface ProductionStartupWarning {
  code: string;
  message: string;
}

export function collectProductionStartupWarnings(config: ConfigService): ProductionStartupWarning[] {
  const warnings: ProductionStartupWarning[] = [];
  const nodeEnv = config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  if (!isProduction) {
    return warnings;
  }

  const midtransKey = config.get<string>('MIDTRANS_SERVER_KEY')?.trim();
  const midtransProduction = config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';

  if (midtransProduction && !midtransKey) {
    warnings.push({
      code: 'MIDTRANS_LIVE_NO_KEY',
      message:
        'MIDTRANS_IS_PRODUCTION=true tanpa MIDTRANS_SERVER_KEY — checkout online fallback mock. Simpan kunci live sebelum go-live.',
    });
  }

  const jwtSecret = config.get<string>('JWT_SECRET')?.trim();
  if (!jwtSecret || jwtSecret === 'dev-secret-change-me') {
    warnings.push({
      code: 'JWT_SECRET_WEAK',
      message: 'JWT_SECRET belum dikonfigurasi untuk produksi — set secret kuat di env.',
    });
  }

  const smtpHost = config.get<string>('SMTP_HOST')?.trim();
  if (!smtpHost) {
    warnings.push({
      code: 'SMTP_NOT_CONFIGURED',
      message: 'SMTP_HOST tidak diset — laporan mingguan email akan log ke console (mock).',
    });
  }

  return warnings;
}

export function logProductionStartupWarnings(config: ConfigService, logger: { warn: (msg: string) => void }): void {
  const warnings = collectProductionStartupWarnings(config);
  for (const warning of warnings) {
    logger.warn(`[PRODUCTION GUARDRAIL] ${warning.code}: ${warning.message}`);
  }
}
