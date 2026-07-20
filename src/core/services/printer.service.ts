import { CartItem } from '../models/sale.model';

export interface PrintSettings {
  printer_type: string;
  printer_ip: string;
  printer_port: string;
  printer_paper_width: string;
  printer_auto_cut: string;
  printer_cut_type: string;
  printer_feed_lines: string;
  receipt_show_logo: string;
  receipt_show_barcode: string;
  receipt_show_qr: string;
  receipt_font_size: string;
  receipt_show_tax: string;
  receipt_footer_line1: string;
  receipt_footer_line2: string;
  receipt_footer_line3: string;
  receipt_print_copy: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  currency: string;
  tax_rate: string;
  receipt_show_header: string;
  receipt_show_company_info: string;
  receipt_show_customer_info: string;
  receipt_show_payment_details: string;
  receipt_show_served_by: string;
  receipt_show_timestamp: string;
  receipt_timestamp_format: string;
  receipt_served_by_label: string;
  receipt_header_line: string;
  receipt_show_item_count: string;
  receipt_show_subtotal: string;
  receipt_show_change: string;
  cashier_name: string;
  logo_base64?: string;
}

export interface ReceiptData {
  receiptNumber: string;
  saleDate: string;
  customerName: string | null;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  servedBy?: string | null;
}

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

// Xprinter specific commands
const XPRINTER = {
  // Initialize printer
  INIT: [ESC, 0x40],
  // Select character code table
  CODE_TABLE: [ESC, 0x74, 0x00],
  // Set print mode
  SELECT_FONT: (font: number) => [ESC, 0x21, font],
  // Set alignment: 0=left, 1=center, 2=right
  ALIGN: (n: number) => [ESC, 0x61, n],
  // Bold on/off
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  // Double width/height on/off
  DOUBLE_ON: [GS, 0x21, 0x11],
  DOUBLE_OFF: [GS, 0x21, 0x00],
  // Underline on/off
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  // Paper cut - FULL CUT
  CUT_FULL: [GS, 0x56, 0x00],
  // Paper cut - PARTIAL CUT
  CUT_PARTIAL: [GS, 0x56, 0x01],
  // Feed and cut
  FEED_CUT: (lines: number) => [GS, 0x56, 0x00, lines],
  // Paper feed
  FEED: (lines: number) => [ESC, 0x64, lines],
  // Set line spacing
  LINE_SPACING: (n: number) => [ESC, 0x33, n],
  // Default line spacing
  LINE_SPACING_DEFAULT: [ESC, 0x32],
  // Print barcode
  PRINT_BARCODE: (data: string, width: number = 3, height: number = 80) => [
    GS, 0x68, height,
    GS, 0x77, width,
    GS, 0x6B, 0x02,
    data.length % 256,
    Math.floor(data.length / 256),
    ...Array.from(data).map(c => c.charCodeAt(0))
  ],
  // Print QR Code (Xprinter compatible)
  QR_INIT: [GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00],
  QR_SIZE: (size: number) => [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size],
  QR_ERROR_CORRECTION: [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31],
  QR_STORE: (data: string) => {
    const len = data.length + 3;
    return [GS, 0x28, 0x6B, len % 256, Math.floor(len / 256), 0x31, 0x50, 0x30,
      ...Array.from(data).map(c => c.charCodeAt(0))];
  },
  QR_PRINT: [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30],
  // Open cash drawer
  CASH_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xFA],
};

// Font sizes
const FONT_SIZE = {
  SMALL: 0x00,
  NORMAL: 0x00,
  DOUBLE_WIDTH: 0x20,
  DOUBLE_HEIGHT: 0x01,
  DOUBLE: 0x21,
};

export class PrinterService {
  private settings: PrintSettings | null = null;
  private printerSocket: WebSocket | null = null;
  private isConnected = false;

