import { BadRequestException } from '@nestjs/common';
import { ErrorCodes } from '@barokah/shared';

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface ReportDayRange {
  date: string;
  dateFrom?: string;
  dateTo?: string;
  isRange: boolean;
  startUtc: Date;
  endUtc: Date;
}

function todayJakartaIso(): string {
  return new Date(Date.now() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

function assertValidDate(value: string, field: string): void {
  if (!DATE_PATTERN.test(value)) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: `${field} harus format YYYY-MM-DD (kalender WIB).`,
    });
  }
}

function dayStartUtc(date: string): Date {
  return new Date(`${date}T00:00:00+07:00`);
}

/** Resolve a calendar day or inclusive date range in Asia/Jakarta (WIB) to UTC bounds. */
export function resolveReportDayRange(
  dateInput?: string,
  dateFromInput?: string,
  dateToInput?: string,
): ReportDayRange {
  const dateFrom = dateFromInput?.trim();
  const dateTo = dateToInput?.trim();

  if (dateFrom || dateTo) {
    if (!dateFrom || !dateTo) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'dateFrom dan dateTo wajib diisi bersamaan untuk rentang tanggal.',
      });
    }

    assertValidDate(dateFrom, 'dateFrom');
    assertValidDate(dateTo, 'dateTo');

    if (dateFrom > dateTo) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'dateFrom tidak boleh setelah dateTo.',
      });
    }

    const startUtc = dayStartUtc(dateFrom);
    const endUtc = new Date(dayStartUtc(dateTo).getTime() + 24 * 60 * 60 * 1000);

    return {
      date: dateFrom === dateTo ? dateFrom : `${dateFrom} s/d ${dateTo}`,
      dateFrom,
      dateTo,
      isRange: dateFrom !== dateTo,
      startUtc,
      endUtc,
    };
  }

  const date = dateInput?.trim() || todayJakartaIso();
  assertValidDate(date, 'date');

  const startUtc = dayStartUtc(date);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

  return { date, isRange: false, startUtc, endUtc };
}

/** Current calendar week (Mon–Sun) in Asia/Jakarta. */
export function resolveCurrentWeekRangeJakarta(now = new Date()): ReportDayRange {
  const jakartaNow = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  return resolveWeekRangeForAnchorJakarta(jakartaNow.toISOString().slice(0, 10));
}

/** Calendar week (Mon–Sun) containing anchor date (YYYY-MM-DD, WIB). */
export function resolveWeekRangeForAnchorJakarta(anchorDate: string): ReportDayRange {
  assertValidDate(anchorDate, 'date');
  const jakartaAnchor = new Date(dayStartUtc(anchorDate).getTime() + JAKARTA_OFFSET_MS);
  const day = jakartaAnchor.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(jakartaAnchor);
  monday.setUTCDate(jakartaAnchor.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const dateFrom = monday.toISOString().slice(0, 10);
  const dateTo = sunday.toISOString().slice(0, 10);
  return resolveReportDayRange(undefined, dateFrom, dateTo);
}

/** First and last calendar day of month containing anchor (WIB). */
export function resolveMonthRangeForAnchorJakarta(anchorDate: string): ReportDayRange {
  assertValidDate(anchorDate, 'date');
  const [yearStr, monthStr] = anchorDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const dateFrom = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dateTo = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return resolveReportDayRange(undefined, dateFrom, dateTo);
}

/** Calendar year containing anchor (WIB). */
export function resolveYearRangeForAnchorJakarta(anchorDate: string): ReportDayRange {
  assertValidDate(anchorDate, 'date');
  const year = anchorDate.slice(0, 4);
  return resolveReportDayRange(undefined, `${year}-01-01`, `${year}-12-31`);
}

export type FinanceReportPeriod = 'day' | 'week' | 'month' | 'year';

function subtractCalendarDays(isoDate: string, days: number): string {
  const start = dayStartUtc(isoDate);
  const shifted = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
  return new Date(shifted.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Previous calendar period immediately before the anchor (WIB). */
export function resolvePreviousPeriodRange(
  period: FinanceReportPeriod,
  anchorDate: string,
): ReportDayRange {
  switch (period) {
    case 'day':
      return resolveReportDayRange(subtractCalendarDays(anchorDate, 1));
    case 'week': {
      const current = resolveWeekRangeForAnchorJakarta(anchorDate);
      const prevAnchor = subtractCalendarDays(current.dateFrom!, 1);
      return resolveWeekRangeForAnchorJakarta(prevAnchor);
    }
    case 'month': {
      const [yearStr, monthStr] = anchorDate.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevAnchor = `${prevYear}-${String(prevMonth).padStart(2, '0')}-15`;
      return resolveMonthRangeForAnchorJakarta(prevAnchor);
    }
    case 'year': {
      const prevYear = Number(anchorDate.slice(0, 4)) - 1;
      return resolveYearRangeForAnchorJakarta(`${prevYear}-06-15`);
    }
    default:
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'period harus day, week, month, atau year.',
      });
  }
}

/** Resolve finance report bounds — custom from/to overrides period preset. */
export function resolveFinanceReportRange(options: {
  period?: FinanceReportPeriod;
  date?: string;
  from?: string;
  to?: string;
}): ReportDayRange {
  const from = options.from?.trim();
  const to = options.to?.trim();
  if (from || to) {
    return resolveReportDayRange(undefined, from, to);
  }

  const anchor = options.date?.trim() || todayJakartaIso();
  const period = options.period ?? 'month';

  switch (period) {
    case 'day':
      return resolveReportDayRange(anchor);
    case 'week':
      return resolveWeekRangeForAnchorJakarta(anchor);
    case 'month':
      return resolveMonthRangeForAnchorJakarta(anchor);
    case 'year':
      return resolveYearRangeForAnchorJakarta(anchor);
    default:
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'period harus day, week, month, atau year.',
      });
  }
}
