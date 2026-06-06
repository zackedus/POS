import type { DigitalReceipt, EscPosStub } from './transactions';
import { formatCurrencyIDR } from '@barokah/shared';

const ESC = '\u001b';
const GS = '\u001d';

type WebUsbDevice = {
  open: () => Promise<void>;
  selectConfiguration: (n: number) => Promise<void>;
  claimInterface: (n: number) => Promise<void>;
  transferOut: (endpointNumber: number, data: Uint8Array) => Promise<unknown>;
  configuration: {
    interfaces: Array<{
      interfaceNumber: number;
      alternates: Array<{ endpoints: Array<{ direction: string; endpointNumber: number }> }>;
    }>;
  } | null;
  productName?: string;
};

let connectedUsbDevice: WebUsbDevice | null = null;

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
    return 'WebUSB tersedia di browser ini — gunakan "Hubungkan Printer" untuk stub koneksi, lalu cetak dari preview struk terakhir.';
  }
  return 'WebUSB tidak tersedia — gunakan Cetak Struk browser atau integrasi Bluetooth thermal (Arif POC).';
}

/** WebUSB connect stub — requests common ESC/POS USB vendor filter (Phase 8). */
export async function connectWebUsbThermalStub(): Promise<{ ok: boolean; message: string }> {
  if (!webUsbThermalStubAvailable()) {
    return { ok: false, message: 'WebUSB tidak didukung browser ini.' };
  }
  try {
    const usb = (navigator as Navigator & { usb: { requestDevice: (opts: unknown) => Promise<unknown> } }).usb;
    await usb.requestDevice({
      filters: [{ classCode: 0x07 }],
    });
    return {
      ok: true,
      message: 'Perangkat USB dipilih (stub) — driver ESC/POS penuh menyusul integrasi Arif.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menghubungkan printer USB.';
    return { ok: false, message };
  }
}

/** Send decoded ESC/POS preview bytes to connected WebUSB device (stub logs only). */
export async function printEscPosWebUsbStub(previewText: string): Promise<{ ok: boolean; message: string }> {
  if (!previewText.trim()) {
    return { ok: false, message: 'Preview struk kosong.' };
  }
  if (!webUsbThermalStubAvailable()) {
    return { ok: false, message: formatWebUsbIntegrationHint() };
  }
  return {
    ok: true,
    message: `Stub WebUSB: ${previewText.length} karakter preview siap dikirim ke driver thermal.`,
  };
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

/** Build plain-text ESC/POS receipt from transaction DTO. */
export function buildEscPosReceiptFromDto(receipt: DigitalReceipt): string {
  const lines: string[] = [
    receipt.tenantName,
    receipt.outlet.name,
    receipt.outlet.address ?? '',
    '------------------------',
    `No: ${receipt.receiptNo}`,
    formatReceiptDateTime(receipt.completedAt),
    `Kasir: ${receipt.cashier.fullName}`,
  ];
  if (receipt.status === 'VOID') {
    lines.push('*** VOID ***');
  }
  lines.push('------------------------');
  for (const item of receipt.items) {
    lines.push(item.name);
    lines.push(
      `${item.quantity} x ${formatCurrencyIDR(item.unitPrice)} = ${formatCurrencyIDR(item.subtotal)}`,
    );
  }
  lines.push('------------------------');
  lines.push(`Subtotal ${formatCurrencyIDR(receipt.subtotal)}`);
  if (receipt.discount > 0) lines.push(`Diskon ${formatCurrencyIDR(receipt.discount)}`);
  if (receipt.tax > 0) lines.push(`PPN ${formatCurrencyIDR(receipt.tax)}`);
  lines.push(`TOTAL ${formatCurrencyIDR(receipt.netTotal)}`);
  lines.push('------------------------');
  for (const payment of receipt.payments) {
    lines.push(`${paymentMethodLabel(payment.method)} ${formatCurrencyIDR(payment.amount)}`);
  }
  lines.push('', 'Terima kasih', '');
  return lines.filter(Boolean).join('\n');
}

export function encodeEscPosPayload(text: string, width = 32): Uint8Array {
  const normalized = text.replace(/\r\n/g, '\n').slice(0, width * 80);
  const body = normalized.split('\n').map((line) => line.slice(0, width)).join('\n');
  const raw = `${ESC}@${body}\n${GS}V\u0000`;
  return new TextEncoder().encode(raw);
}

export function buildEscPosFromReceipt(receipt: DigitalReceipt, width = 32): EscPosStub {
  const text = buildEscPosReceiptFromDto(receipt);
  const bytes = encodeEscPosPayload(text, width);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return {
    format: 'escpos',
    encoding: 'base64',
    width,
    payload: btoa(binary),
    commands: ['INIT', 'TEXT', 'CUT'],
  };
}

export function getConnectedWebUsbDevice(): WebUsbDevice | null {
  return connectedUsbDevice;
}

export function setConnectedWebUsbDeviceForTest(device: WebUsbDevice | null): void {
  connectedUsbDevice = device;
}

async function findOutEndpoint(device: WebUsbDevice): Promise<number | null> {
  if (!device.configuration) return null;
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const outEndpoint = alt.endpoints.find((ep) => ep.direction === 'out');
      if (outEndpoint) return outEndpoint.endpointNumber;
    }
  }
  return null;
}

/** WebUSB production connect — ESC/POS USB class 0x07. */
export async function connectWebUsbThermalPrinter(): Promise<{ ok: boolean; message: string }> {
  if (!webUsbThermalStubAvailable()) {
    return { ok: false, message: 'WebUSB tidak didukung browser ini.' };
  }
  try {
    const usb = (navigator as Navigator & { usb: { requestDevice: (opts: unknown) => Promise<WebUsbDevice> } }).usb;
    const device = await usb.requestDevice({ filters: [{ classCode: 0x07 }] });
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    const iface = device.configuration?.interfaces[0];
    if (iface) {
      await device.claimInterface(iface.interfaceNumber);
    }
    connectedUsbDevice = device;
    return {
      ok: true,
      message: `Printer USB terhubung: ${device.productName ?? 'Perangkat thermal'}.`,
    };
  } catch (err) {
    connectedUsbDevice = null;
    const message = err instanceof Error ? err.message : 'Gagal menghubungkan printer USB.';
    return { ok: false, message };
  }
}

/** Send ESC/POS bytes to connected WebUSB printer. */
export async function printEscPosWebUsb(
  payload: Uint8Array | EscPosStub | DigitalReceipt,
): Promise<{ ok: boolean; message: string }> {
  let bytes: Uint8Array;
  if (payload instanceof Uint8Array) {
    bytes = payload;
  } else if ('receiptNo' in payload) {
    bytes = encodeEscPosPayload(buildEscPosReceiptFromDto(payload));
  } else {
    bytes = encodeEscPosPayload(renderEscPosPreview(payload));
  }

  if (!bytes.length) {
    return { ok: false, message: 'Payload struk kosong.' };
  }

  if (!connectedUsbDevice) {
    return {
      ok: false,
      message: 'Printer USB belum terhubung — hubungkan printer atau gunakan Cetak Struk browser.',
    };
  }

  try {
    const endpointNumber = await findOutEndpoint(connectedUsbDevice);
    if (endpointNumber === null) {
      return { ok: false, message: 'Endpoint USB printer tidak ditemukan.' };
    }
    await connectedUsbDevice.transferOut(endpointNumber, bytes);
    return { ok: true, message: 'Struk dikirim ke printer thermal.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal mencetak ke printer USB.';
    return { ok: false, message };
  }
}