  async loadSettings(): Promise<PrintSettings> {
    try {
      // Load from localStorage (set via Settings page)
      const raw = localStorage.getItem('ericko_pos_settings');
      const settingsMap: Record<string, string> = raw ? JSON.parse(raw) : {};

      this.settings = {
        printer_type: settingsMap['printer_type'] || 'network',
        printer_ip: settingsMap['printer_ip'] || '192.168.1.100',
        printer_port: settingsMap['printer_port'] || '9100',
        printer_paper_width: settingsMap['printer_paper_width'] || '80',
        printer_auto_cut: settingsMap['printer_auto_cut'] || 'true',
        printer_cut_type: settingsMap['printer_cut_type'] || 'full',
        printer_feed_lines: settingsMap['printer_feed_lines'] || '5',
        receipt_show_logo: settingsMap['receipt_show_logo'] || 'true',
        receipt_show_barcode: settingsMap['receipt_show_barcode'] || 'false',
        receipt_show_qr: settingsMap['receipt_show_qr'] || 'false',
        receipt_font_size: settingsMap['receipt_font_size'] || 'normal',
        receipt_show_tax: settingsMap['receipt_show_tax'] || 'true',
        receipt_footer_line1: settingsMap['receipt_footer_line1'] || 'Thank you for your business!',
        receipt_footer_line2: settingsMap['receipt_footer_line2'] || '',
        receipt_footer_line3: settingsMap['receipt_footer_line3'] || '',
        receipt_print_copy: settingsMap['receipt_print_copy'] || '1',
        company_name: settingsMap['company_name'] || 'ERICKO ENTERPRISE',
        company_address: settingsMap['company_address'] || '',
        company_phone: settingsMap['company_phone'] || '',
        currency: settingsMap['currency'] || 'KES',
        tax_rate: settingsMap['tax_rate'] || '16',
        receipt_show_header: settingsMap['receipt_show_header'] || 'true',
        receipt_show_company_info: settingsMap['receipt_show_company_info'] || 'true',
        receipt_show_customer_info: settingsMap['receipt_show_customer_info'] || 'true',
        receipt_show_payment_details: settingsMap['receipt_show_payment_details'] || 'true',
        receipt_show_served_by: settingsMap['receipt_show_served_by'] || 'true',
        receipt_show_timestamp: settingsMap['receipt_show_timestamp'] || 'true',
        receipt_timestamp_format: settingsMap['receipt_timestamp_format'] || 'full',
        receipt_served_by_label: settingsMap['receipt_served_by_label'] || 'Served By',
        receipt_header_line: settingsMap['receipt_header_line'] || '',
        receipt_show_item_count: settingsMap['receipt_show_item_count'] || 'true',
        receipt_show_subtotal: settingsMap['receipt_show_subtotal'] || 'true',
        receipt_show_change: settingsMap['receipt_show_change'] || 'true',
        cashier_name: settingsMap['cashier_name'] || '',
        logo_base64: settingsMap['logo_base64'] || ''
      };
    } catch {
      // Use defaults if localStorage read fails
      this.settings = {
        printer_type: 'network', printer_ip: '192.168.1.100', printer_port: '9100',
        printer_paper_width: '80', printer_auto_cut: 'true', printer_cut_type: 'full',
        printer_feed_lines: '5', receipt_show_logo: 'true', receipt_show_barcode: 'false',
        receipt_show_qr: 'false', receipt_font_size: 'normal', receipt_show_tax: 'true',
        receipt_footer_line1: 'Thank you for your business!', receipt_footer_line2: '',
        receipt_footer_line3: '', receipt_print_copy: '1',
        company_name: 'ERICKO ENTERPRISE', company_address: '', company_phone: '',
        currency: 'KES', tax_rate: '16', receipt_show_header: 'true',
        receipt_show_company_info: 'true', receipt_show_customer_info: 'true',
        receipt_show_payment_details: 'true', receipt_show_served_by: 'true',
        receipt_show_timestamp: 'true', receipt_timestamp_format: 'full',
        receipt_served_by_label: 'Served By', receipt_header_line: '',
        receipt_show_item_count: 'true', receipt_show_subtotal: 'true',
        receipt_show_change: 'true', cashier_name: '', logo_base64: ''
      };
    }

    return this.settings;
  }

