import type { DigitalReceipt, EscPosStub } from './transactions';

/**
 * MVP thermal print — browser print dialog on receipt markup.
 * ESC/POS payload from API is a placeholder until hardware driver (Arif integration).
 */
export function printReceiptBrowser(receiptElementId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const node = document.getElementById(receiptElementId);
  if (!node) {
    return;
  }

  const printWindow = window.open('', '_blank', 'width=400,height=720');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Struk ${receiptElementId}</title>
        <style>
          @page { size: 58mm auto; margin: 4mm; }
          body { font-family: monospace; font-size: 12px; margin: 0; color: #000; }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>${node.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

export function formatEscPosIntegrationHint(escpos: EscPosStub): string {
  return `Stub ESC/POS (${escpos.commands.join(' → ')}, lebar ${escpos.width}mm) — driver thermal menyusul integrasi hardware.`;
}

export function decodeEscPosPreview(escpos: EscPosStub): string {
  try {
    return atob(escpos.payload);
  } catch {
    return '';
  }
}

/** Human-readable ESC/POS preview for kasir debug before hardware driver (Arif POC). */
export function renderEscPosPreview(escpos: EscPosStub): string {
  const decoded = decodeEscPosPreview(escpos);
  if (!decoded) {
    return '(payload kosong atau tidak valid)';
  }
  const ESC = '\u001b';
  const GS = '\u001d';
  const normalized = decoded
    .split(ESC + '@').join('[INIT]')
    .split(ESC + 'a\u0001').join('[CENTER]')
    .split(ESC + 'a\u0000').join('[LEFT]')
    .split(GS + 'V\u0000').join('[CUT]')
    .split(GS + 'V\u0001').join('[PARTIAL-CUT]');
  return normalized.trim();
}

/** WebUSB thermal printer stub — browser API not wired yet; see docs/integration/THERMAL-PRINT-MVP-STUB.md */
export function webUsbThermalStubAvailable(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return 'usb' in navigator;
}

export function formatWebUsbIntegrationHint(): string {
  if (webUsbThermalStubAvailable()) {
    return 'WebUSB tersedia di browser ini — driver ESC/POS USB menyusul (Arif POC). Gunakan Cetak Struk browser sementara.';
  }
  return 'WebUSB tidak tersedia — gunakan Cetak Struk browser atau integrasi Bluetooth thermal (Arif POC).';
}

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Tunai',
    TRANSFER: 'Transfer',
    QRIS: 'QRIS',
    E_WALLET: 'E-Wallet',
    CARD: 'Kartu',
  };
  return labels[method] ?? method;
}

export function formatReceiptDateTime(iso: string | null): string {
  if (!iso) {
    return '-';
  }
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildReceiptPrintTitle(receipt: DigitalReceipt): string {
  return `Struk ${receipt.receiptNo} — ${receipt.outlet.name}`;
}
