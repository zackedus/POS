type AnalyticsCategoryMargin = {
  categoryId: string;
  categoryName: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  quantity: number;
};

type AnalyticsExportPayload = {
  outletId: string;
  periodDays: number;
  dateFrom: string;
  dateTo: string;
  timezone: string;
  summary: {
    revenue: number;
    cost: number;
    margin: number;
    marginPercent: number;
    itemCount: number;
  };
  marginByCategory: AnalyticsCategoryMargin[];
};

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(cells: Array<string | number>): string {
  return cells.map(escapeCsvCell).join(',');
}

export function buildAnalyticsMarginCsv(payload: AnalyticsExportPayload): string {
  const lines: string[] = [
    csvRow(['Field', 'Value']),
    csvRow(['outletId', payload.outletId]),
    csvRow(['periodDays', payload.periodDays]),
    csvRow(['dateFrom', payload.dateFrom]),
    csvRow(['dateTo', payload.dateTo]),
    csvRow(['timezone', payload.timezone]),
    csvRow(['summaryRevenue', payload.summary.revenue]),
    csvRow(['summaryCost', payload.summary.cost]),
    csvRow(['summaryMargin', payload.summary.margin]),
    csvRow(['summaryMarginPercent', payload.summary.marginPercent]),
    csvRow(['itemCount', payload.summary.itemCount]),
    '',
    csvRow([
      'categoryId',
      'categoryName',
      'revenue',
      'cost',
      'margin',
      'marginPercent',
      'quantity',
    ]),
    ...payload.marginByCategory.map((row) =>
      csvRow([
        row.categoryId,
        row.categoryName,
        row.revenue,
        row.cost,
        row.margin,
        row.marginPercent,
        row.quantity,
      ]),
    ),
  ];
  return lines.join('\r\n');
}