  buildReceiptESCPOS(data: ReceiptData): number[] {
    const commands: number[] = [];
    const settings = this.settings!;
    const width = parseInt(settings.printer_paper_width) === 58 ? 32 : 42;

    // Initialize printer
    commands.push(...XPRINTER.INIT);
    commands.push(...XPRINTER.CODE_TABLE);

    // === HEADER ===
    if (settings.receipt_show_header === 'true') {
      commands.push(...XPRINTER.ALIGN(1)); // Center

      // Company name (large, bold)
      commands.push(...XPRINTER.DOUBLE_ON);
      commands.push(...XPRINTER.BOLD_ON);
      commands.push(...this.textToBytes(settings.company_name + '\n'));
      commands.push(...XPRINTER.BOLD_OFF);
      commands.push(...XPRINTER.DOUBLE_OFF);

      // Company address and phone
      if (settings.receipt_show_company_info === 'true') {
        if (settings.company_address) {
          commands.push(...this.textToBytes(settings.company_address + '\n'));
        }
        if (settings.company_phone) {
          commands.push(...this.textToBytes('Tel: ' + settings.company_phone + '\n'));
        }
      }

      // Optional custom header line
      if (settings.receipt_header_line) {
        commands.push(...this.textToBytes(settings.receipt_header_line + '\n'));
      }

      commands.push(...this.textToBytes('\n'));
    }

    // === RECEIPT DETAILS ===
    commands.push(...XPRINTER.ALIGN(0)); // Left
    commands.push(...this.textToBytes('Receipt: ' + data.receiptNumber + '\n'));

    // Timestamp
    if (settings.receipt_show_timestamp === 'true') {
      commands.push(...this.textToBytes('Date: ' + this.formatTimestamp(data.saleDate, settings.receipt_timestamp_format) + '\n'));
    }

    // Customer info
    if (settings.receipt_show_customer_info === 'true' && data.customerName) {
      commands.push(...this.textToBytes('Customer: ' + data.customerName + '\n'));
    }

    // Served by / cashier
    if (settings.receipt_show_served_by === 'true' && data.servedBy) {
      commands.push(...this.textToBytes(settings.receipt_served_by_label + ': ' + data.servedBy + '\n'));
    }

    commands.push(...this.textToBytes('\n'));

    // === DIVIDER ===
    commands.push(...this.textToBytes('='.repeat(width) + '\n'));

    // === ITEMS ===
    commands.push(...XPRINTER.BOLD_ON);
    commands.push(...this.textToBytes(this.padLine('Item', 'Qty', 'Price', width)));
    commands.push(...XPRINTER.BOLD_OFF);
    commands.push(...this.textToBytes('-'.repeat(width) + '\n'));

    for (const item of data.items) {
      const name = item.product_name.substring(0, width - 15);
      const qty = item.quantity.toString();
      const price = this.formatCurrency(item.line_total);
      commands.push(...this.textToBytes(this.padLine(name, qty, price, width) + '\n'));
    }

    commands.push(...this.textToBytes('='.repeat(width) + '\n'));

    // Item count
    if (settings.receipt_show_item_count === 'true') {
      const itemCount = data.items.reduce((sum, i) => sum + i.quantity, 0);
      commands.push(...this.textToBytes('Items: ' + itemCount + '\n'));
    }

    // === TOTALS ===
    commands.push(...XPRINTER.ALIGN(2)); // Right

    if (settings.receipt_show_subtotal === 'true') {
      commands.push(...this.textToBytes('Subtotal: ' + this.formatCurrency(data.subtotal) + '\n'));
    }

    if (data.discount > 0) {
      commands.push(...this.textToBytes('Discount: -' + this.formatCurrency(data.discount) + '\n'));
    }

    if (settings.receipt_show_tax === 'true' && data.tax > 0) {
      commands.push(...this.textToBytes('Tax (' + settings.tax_rate + '%): ' + this.formatCurrency(data.tax) + '\n'));
    }

    commands.push(...XPRINTER.BOLD_ON);
    commands.push(...XPRINTER.DOUBLE_ON);
    commands.push(...this.textToBytes('TOTAL: ' + this.formatCurrency(data.total) + '\n'));
    commands.push(...XPRINTER.DOUBLE_OFF);
    commands.push(...XPRINTER.BOLD_OFF);

    // === PAYMENT DETAILS ===
    if (settings.receipt_show_payment_details === 'true') {
      commands.push(...this.textToBytes('\n'));
      commands.push(...this.textToBytes('Paid: ' + this.formatCurrency(data.paid) + '\n'));
      if (settings.receipt_show_change === 'true' && data.change > 0) {
        commands.push(...this.textToBytes('Change: ' + this.formatCurrency(data.change) + '\n'));
      }
      commands.push(...this.textToBytes('Method: ' + data.paymentMethod + '\n'));
    }

    commands.push(...XPRINTER.ALIGN(1)); // Center
    commands.push(...this.textToBytes('\n'));

    // Barcode (optional)
    if (settings.receipt_show_barcode === 'true') {
      commands.push(...XPRINTER.ALIGN(1));
      commands.push(...XPRINTER.PRINT_BARCODE(data.receiptNumber.replace(/[^0-9]/g, '').padEnd(12, '0').substring(0, 12)));
      commands.push(...this.textToBytes('\n'));
    }

    // === FOOTER ===
    commands.push(...XPRINTER.ALIGN(1));
    if (settings.receipt_footer_line1) {
      commands.push(...this.textToBytes('\n' + settings.receipt_footer_line1 + '\n'));
    }
    if (settings.receipt_footer_line2) {
      commands.push(...this.textToBytes(settings.receipt_footer_line2 + '\n'));
    }
    if (settings.receipt_footer_line3) {
      commands.push(...this.textToBytes(settings.receipt_footer_line3 + '\n'));
    }

    // === END OF RECEIPT ===
    commands.push(...this.textToBytes('\n\n\n'));

    // Feed lines before cut
    const feedLines = parseInt(settings.printer_feed_lines) || 5;
    commands.push(...XPRINTER.FEED(feedLines));

    // Auto cut
    if (settings.printer_auto_cut === 'true') {
      if (settings.printer_cut_type === 'partial') {
        commands.push(...XPRINTER.CUT_PARTIAL);
      } else {
        commands.push(...XPRINTER.CUT_FULL);
      }
    }

    return commands;
  }

