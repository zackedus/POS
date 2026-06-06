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
  const day = jakartaNow.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(jakartaNow);
  monday.setUTCDate(jakartaNow.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const dateFrom = monday.toISOString().slice(0, 10);
  const dateTo = sunday.toISOString().slice(0, 10);
  return resolveReportDayRange(undefined, dateFrom, dateTo);
}
