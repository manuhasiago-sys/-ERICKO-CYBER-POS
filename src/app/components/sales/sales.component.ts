import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { supabase } from '../../../core/services/supabase.service';
import { printerService } from '../../../core/services/printer.service';
import { ToastService } from '../../../core/services/toast.service';

interface SaleRow {
  id: string;
  receipt_number: string;
  sale_date: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
  change_amount: string;
  status: string;
  notes: string | null;
  customers: { first_name: string; last_name: string } | null;
  branches: { name: string } | null;
}

interface SaleItemRow {
  product_name: string;
  quantity: string;
  unit_price: string;
  line_total: string;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="sales-page">
      <header class="page-header">
        <div>
          <h1>Sales</h1>
          <p class="subtitle">View and manage sales transactions</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" routerLink="/pos">
            <span>&#128722;</span> New Sale
          </button>
        </div>
      </header>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-input">
          <input
            type="text"
            placeholder="Search by receipt number..."
            [value]="searchQuery()"
            (input)="onSearch($event)"
          />
        </div>
        <input type="date" [value]="dateFrom()" (input)="onDateFrom($event)" class="date-input" />
        <input type="date" [value]="dateTo()" (input)="onDateTo($event)" class="date-input" />
        <select [value]="statusFilter()" (change)="onStatusFilter($event)" class="filter-select">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="voided">Voided</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <!-- Summary Cards -->
      <div class="summary-row">
        <div class="summary-card">
          <span class="summary-label">Total Sales</span>
          <span class="summary-value">KES {{ totalSales() | number:'1.0-2' }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Transactions</span>
          <span class="summary-value">{{ filteredSales().length }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Avg Transaction</span>
          <span class="summary-value">KES {{ averageSale() | number:'1.0-2' }}</span>
        </div>
      </div>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading sales...</span>
        </div>
      } @else {
        <!-- Sales Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Branch</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (sale of filteredSales(); track sale.id) {
                <tr>
                  <td class="receipt-cell">{{ sale.receipt_number }}</td>
                  <td>{{ sale.sale_date | date:'short' }}</td>
                  <td>{{ sale.branches?.name || '-' }}</td>
                  <td>
                    @if (sale.customers) {
                      {{ sale.customers.first_name }} {{ sale.customers.last_name }}
                    } @else {
                      <span class="text-muted">Walk-in</span>
                    }
                  </td>
                  <td class="items-cell">
                    <button class="items-btn" (click)="viewSaleDetails(sale)">
                      View Items
                    </button>
                  </td>
                  <td class="amount-cell">KES {{ parseFloat(sale.total_amount) | number:'1.0-2' }}</td>
                  <td class="amount-cell">KES {{ parseFloat(sale.amount_paid) | number:'1.0-2' }}</td>
                  <td>
                    <span class="status-badge" [class.completed]="sale.status === 'completed'" [class.voided]="sale.status === 'voided'" [class.refunded]="sale.status === 'refunded'">
                      {{ sale.status }}
                    </span>
                  </td>
                  <td>
                    <button class="action-btn" (click)="viewSaleDetails(sale)">&#128196;</button>
                    @if (sale.status === 'completed') {
                      <button class="action-btn void" (click)="voidSale(sale)">&#10060;</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="empty-cell">
                    <div class="empty-state">
                      <span class="empty-icon">&#128179;</span>
                      <p>No sales found</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer">
          <span>Showing {{ filteredSales().length }} of {{ sales().length }} sales</span>
        </div>
      }
    </div>

    <!-- Sale Details Modal -->
    @if (showDetailsModal()) {
      <div class="modal-overlay" (click)="closeDetailsModal()">
        <div class="details-modal anim-scale-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Sale Details</h2>
            <button class="close-btn" (click)="closeDetailsModal()">&#215;</button>
          </div>
          <div class="modal-body">
            <div class="sale-header">
              <div class="receipt-info">
                <span class="receipt-number">{{ selectedSale()?.receipt_number }}</span>
                <span class="sale-date">{{ selectedSale()?.sale_date | date:'medium' }}</span>
              </div>
              <span class="status-badge large" [class.completed]="selectedSale()?.status === 'completed'">
                {{ selectedSale()?.status }}
              </span>
            </div>

            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Branch</span>
                <span class="value">{{ selectedSale()?.branches?.name || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Customer</span>
                <span class="value">
                  @if (selectedSale()?.customers) {
                    {{ selectedSale()!.customers!.first_name }} {{ selectedSale()!.customers!.last_name }}
                  } @else {
                    Walk-in
                  }
                </span>
              </div>
            </div>

            <h4>Items</h4>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                @for (item of saleItems(); track item.product_name) {
                  <tr>
                    <td>{{ item.product_name }}</td>
                    <td>{{ parseFloat(item.quantity) }}</td>
                    <td>KES {{ parseFloat(item.unit_price) | number:'1.0-2' }}</td>
                    <td>KES {{ parseFloat(item.line_total) | number:'1.0-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>

            <div class="sale-summary">
              <div class="summary-line">
                <span>Subtotal</span>
                <span>KES {{ parseFloat(selectedSale()?.subtotal || '0') | number:'1.0-2' }}</span>
              </div>
              @if (parseFloat(selectedSale()?.discount_amount || '0') > 0) {
                <div class="summary-line discount">
                  <span>Discount</span>
                  <span>-KES {{ parseFloat(selectedSale()?.discount_amount || '0') | number:'1.0-2' }}</span>
                </div>
              }
              <div class="summary-line">
                <span>Tax</span>
                <span>KES {{ parseFloat(selectedSale()?.tax_amount || '0') | number:'1.0-2' }}</span>
              </div>
              <div class="summary-line total">
                <span>Total</span>
                <span>KES {{ parseFloat(selectedSale()?.total_amount || '0') | number:'1.0-2' }}</span>
              </div>
              <div class="summary-line">
                <span>Paid</span>
                <span>KES {{ parseFloat(selectedSale()?.amount_paid || '0') | number:'1.0-2' }}</span>
              </div>
              @if (parseFloat(selectedSale()?.change_amount || '0') > 0) {
                <div class="summary-line">
                  <span>Change</span>
                  <span>KES {{ parseFloat(selectedSale()?.change_amount || '0') | number:'1.0-2' }}</span>
                </div>
              }
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-print" (click)="printSaleReceipt()" [disabled]="isPrinting()">
              {{ isPrinting() ? 'Printing...' : 'Print Receipt' }}
            </button>
            <button class="btn-close" (click)="closeDetailsModal()">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .sales-page {
      padding: 1.5rem;
      overflow-y: auto;
      height: 100%;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.75rem;
      color: #e2e8f0;
    }

    .subtitle {
      margin: 0.25rem 0 0;
      color: #64748b;
      font-size: 0.875rem;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      color: white;
      text-decoration: none;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(8, 145, 178, 0.3);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #0e7490, #155e75);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(8, 145, 178, 0.4);
    }

    /* Filters */
    .filters-bar {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      max-width: 300px;
    }

    .search-input input, .date-input, .filter-select {
      width: 100%;
      padding: 0.625rem 1rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.875rem;
    }

    .date-input, .filter-select {
      width: auto;
      min-width: 140px;
    }

    /* Summary */
    .summary-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .summary-card {
      background: #1e293b;
      padding: 1rem 1.25rem;
      border-radius: 0.5rem;
      border: 1px solid #334155;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .summary-card:hover {
      border-color: #475569;
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .summary-label {
      display: block;
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 0.25rem;
    }

    .summary-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #22d3ee;
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      gap: 1rem;
      color: #64748b;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #334155;
      border-top-color: #22d3ee;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Table */
    .table-container {
      background: #1e293b;
      border-radius: 0.75rem;
      border: 1px solid #334155;
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      text-align: left;
      padding: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      background: #0f172a;
      border-bottom: 1px solid #334155;
    }

    .data-table tbody tr {
      transition: background 0.15s;
    }

    .data-table tbody tr:hover td {
      background: rgba(51, 65, 85, 0.3);
    }

    .data-table td {
      padding: 1rem;
      font-size: 0.875rem;
      color: #e2e8f0;
      border-bottom: 1px solid #334155;
    }

    .receipt-cell {
      font-family: monospace;
      color: #22d3ee;
    }

    .amount-cell {
      font-weight: 600;
    }

    .items-btn {
      padding: 0.25rem 0.5rem;
      background: #334155;
      border: none;
      border-radius: 0.25rem;
      color: #94a3b8;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .items-btn:hover {
      background: #475569;
      color: #e2e8f0;
    }

    .text-muted {
      color: #64748b;
      font-style: italic;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      background: #334155;
      color: #94a3b8;
    }

    .status-badge.completed {
      background: #14532d;
      color: #86efac;
    }

    .status-badge.voided {
      background: #7f1d1d;
      color: #fecaca;
    }

    .status-badge.refunded {
      background: #7c2d12;
      color: #fed7aa;
    }

    .status-badge.large {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #334155;
      border: none;
      border-radius: 0.375rem;
      color: #e2e8f0;
      cursor: pointer;
      margin-right: 0.25rem;
    }

    .action-btn:hover {
      background: #475569;
    }

    .action-btn.void:hover {
      background: #7f1d1d;
      color: #fecaca;
    }

    .empty-cell {
      padding: 3rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: #64748b;
    }

    .empty-icon {
      font-size: 2rem;
    }

    .table-footer {
      margin-top: 1rem;
      color: #64748b;
      font-size: 0.75rem;
    }

    /* Details Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .details-modal {
      background: #1e293b;
      border-radius: 1rem;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #334155;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #e2e8f0;
    }

    .close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.5rem;
      cursor: pointer;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .sale-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .receipt-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .receipt-number {
      font-size: 1.125rem;
      font-weight: 700;
      color: #22d3ee;
      font-family: monospace;
    }

    .sale-date {
      font-size: 0.75rem;
      color: #64748b;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item .label {
      font-size: 0.75rem;
      color: #64748b;
    }

    .detail-item .value {
      font-size: 0.875rem;
      color: #e2e8f0;
    }

    h4 {
      margin: 0 0 0.75rem;
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5rem;
    }

    .items-table th, .items-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #334155;
    }

    .items-table th {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
    }

    .items-table td {
      font-size: 0.875rem;
      color: #e2e8f0;
    }

    .sale-summary {
      border-top: 2px solid #334155;
      padding-top: 1rem;
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .summary-line.discount {
      color: #22c55e;
    }

    .summary-line.total {
      font-size: 1.125rem;
      font-weight: 700;
      color: #e2e8f0;
      padding-top: 0.75rem;
      border-top: 1px solid #334155;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #334155;
    }

    .btn-print {
      flex: 1;
      padding: 0.75rem;
      background: #14532d;
      color: #86efac;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .btn-print:hover:not(:disabled) {
      background: #166534;
    }

    .btn-print:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-close {
      flex: 1;
      padding: 0.75rem;
      background: #334155;
      color: #e2e8f0;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .btn-close:hover {
      background: #475569;
    }
  `]
})
export class SalesComponent implements OnInit {
  private toast = inject(ToastService);
  isLoading = signal(true);
  isPrinting = signal(false);
  sales = signal<SaleRow[]>([]);
  filteredSales = signal<SaleRow[]>([]);
  searchQuery = signal('');
  dateFrom = signal('');
  dateTo = signal('');
  statusFilter = signal('');
  showDetailsModal = signal(false);
  selectedSale = signal<SaleRow | null>(null);
  saleItems = signal<SaleItemRow[]>([]);

  totalSales = signal(0);
  averageSale = signal(0);

  async ngOnInit(): Promise<void> {
    // Set default date range to last 30 days
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    this.dateFrom.set(from.toISOString().slice(0, 10));
    this.dateTo.set(today.toISOString().slice(0, 10));

    try {
      await this.loadSales();
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadSales(): Promise<void> {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id, receipt_number, sale_date, subtotal, discount_amount, tax_amount,
        total_amount, amount_paid, change_amount, status, notes,
        customers(first_name, last_name),
        branches(name)
      `)
      .order('sale_date', { ascending: false })
      .limit(100);

    if (error) throw error;
    this.sales.set(data as unknown as SaleRow[] || []);
    this.applyFilters();
    this.calculateTotals();
  }

  parseFloat(value: string | undefined): number {
    if (!value) return 0;
    return parseFloat(value) || 0;
  }

  applyFilters(): void {
    let filtered = this.sales();
    const query = this.searchQuery().toLowerCase();
    const fromDate = this.dateFrom();
    const toDate = this.dateTo();
    const status = this.statusFilter();

    if (query) {
      filtered = filtered.filter(s => s.receipt_number.toLowerCase().includes(query));
    }

    if (fromDate) {
      filtered = filtered.filter(s => s.sale_date >= fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      filtered = filtered.filter(s => s.sale_date < endDate.toISOString());
    }

    if (status) {
      filtered = filtered.filter(s => s.status === status);
    }

    this.filteredSales.set(filtered);
  }

  calculateTotals(): void {
    const total = this.filteredSales().reduce((sum, s) => sum + this.parseFloat(s.total_amount), 0);
    this.totalSales.set(total);

    const count = this.filteredSales().length;
    this.averageSale.set(count > 0 ? total / count : 0);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.applyFilters();
    this.calculateTotals();
  }

  onDateFrom(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
    this.applyFilters();
    this.calculateTotals();
  }

  onDateTo(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
    this.applyFilters();
    this.calculateTotals();
  }

  onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.applyFilters();
    this.calculateTotals();
  }

  async viewSaleDetails(sale: SaleRow): Promise<void> {
    this.selectedSale.set(sale);

    const { data } = await supabase
      .from('sale_items')
      .select('product_name, quantity, unit_price, line_total')
      .eq('sale_id', sale.id);

    this.saleItems.set(data || []);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedSale.set(null);
    this.saleItems.set([]);
  }

  async printSaleReceipt(): Promise<void> {
    const sale = this.selectedSale();
    if (!sale) return;

    this.isPrinting.set(true);
    try {
      await printerService.loadSettings();

      const items = this.saleItems().map(item => ({
        product_id: '',
        product_name: item.product_name,
        product_sku: '',
        product_barcode: null,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        discount_amount: 0,
        tax_amount: 0,
        line_total: parseFloat(item.line_total)
      }));

      const result = await printerService.printReceipt({
        receiptNumber: sale.receipt_number,
        saleDate: sale.sale_date,
        customerName: sale.customers ? `${sale.customers.first_name} ${sale.customers.last_name}` : null,
        items,
        subtotal: parseFloat(sale.subtotal),
        discount: parseFloat(sale.discount_amount),
        tax: parseFloat(sale.tax_amount),
        total: parseFloat(sale.total_amount),
        paid: parseFloat(sale.amount_paid),
        change: parseFloat(sale.change_amount),
        paymentMethod: 'Receipt Reprint',
        servedBy: null
      });
      if (!result.success) {
        this.toast.warning('Printer not reachable. Check printer settings.');
      } else {
        this.toast.success('Receipt sent to printer!');
      }
    } finally {
      this.isPrinting.set(false);
    }
  }

  async voidSale(sale: SaleRow): Promise<void> {
    if (!confirm(`Void sale ${sale.receipt_number}? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('sales')
        .update({ status: 'voided' })
        .eq('id', sale.id);

      if (error) throw error;
      await this.loadSales();
      this.toast.success(`Sale ${sale.receipt_number} voided successfully!`);
    } catch (error: any) {
      this.toast.error(`Failed to void sale: ${error.message}`);
    }
  }
}