  private formatTimestamp(dateStr: string, format: string): string {
    const date = new Date(dateStr);
    switch (format) {
      case 'date_only':
        return date.toLocaleDateString();
      case 'time_only':
        return date.toLocaleTimeString();
      case 'iso':
        return date.toISOString();
      case 'full':
      default:
        return date.toLocaleString();
    }
  }

  async printReceipt(data: ReceiptData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.settings) {
        await this.loadSettings();
      }

      const commands = this.buildReceiptESCPOS(data);
      const copies = parseInt(this.settings!.receipt_print_copy) || 1;

      if (this.settings!.printer_type === 'network') {
        return await this.printNetwork(commands, copies, data);
      } else if (this.settings!.printer_type === 'usb') {
        return await this.printUSB(commands, copies);
      } else if (this.settings!.printer_type === 'bluetooth') {
        return await this.printBluetooth(commands, copies);
      }

      // Default fallback — always show browser print dialog
      return this.printViaBrowser(data);
    } catch (error: any) {
      console.error('Print failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async printNetwork(commands: number[], copies: number, receiptData?: ReceiptData): Promise<{ success: boolean; error?: string }> {
    const ip = this.settings!.printer_ip;
    const port = parseInt(this.settings!.printer_port);

    try {
      // Build the raw ESC/POS bytes
      const data = new Uint8Array(commands);

      // Try to reach Xprinter at its TCP port (9100 is default for Xprinter)
      const printUrl = `http://${ip}:${port}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(printUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: data,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        // Print additional copies
        for (let i = 1; i < copies; i++) {
          await fetch(printUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: data
          });
        }
        return { success: true };
      }

      // Printer responded but not OK — fallback to browser
      return this.printViaBrowser(receiptData);
    } catch {
      // Xprinter not reachable on network — fallback to browser print dialog
      return this.printViaBrowser(receiptData);
    }
  }

  private async printUSB(commands: number[], copies: number): Promise<{ success: boolean; error?: string }> {
    // USB printing via Web Serial API (Chrome/Edge only)
    if (!('serial' in navigator)) {
      return { success: false, error: 'Web Serial API not supported. Use Chrome/Edge.' };
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });

      const writer = port.writable.getWriter();
      const data = new Uint8Array(commands);

      for (let i = 0; i < copies; i++) {
        await writer.write(data);
      }

      writer.releaseLock();
      await port.close();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async printBluetooth(commands: number[], copies: number): Promise<{ success: boolean; error?: string }> {
    // Bluetooth printing via Web Bluetooth API (Chrome/Edge only)
    if (!('bluetooth' in navigator)) {
      return { success: false, error: 'Web Bluetooth API not supported.' };
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      const data = new Uint8Array(commands);
      for (let i = 0; i < copies; i++) {
        await characteristic.writeValue(data);
      }

      server.disconnect();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private printViaBrowser(receiptData?: ReceiptData): { success: boolean; error?: string } {
    const s = this.settings!;
    const d = receiptData;

    const lines: string[] = [];
    if (s.receipt_show_logo === 'true' && s.logo_base64) {
      lines.push(`<div class="center" style="margin-bottom: 8px;"><img src="${s.logo_base64}" style="max-height: 80px;" alt="Logo" /></div>`);
    }
    
    if (s.receipt_show_header === 'true') {
      lines.push(`<div class="center bold large">${s.company_name}</div>`);
      if (s.receipt_show_company_info === 'true') {
        if (s.company_address) lines.push(`<div class="center">${s.company_address}</div>`);
        if (s.company_phone) lines.push(`<div class="center">Tel: ${s.company_phone}</div>`);
      }
      if (s.receipt_header_line) lines.push(`<div class="center" style="margin-top: 4px;">${s.receipt_header_line}</div>`);
      lines.push('<div class="divider"></div>');
    }

    if (d) {
      lines.push(`<div>Receipt: <b>${d.receiptNumber}</b></div>`);
      lines.push(`<div>Date: ${new Date(d.saleDate).toLocaleString()}</div>`);
      if (d.customerName) lines.push(`<div>Customer: ${d.customerName}</div>`);
      if (d.servedBy) lines.push(`<div>${s.receipt_served_by_label}: ${d.servedBy}</div>`);
      lines.push('<div class="divider"></div>');

      // Items header
      lines.push('<table><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Amount</th></tr>');
      for (const item of d.items) {
        lines.push(`<tr><td>${item.product_name}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${s.currency} ${item.line_total.toFixed(2)}</td></tr>`);
      if (s.receipt_show_item_count === 'true') {
        lines.push(`<div>Total Items: ${d.items.length}</div>`);
      }
      lines.push('</table>');
      lines.push('<div class="divider"></div>');

      // Totals
      if (s.receipt_show_subtotal === 'true') {
        lines.push(`<div class="right">Subtotal: ${s.currency} ${d.subtotal.toFixed(2)}</div>`);
      }
      if (d.discount > 0) lines.push(`<div class="right">Discount: -${s.currency} ${d.discount.toFixed(2)}</div>`);
      if (s.receipt_show_tax === 'true' && d.tax > 0) lines.push(`<div class="right">Tax: ${s.currency} ${d.tax.toFixed(2)}</div>`);
      lines.push(`<div class="right bold large">TOTAL: ${s.currency} ${d.total.toFixed(2)}</div>`);
      
      if (s.receipt_show_payment_details === 'true') {
        lines.push(`<div class="right">Paid: ${s.currency} ${d.paid.toFixed(2)}</div>`);
        if (s.receipt_show_change === 'true' && d.change > 0) {
          lines.push(`<div class="right">Change: ${s.currency} ${d.change.toFixed(2)}</div>`);
        }
        lines.push(`<div class="right">Method: ${d.paymentMethod}</div>`);
      }
    }

    lines.push('<div class="divider"></div>');
    if (s.receipt_footer_line1) lines.push(`<div class="center">${s.receipt_footer_line1}</div>`);
    if (s.receipt_footer_line2) lines.push(`<div class="center">${s.receipt_footer_line2}</div>`);
    if (s.receipt_footer_line3) lines.push(`<div class="center">${s.receipt_footer_line3}</div>`);

    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) {
      return { success: false, error: 'Could not open print window. Allow pop-ups for this page.' };
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${d?.receiptNumber || 'Print'}</title>
          <style>
            @page { margin: 2mm; size: 80mm auto; }
            * { box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 11px; width: 76mm; padding: 2mm; margin: 0; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .large { font-size: 14px; }
            .divider { border-top: 1px dashed #000; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { padding: 1px 2px; }
          </style>
        </head>
        <body>
          ${lines.join('\n')}
          <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 2000); };<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    return { success: true };
  }

  // Helper methods
  private textToBytes(text: string): number[] {
    return Array.from(text).map(c => c.charCodeAt(0));
  }

  private formatCurrency(amount: number): string {
    const currency = this.settings?.currency || 'KES';
    return currency + ' ' + amount.toFixed(2);
  }

  private padLine(left: string, mid: string, right: string, totalWidth: number): string {
    const midWidth = mid.length + 2;
    const rightWidth = right.length;
    const leftWidth = totalWidth - midWidth - rightWidth - 2;
    return (left + ' ').padEnd(Math.max(leftWidth, left.length + 1)) + mid.padStart(6) + right.padStart(12);
  }

  // Test print function
  async testPrint(): Promise<{ success: boolean; error?: string }> {
    if (!this.settings) {
      await this.loadSettings();
    }

    const testData: ReceiptData = {
      receiptNumber: 'TEST-' + Date.now(),
      saleDate: new Date().toISOString(),
      customerName: null,
      items: [
        { product_id: '1', product_name: 'Test Product', product_sku: 'TEST001', product_barcode: null, quantity: 1, unit_price: 100, discount_amount: 0, tax_amount: 16, line_total: 100 },
      ],
      subtotal: 100,
      discount: 0,
      tax: 16,
      total: 116,
      paid: 120,
      change: 4,
      paymentMethod: 'Cash'
    };

    return this.printReceipt(testData);
  }

  // Get current settings
  getSettings(): PrintSettings | null {
    return this.settings;
  }
}

export const printerService = new PrinterService();
