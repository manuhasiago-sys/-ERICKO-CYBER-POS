import { ProductWithStock, Category } from '../models/product.model';
import { CartItem, PaymentMethod, Customer, Branch, Terminal, SystemSetting } from '../models/sale.model';

const API_BASE_URL = 'http://localhost/Ericko-Enterprise-POS-main/api';

export class PosService {
  private branch: Branch | null = { id: 'dummy-branch', code: 'B01', name: 'Main Branch', is_active: true, address: null, phone: null, is_head_office: true };
  private terminal: Terminal | null = { id: 'dummy-term', branch_id: 'dummy-branch', code: 'T01', name: 'Terminal 1', is_active: true };
  private warehouseId: string | null = 'dummy-wh';
  private settings: Map<string, string> = new Map([['receipt_prefix', 'REC']]);

  async initialize(): Promise<void> {
    // Mocked for simplicity
  }

  getSetting(key: string): string {
    return this.settings.get(key) || '';
  }

  getCurrentBranch(): Branch | null {
    return this.branch;
  }

  getCurrentTerminal(): Terminal | null {
    return this.terminal;
  }

  getWarehouseId(): string | null {
    return this.warehouseId;
  }

  async getCategories(): Promise<Category[]> {
    try {
      const raw = localStorage.getItem('ericko_pos_categories');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async addCategory(category: Partial<Category>): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/categories.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category)
    });
    if (!res.ok) throw new Error('Failed to add category');
    return await res.json();
  }

  async getProducts(categoryId?: string): Promise<ProductWithStock[]> {
    try {
      const raw = localStorage.getItem('ericko_pos_products');
      const products: any[] = raw ? JSON.parse(raw) : [];
      return products
        .filter(p => p.is_active !== false)
        .map(p => ({
          ...p,
          cost_price: parseFloat(p.cost_price) || 0,
          selling_price: parseFloat(p.selling_price) || 0,
          stock_quantity: parseFloat(p.stock_levels?.[0]?.quantity || '0') || 100
        }));
    } catch { return []; }
  }

  async searchProducts(query: string): Promise<ProductWithStock[]> {
    const products = await this.getProducts();
    const q = query.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }

  async getProductByBarcode(barcode: string): Promise<ProductWithStock | null> {
    const products = await this.getProducts();
    return products.find(p => p.barcode === barcode) || null;
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return [
      { id: '1', name: 'Cash', code: 'CASH', is_active: true, requires_reference: false },
      { id: '2', name: 'M-Pesa', code: 'MPESA', is_active: true, requires_reference: true }
    ];
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const raw = localStorage.getItem('ericko_pos_customers');
      const customers: Customer[] = raw ? JSON.parse(raw) : [];
      const q = query.toLowerCase();
      return customers.filter(c =>
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    } catch { return []; }
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    try {
      const raw = localStorage.getItem('ericko_pos_customers');
      const customers: Customer[] = raw ? JSON.parse(raw) : [];
      return customers.find(c => c.phone === phone) || null;
    } catch { return null; }
  }

  async createSale(
    items: CartItem[],
    payments: { payment_method_id: string; amount: number; reference_number?: string }[],
    customerId?: string,
    discountAmount: number = 0,
    notes?: string
  ): Promise<{ receipt_number: string; total: number }> {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = subtotal - discountAmount + taxAmount;
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const changeAmount = Math.max(0, amountPaid - total);

    // Generate a receipt number locally
    const receipt_number = `REC-${Date.now().toString().slice(-8)}`;

    const saleRecord = {
      id: crypto.randomUUID(),
      receipt_number,
      customer_id: customerId || null,
      sale_date: new Date().toISOString(),
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: total,
      amount_paid: amountPaid,
      change_amount: changeAmount,
      status: 'completed',
      notes: notes || null,
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total
      })),
      payments
    };

    // Save to localStorage
    try {
      const raw = localStorage.getItem('ericko_pos_sales');
      const sales = raw ? JSON.parse(raw) : [];
      sales.push(saleRecord);
      localStorage.setItem('ericko_pos_sales', JSON.stringify(sales));
    } catch (e) {
      console.error('Could not persist sale to localStorage:', e);
    }

    return { receipt_number, total };
  }
}

export const posService = new PosService();
