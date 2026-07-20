import { Component, signal, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { posService } from '../../../core/services/pos.service';
import { Subscription } from 'rxjs';

interface SalesSummary {
  todaySales: number;
  todayTransactions: number;
  weekSales: number;
  monthSales: number;
  customersServed: number;
  productsSold: number;
  cashSales: number;
  mpesaSales: number;
  cardSales: number;
  bankSales: number;
}

interface PaymentSummary {
  cashTotal: number; cashCount: number;
  mpesaTotal: number; mpesaCount: number;
  cardTotal: number; cardCount: number;
  bankTotal: number; bankCount: number;
  creditTotal: number; creditCount: number;
  grandTotal: number;
}

interface RecentSale {
  id: string;
  receipt_number: string;
  sale_date: string;
  total_amount: string;
  status: string;
  paymentMethod: string;
}

interface TopProduct {
  product_name: string;
  quantity: number;
  total: number;
}

interface StockItem {
  name: string;
  sku: string;
  stock_quantity: number;
  reorder_level: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <header class="page-header anim-fade-in-down">
        <div>
          <h1>Dashboard</h1>
          <p class="subtitle">Welcome back to ERICKO POS</p>
        </div>
        <div class="header-actions">
          <a routerLink="/pos" class="btn-primary">
            <span class="btn-icon">&#128722;</span> New Sale
          </a>
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading dashboard...</span>
        </div>
      } @else {
        <!-- Summary Cards -->
        <div class="summary-cards stagger">
          <div class="summary-card" [class.glow]="summary().todaySales > 0">
            <div class="card-icon blue">&#128176;</div>
            <div class="card-content">
              <span class="card-label">Today's Sales</span>
              <span class="card-value">KES {{ summary().todaySales | number:'1.0-2' }}</span>
              <span class="card-sub">{{ summary().todayTransactions }} transactions</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="card-icon green">&#128181;</div>
            <div class="card-content">
              <span class="card-label">Cash Sales</span>
              <span class="card-value">KES {{ summary().cashSales | number:'1.0-2' }}</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon green">&#128241;</div>
            <div class="card-content">
              <span class="card-label">M-Pesa Sales</span>
              <span class="card-value">KES {{ summary().mpesaSales | number:'1.0-2' }}</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon teal">&#128179;</div>
            <div class="card-content">
              <span class="card-label">Card & Bank</span>
              <span class="card-value">KES {{ (summary().cardSales + summary().bankSales) | number:'1.0-2' }}</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon orange">&#128101;</div>
            <div class="card-content">
              <span class="card-label">Customers Served</span>
              <span class="card-value">{{ summary().customersServed }}</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="card-icon blue">&#128230;</div>
            <div class="card-content">
              <span class="card-label">Products Sold</span>
              <span class="card-value">{{ summary().productsSold }}</span>
            </div>
          </div>
        </div>

        <!-- Real-Time Payment Summary Section -->
        <div class="dashboard-card payment-summary anim-fade-in-up" style="margin-bottom: 1.5rem;">
          <div class="card-header">
            <h3>Real-Time Payment Summary (Today)</h3>
            <span class="live-indicator"><span class="pulse"></span> Live</span>
          </div>
          <div class="card-body">
            <div class="payment-grid">
              <div class="payment-stat">
                <span class="p-label">💵 Cash</span>
                <span class="p-value">KES {{ payments().cashTotal | number:'1.0-2' }}</span>
                <span class="p-count">{{ payments().cashCount }} txns</span>
              </div>
              <div class="payment-stat">
                <span class="p-label">📱 M-Pesa</span>
                <span class="p-value">KES {{ payments().mpesaTotal | number:'1.0-2' }}</span>
                <span class="p-count">{{ payments().mpesaCount }} txns</span>
              </div>
              <div class="payment-stat">
                <span class="p-label">💳 Card</span>
                <span class="p-value">KES {{ payments().cardTotal | number:'1.0-2' }}</span>
                <span class="p-count">{{ payments().cardCount }} txns</span>
              </div>
              <div class="payment-stat">
                <span class="p-label">🏦 Bank</span>
                <span class="p-value">KES {{ payments().bankTotal | number:'1.0-2' }}</span>
                <span class="p-count">{{ payments().bankCount }} txns</span>
              </div>
              <div class="payment-stat">
                <span class="p-label">📒 Credit Sales</span>
                <span class="p-value">KES {{ payments().creditTotal | number:'1.0-2' }}</span>
                <span class="p-count">{{ payments().creditCount }} txns</span>
              </div>
              <div class="payment-stat grand-total">
                <span class="p-label">Grand Total</span>
                <span class="p-value">KES {{ payments().grandTotal | number:'1.0-2' }}</span>
                <span class="p-count">All Methods</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="dashboard-grid stagger">
          <!-- Recent Sales -->
          <div class="dashboard-card sales-card">
            <div class="card-header">
              <h3>Recent Sales</h3>
              <a routerLink="/sales" class="view-all">View All &#8594;</a>
            </div>
            <div class="card-body">
              @if (recentSales().length > 0) {
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Receipt</th>
                      <th>Time</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (sale of recentSales(); track sale.id) {
                      <tr>
                        <td class="receipt-cell">{{ sale.receipt_number }}</td>
                        <td>{{ sale.sale_date }}</td>
                        <td class="amount-cell">KES {{ parseFloat(sale.total_amount) | number:'1.0-2' }}</td>
                        <td>{{ sale.paymentMethod }}</td>
                        <td>
                          <span class="status-badge" [class.completed]="sale.status === 'completed'" [class.voided]="sale.status === 'voided'">
                            {{ sale.status }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <div class="empty-state">
                  <span class="empty-icon">&#128179;</span>
                  <p>No sales yet today</p>
                </div>
              }
            </div>
          </div>

          <!-- Top Products -->
          <div class="dashboard-card">
            <div class="card-header">
              <h3>Top Selling Products</h3>
            </div>
            <div class="card-body">
              @if (topProducts().length > 0) {
                <div class="top-products-list">
                  @for (product of topProducts(); track product.product_name; let i = $index) {
                    <div class="top-product-item">
                      <span class="rank" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">{{ i + 1 }}</span>
                      <div class="product-details">
                        <span class="product-name">{{ product.product_name }}</span>
                        <span class="product-qty">{{ product.quantity }} sold</span>
                      </div>
                      <span class="product-total">KES {{ product.total | number:'1.0-2' }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <p>No product data yet</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard {
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
      font-weight: 700;
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
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(8, 145, 178, 0.3);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #0e7490, #155e75);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(8, 145, 178, 0.4);
    }

    .btn-icon {
      font-size: 1rem;
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
      width: 36px;
      height: 36px;
      border: 3px solid #334155;
      border-top-color: #22d3ee;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .summary-card {
      background: #1e293b;
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      border: 1px solid #334155;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .summary-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, #22d3ee, transparent);
      transform: translateX(-100%);
      transition: transform 0.6s;
    }

    .summary-card:hover {
      border-color: #475569;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .summary-card:hover::after {
      transform: translateX(100%);
    }

    .summary-card.glow {
      border-color: rgba(34, 211, 238, 0.3);
      box-shadow: 0 0 20px rgba(34, 211, 238, 0.1);
    }

    .summary-card.clickable {
      cursor: pointer;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.75rem;
      font-size: 1.5rem;
      flex-shrink: 0;
      transition: transform 0.2s;
    }

    .summary-card:hover .card-icon {
      transform: scale(1.1);
    }

    .card-icon.blue { background: #1e3a5f; }
    .card-icon.green { background: #14532d; }
    .card-icon.teal { background: #164e63; }
    .card-icon.orange { background: #7c2d12; }

    .card-content {
      display: flex;
      flex-direction: column;
    }

    .card-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .card-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #e2e8f0;
      margin: 0.125rem 0;
    }

    .card-value.warn {
      color: #f59e0b;
    }

    .card-sub {
      font-size: 0.75rem;
      color: #64748b;
    }

    .card-sub.link {
      color: #22d3ee;
    }

    /* Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    @media (max-width: 1024px) {
      .dashboard-grid { grid-template-columns: 1fr; }
    }

    .dashboard-card {
      background: #1e293b;
      border-radius: 0.75rem;
      border: 1px solid #334155;
      transition: border-color 0.2s;
    }

    .dashboard-card:hover {
      border-color: #475569;
    }

    .sales-card { grid-column: span 2; }

    @media (max-width: 1024px) {
      .sales-card { grid-column: span 1; }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #334155;
    }

    .card-header h3 {
      margin: 0;
      font-size: 1rem;
      color: #e2e8f0;
      font-weight: 600;
    }

    .view-all {
      font-size: 0.75rem;
      color: #22d3ee;
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .view-all:hover {
      opacity: 0.8;
    }

    .card-body { padding: 1rem; }

    /* Data Table */
    .data-table { width: 100%; border-collapse: collapse; }

    .data-table th {
      text-align: left;
      padding: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      border-bottom: 1px solid #334155;
    }

    .data-table td {
      padding: 0.75rem 0.5rem;
      font-size: 0.875rem;
      color: #e2e8f0;
      border-bottom: 1px solid #334155;
      transition: background 0.15s;
    }

    .data-table tbody tr:hover td {
      background: rgba(51, 65, 85, 0.3);
    }

    .receipt-cell { font-family: monospace; color: #22d3ee; }
    .amount-cell { font-weight: 600; }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      background: #334155;
      color: #94a3b8;
    }

    .status-badge.completed { background: #14532d; color: #86efac; }
    .status-badge.voided { background: #7f1d1d; color: #fecaca; }

    /* Top Products */
    .top-products-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .top-product-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: #0f172a;
      border-radius: 0.5rem;
      transition: transform 0.15s;
    }

    .top-product-item:hover {
      transform: translateX(4px);
    }

    .rank {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0891b2;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .rank.gold { background: #d97706; }
    .rank.silver { background: #475569; }
    .rank.bronze { background: #92400e; }

    .product-details { flex: 1; display: flex; flex-direction: column; }
    .product-name { font-size: 0.875rem; color: #e2e8f0; }
    .product-qty { font-size: 0.75rem; color: #64748b; }
    .product-total { font-size: 0.875rem; font-weight: 600; color: #22d3ee; }

    /* Low Stock */
    .low-stock-list { display: flex; flex-direction: column; gap: 0.5rem; }

    .low-stock-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 0.5rem;
      transition: transform 0.15s;
    }

    .low-stock-item:hover { transform: translateX(4px); }

    .stock-info { display: flex; flex-direction: column; }
    .item-name { font-size: 0.875rem; color: #e2e8f0; }
    .item-sku { font-size: 0.75rem; color: #64748b; font-family: monospace; }

    .stock-level {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .stock-level.warning { background: #f59e0b; color: #1e293b; }
    .stock-level.critical { background: #ef4444; color: white; }

    /* Quick Actions */
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
    }

    @media (max-width: 640px) {
      .quick-actions { grid-template-columns: repeat(2, 1fr); }
    }

    .quick-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #0f172a;
      border-radius: 0.5rem;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;
    }

    .quick-action:hover {
      background: #334155;
      transform: translateY(-3px);
      border-color: #475569;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .action-icon {
      font-size: 1.5rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      transition: transform 0.2s;
    }

    .quick-action:hover .action-icon { transform: scale(1.1); }
    .action-icon.blue { background: #1e3a5f; }
    .action-icon.green { background: #14532d; }
    .action-icon.teal { background: #164e63; }
    .action-icon.orange { background: #7c2d12; }

    .quick-action span:last-child {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: #64748b;
    }

    .empty-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .empty-state.success .empty-icon { color: #22c55e; }
    
    /* Payment Summary */
    .payment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }
    .payment-stat {
      background: #0f172a;
      padding: 1rem;
      border-radius: 0.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1px solid #334155;
    }
    .payment-stat.grand-total {
      background: linear-gradient(135deg, #1e3a8a, #312e81);
      border-color: #4f46e5;
    }
    .p-label { font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.5rem; font-weight: 600; }
    .p-value { font-size: 1.25rem; color: #fff; font-weight: bold; margin-bottom: 0.25rem; }
    .p-count { font-size: 0.75rem; color: #64748b; }
    
    .live-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #10b981;
      font-weight: bold;
      background: rgba(16, 185, 129, 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: 1rem;
    }
    .pulse {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  isLoading = signal(true);
  summary = signal<SalesSummary>({
    todaySales: 0, todayTransactions: 0, weekSales: 0, monthSales: 0,
    customersServed: 0, productsSold: 0, cashSales: 0, mpesaSales: 0, cardSales: 0, bankSales: 0
  });
  
  payments = signal<PaymentSummary>({
    cashTotal: 0, cashCount: 0, mpesaTotal: 0, mpesaCount: 0,
    cardTotal: 0, cardCount: 0, bankTotal: 0, bankCount: 0,
    creditTotal: 0, creditCount: 0, grandTotal: 0
  });

  recentSales = signal<RecentSale[]>([]);
  topProducts = signal<TopProduct[]>([]);
  lowStockItems = signal<StockItem[]>([]);
  parseFloat = (value: string) => parseFloat(value) || 0;
  
  private syncSub?: Subscription;

  ngOnInit(): void {
    this.loadDashboardData();
    
    // Subscribe to local reactive updates (same tab)
    this.syncSub = posService.saleCompleted$.subscribe(() => {
      if (!this.isLoading()) this.loadDashboardData();
    });
    
    // Subscribe to storage events (cross tab)
    window.addEventListener('storage', this.handleStorageEvent);
    this.isLoading.set(false);
  }

  ngOnDestroy(): void {
    this.syncSub?.unsubscribe();
    window.removeEventListener('storage', this.handleStorageEvent);
  }
  
  private handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'ericko_pos_sales') {
      this.loadDashboardData();
    }
  };

  loadDashboardData(): void {
    try {
      const rawSales = localStorage.getItem('ericko_pos_sales');
      const sales: any[] = rawSales ? JSON.parse(rawSales) : [];
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      let todaySales = 0, weekSales = 0, monthSales = 0;
      let cashSales = 0, mpesaSales = 0, cardSales = 0, bankSales = 0, creditSales = 0;
      let cashCount = 0, mpesaCount = 0, cardCount = 0, bankCount = 0, creditCount = 0;
      let productsSold = 0;
      const customersToday = new Set<string>();

      const todaySalesList = [];

      for (const sale of sales) {
        if (sale.status !== 'completed') continue;
        const d = new Date(sale.sale_date);
        const total = parseFloat(sale.total_amount) || 0;
        
        if (d >= startOfMonth) monthSales += total;
        if (d >= startOfWeek) weekSales += total;
        
        if (d >= startOfDay) {
          todaySales += total;
          todaySalesList.push(sale);
          if (sale.customer_id) customersToday.add(sale.customer_id);
          
          (sale.items || []).forEach((item: any) => {
            productsSold += parseFloat(item.quantity) || 0;
          });
          
          // Payment method breakdown
          (sale.payments || []).forEach((p: any) => {
            const amt = parseFloat(p.amount) || 0;
            if (p.payment_method_id === '1' || String(p.payment_method_id).toUpperCase() === 'CASH') { cashSales += amt; cashCount++; }
            if (p.payment_method_id === '2' || String(p.payment_method_id).toUpperCase() === 'MPESA') { mpesaSales += amt; mpesaCount++; }
            if (p.payment_method_id === '3' || String(p.payment_method_id).toUpperCase() === 'CARD') { cardSales += amt; cardCount++; }
            if (p.payment_method_id === '4' || String(p.payment_method_id).toUpperCase() === 'BANK') { bankSales += amt; bankCount++; }
            if (p.payment_method_id === '5' || String(p.payment_method_id).toUpperCase() === 'CREDIT') { creditSales += amt; creditCount++; }
          });
        }
      }

      this.summary.set({
        todaySales, weekSales, monthSales,
        todayTransactions: todaySalesList.length,
        customersServed: customersToday.size,
        productsSold, cashSales, mpesaSales, cardSales, bankSales
      });
      
      this.payments.set({
        cashTotal: cashSales, cashCount,
        mpesaTotal: mpesaSales, mpesaCount,
        cardTotal: cardSales, cardCount,
        bankTotal: bankSales, bankCount,
        creditTotal: creditSales, creditCount,
        grandTotal: todaySales
      });

      // Recent Sales (Today Only)
      const salesTodayAll = sales.filter(s => new Date(s.sale_date) >= startOfDay);
      const sorted = [...salesTodayAll].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
      this.recentSales.set(sorted.slice(0, 10).map(s => ({
        id: s.id,
        receipt_number: s.receipt_number,
        sale_date: posService.formatTimestamp(s.sale_date),
        total_amount: s.total_amount,
        status: s.status,
        paymentMethod: s.payments?.[0]?.payment_method_id || 'Cash'
      })));

      // Top Products (Today Only)
      const productAgg: Record<string, TopProduct> = {};
      todaySalesList.forEach(sale => {
        (sale.items || []).forEach((item: any) => {
          if (!productAgg[item.product_name]) {
            productAgg[item.product_name] = { product_name: item.product_name, quantity: 0, total: 0 };
          }
          productAgg[item.product_name].quantity += parseFloat(item.quantity) || 0;
          productAgg[item.product_name].total += parseFloat(item.line_total) || 0;
        });
      });
      this.topProducts.set(Object.values(productAgg).sort((a, b) => b.total - a.total).slice(0, 5));

    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  }
}
