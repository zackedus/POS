export const FINANCE_REPORT_PERIODS = ['day', 'week', 'month', 'year'] as const;

export type FinanceReportPeriod = (typeof FINANCE_REPORT_PERIODS)[number];
