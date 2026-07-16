import { Component, signal, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { supabase } from '../../../core/services/supabase.service';

interface SalesSummary {
  todaySales: number;
  todayTransactions: number;
  weekSales: number;
  monthSales: number;
}

interface RecentSale {
  id: string;
  receipt_number: string;
  sale_date: string;
  total_amount: string;
  status: string;
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
              <span class="card-value">KES {{ animatedTodaySales() | number:'1.0-2' }}</span>
              <span class="card-sub">{{ summary().todayTransactions }} transactions</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon green">&#128200;</div>
            <div class="card-content">
              <span class="card-label">This Week</span>
              <span class="card-value">KES {{ animatedWeekSales() | number:'1.0-2' }}</span>
              <span class="card-sub">{{ summary().todayTransactions }} total orders</span>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon teal">&#128179;</div>
            <div class="card-content">
              <span class="card-label">This Month</span>
              <span class="card-value">KES {{ animatedMonthSales() | number:'1.0-2' }}</span>
              <span class="card-sub">Monthly revenue</span>
            </div>
          </div>

          <div class="summary-card clickable" routerLink="/products">
            <div class="card-icon orange">&#128230;</div>
            <div class="card-content">
              <span class="card-label">Low Stock Items</span>
              <span class="card-value" [class.warn]="lowStockItems().length > 0">{{ lowStockItems().length }}</span>
              <span class="card-sub link">View products &#8594;</span>
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
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (sale of recentSales(); track sale.id) {
                      <tr>
                        <td class="receipt-cell">{{ sale.receipt_number }}</td>
                        <td>{{ sale.sale_date | date:'short' }}</td>
                        <td class="amount-cell">KES {{ parseFloat(sale.total_amount) | number:'1.0-2' }}</td>
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

          <!-- Low Stock Alert -->
          <div class="dashboard-card alert-card">
            <div class="card-header">
              <h3>Low Stock Alert</h3>
              <a routerLink="/products" class="view-all">Manage &#8594;</a>
            </div>
            <div class="card-body">
              @if (lowStockItems().length > 0) {
                <div class="low-stock-list">
                  @for (item of lowStockItems().slice(0, 5); track item.sku) {
                    <div class="low-stock-item">
                      <div class="stock-info">
                        <span class="item-name">{{ item.name }}</span>
                        <span class="item-sku">{{ item.sku }}</span>
                      </div>
                      <div class="stock-level" [class.critical]="item.stock_quantity === 0" [class.warning]="item.stock_quantity > 0 && item.stock_quantity <= item.reorder_level">
                        {{ item.stock_quantity }} / {{ item.reorder_level }}
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state success">
                  <span class="empty-icon">&#10003;</span>
                  <p>All products are well stocked</p>
                </div>
              }
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="dashboard-card actions-card">
            <div class="card-header">
              <h3>Quick Actions</h3>
            </div>
            <div class="card-body">
              <div class="quick-actions">
                <a routerLink="/pos" class="quick-action">
                  <span class="action-icon blue">&#128722;</span>
                  <span>New Sale</span>
                </a>
                <a routerLink="/products" class="quick-action">
                  <span class="action-icon green">&#128230;</span>
                  <span>Products</span>
                </a>
                <a routerLink="/customers" class="quick-action">
                  <span class="action-icon teal">&#128101;</span>
                  <span>Customers</span>
                </a>
                <a routerLink="/sales" class="quick-action">
                  <span class="action-icon orange">&#128202;</span>
                  <span>Reports</span>
                </a>
              </div>
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
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  isLoading = signal(true);
  summary = signal<SalesSummary>({
    todaySales: 0,
    todayTransactions: 0,
    weekSales: 0,
    monthSales: 0
  });
  recentSales = signal<RecentSale[]>([]);
  topProducts = signal<TopProduct[]>([]);
  lowStockItems = signal<StockItem[]>([]);

  animatedTodaySales = signal(0);
  animatedWeekSales = signal(0);
  animatedMonthSales = signal(0);

  parseFloat = (value: string) => parseFloat(value) || 0;

  async ngOnInit(): Promise<void> {
    try {
      await this.loadDashboardData();
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  ngAfterViewInit(): void {
    this.animateCounters();
  }

  private animateCounters(): void {
    this.animateValue(this.animatedTodaySales, 0, this.summary().todaySales, 800);
    this.animateValue(this.animatedWeekSales, 0, this.summary().weekSales, 1000);
    this.animateValue(this.animatedMonthSales, 0, this.summary().monthSales, 1200);
  }

  private animateValue(target: import('@angular/core').WritableSignal<number>, start: number, end: number, duration: number): void {
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      target.set(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  async loadDashboardData(): Promise<void> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [todayData, weekData, monthData] = await Promise.all([
      supabase.from('sales').select('total_amount').gte('sale_date', startOfDay),
      supabase.from('sales').select('total_amount').gte('sale_date', startOfWeek),
      supabase.from('sales').select('total_amount').gte('sale_date', startOfMonth)
    ]);

    this.summary.set({
      todaySales: todayData.data?.reduce((sum: number, s: { total_amount: string }) => sum + parseFloat(s.total_amount), 0) || 0,
      todayTransactions: todayData.data?.length || 0,
      weekSales: weekData.data?.reduce((sum: number, s: { total_amount: string }) => sum + parseFloat(s.total_amount), 0) || 0,
      monthSales: monthData.data?.reduce((sum: number, s: { total_amount: string }) => sum + parseFloat(s.total_amount), 0) || 0
    });

    const { data: recentData } = await supabase
      .from('sales')
      .select('id, receipt_number, sale_date, total_amount, status')
      .order('sale_date', { ascending: false })
      .limit(10);

    this.recentSales.set(recentData || []);

    const { data: topData } = await supabase
      .from('sale_items')
      .select('product_name, quantity, line_total')
      .order('quantity', { ascending: false })
      .limit(5);

    const aggregated: Record<string, TopProduct> = {};
    (topData || []).forEach((item: { product_name: string; quantity: string; line_total: string }) => {
      if (!aggregated[item.product_name]) {
        aggregated[item.product_name] = { product_name: item.product_name, quantity: 0, total: 0 };
      }
      aggregated[item.product_name].quantity += parseFloat(item.quantity);
      aggregated[item.product_name].total += parseFloat(item.line_total);
    });

    this.topProducts.set(Object.values(aggregated).sort((a, b) => b.total - a.total));

    const { data: stockData } = await supabase
      .from('products')
      .select('name, sku, reorder_level, stock_levels(quantity)')
      .eq('is_active', true)
      .eq('is_deleted', false);

    const lowStock = (stockData || [])
      .filter((p: any) => {
        const qty = p.stock_levels?.[0]?.quantity || 0;
        return qty <= p.reorder_level;
      })
      .map((p: any) => ({
        name: p.name,
        sku: p.sku,
        stock_quantity: p.stock_levels?.[0]?.quantity || 0,
        reorder_level: p.reorder_level
      }));

    this.lowStockItems.set(lowStock);
  }
}
