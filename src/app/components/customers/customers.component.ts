import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';

const CUSTOMERS_KEY = 'ericko_pos_customers';

function loadCustomers(): CustomerRow[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistCustomers(customers: CustomerRow[]): void {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
}

interface CustomerRow {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  loyalty_points: number;
  credit_limit: string;
  current_balance: string;
  is_active: boolean;
  customer_groups: { name: string } | null;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="customers-page">
      <header class="page-header">
        <div>
          <h1>Customers</h1>
          <p class="subtitle">Manage your customer base</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="openCustomerModal()">
            <span>&#43;</span> Add Customer
          </button>
        </div>
      </header>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-input">
          <input
            type="text"
            placeholder="Search by name, phone, or code..."
            [value]="searchQuery()"
            (input)="onSearch($event)"
          />
        </div>
      </div>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading customers...</span>
        </div>
      } @else {
        <!-- Customers Grid -->
        <div class="customers-grid">
          @for (customer of filteredCustomers(); track customer.id) {
            <div class="customer-card">
              <div class="customer-header">
                <div class="customer-avatar">
                  {{ getInitials(customer) }}
                </div>
                <div class="customer-info">
                  <h3>{{ customer.first_name }} {{ customer.last_name }}</h3>
                  <span class="customer-code">{{ customer.code }}</span>
                </div>
                <span class="status-badge" [class.active]="customer.is_active">
                  {{ customer.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <div class="customer-details">
                <div class="detail-item">
                  <span class="detail-label">Phone</span>
                  <span class="detail-value">{{ customer.phone }}</span>
                </div>
                @if (customer.email) {
                  <div class="detail-item">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">{{ customer.email }}</span>
                  </div>
                }
                <div class="detail-item">
                  <span class="detail-label">Group</span>
                  <span class="detail-value">{{ customer.customer_groups?.name || 'None' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Loyalty Points</span>
                  <span class="detail-value points">{{ customer.loyalty_points }}</span>
                </div>
              </div>

              <div class="customer-stats">
                <div class="stat">
                  <span class="stat-value">KES {{ parseFloat(customer.current_balance) | number:'1.0-2' }}</span>
                  <span class="stat-label">Balance</span>
                </div>
                <div class="stat">
                  <span class="stat-value">KES {{ parseFloat(customer.credit_limit) | number:'1.0-2' }}</span>
                  <span class="stat-label">Credit Limit</span>
                </div>
              </div>

              <div class="customer-actions">
                <button class="action-btn" (click)="editCustomer(customer)">Edit</button>
                <button class="action-btn primary" (click)="viewHistory(customer)">History</button>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <span class="empty-icon">&#128101;</span>
              <h3>No customers found</h3>
              <p>Add your first customer to get started</p>
              <button class="btn-primary" (click)="openCustomerModal()">Add Customer</button>
            </div>
          }
        </div>

        <!-- Summary -->
        <div class="table-footer">
          <span>Showing {{ filteredCustomers().length }} of {{ customers().length }} customers</span>
        </div>
      }
    </div>

    <!-- Add/Edit Customer Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="customer-modal anim-scale-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingCustomer() ? 'Edit Customer' : 'Add Customer' }}</h2>
            <button class="close-btn" (click)="closeModal()">&#215;</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>First Name *</label>
                <input type="text" [value]="formData().first_name" (input)="updateForm('first_name', $event)" />
              </div>
              <div class="form-group">
                <label>Last Name *</label>
                <input type="text" [value]="formData().last_name" (input)="updateForm('last_name', $event)" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Phone *</label>
                <input type="tel" [value]="formData().phone" (input)="updateForm('phone', $event)" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" [value]="formData().email" (input)="updateForm('email', $event)" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Customer Group</label>
                <select [value]="formData().customer_group_id || ''" (change)="updateForm('customer_group_id', $event)">
                  <option value="">Select Group</option>
                  @for (group of customerGroups(); track group.id) {
                    <option [value]="group.id">{{ group.name }} ({{ parseFloat(group.discount_percent) }}% discount)</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Credit Limit (KES)</label>
                <input type="number" [value]="formData().credit_limit" (input)="updateForm('credit_limit', $event)" min="0" />
              </div>
            </div>
            <div class="form-group full-width">
              <label>Address</label>
              <input type="text" [value]="formData().address" (input)="updateForm('address', $event)" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>City</label>
                <input type="text" [value]="formData().city" (input)="updateForm('city', $event)" />
              </div>
              <div class="form-group checkbox-group">
                <label>
                  <input type="checkbox" [checked]="formData().is_active" (change)="updateFormCheckbox('is_active', $event)" />
                  Active
                </label>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" (click)="saveCustomer()" [disabled]="isSaving()">
              {{ isSaving() ? 'Saving...' : 'Save Customer' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .customers-page {
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
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(8, 145, 178, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #0e7490, #155e75);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(8, 145, 178, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.5;
    }

    .btn-secondary {
      padding: 0.75rem 1.25rem;
      background: #334155;
      color: #e2e8f0;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
    }

    /* Filters */
    .filters-bar {
      margin-bottom: 1rem;
    }

    .search-input {
      max-width: 400px;
    }

    .search-input input {
      width: 100%;
      padding: 0.625rem 1rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.875rem;
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

    /* Customers Grid */
    .customers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }

    .customer-card {
      background: #1e293b;
      border-radius: 0.75rem;
      border: 1px solid #334155;
      overflow: hidden;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .customer-card:hover {
      border-color: #475569;
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .customer-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-bottom: 1px solid #334155;
    }

    .customer-avatar {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0891b2, #22d3ee);
      border-radius: 50%;
      font-size: 1.125rem;
      font-weight: 700;
      color: white;
      transition: transform 0.2s;
      box-shadow: 0 0 16px rgba(34, 211, 238, 0.15);
    }

    .customer-card:hover .customer-avatar {
      transform: scale(1.08);
      box-shadow: 0 0 24px rgba(34, 211, 238, 0.3);
    }

    .customer-info {
      flex: 1;
    }

    .customer-info h3 {
      margin: 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .customer-code {
      font-size: 0.75rem;
      color: #64748b;
      font-family: monospace;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      background: #334155;
      color: #94a3b8;
    }

    .status-badge.active {
      background: #14532d;
      color: #86efac;
    }

    .customer-details {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-label {
      font-size: 0.75rem;
      color: #64748b;
    }

    .detail-value {
      font-size: 0.875rem;
      color: #e2e8f0;
    }

    .detail-value.points {
      color: #f59e0b;
      font-weight: 600;
    }

    .customer-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      padding: 0 1rem 1rem;
    }

    .stat {
      text-align: center;
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 0.5rem;
    }

    .stat-value {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      color: #22d3ee;
    }

    .stat-label {
      display: block;
      font-size: 0.625rem;
      color: #64748b;
      text-transform: uppercase;
      margin-top: 0.25rem;
    }

    .customer-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-top: 1px solid #334155;
    }

    .action-btn {
      flex: 1;
      padding: 0.5rem;
      background: #334155;
      border: none;
      border-radius: 0.375rem;
      color: #e2e8f0;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .action-btn:hover {
      background: #475569;
    }

    .action-btn.primary {
      background: #0891b2;
      color: white;
    }

    .action-btn.primary:hover {
      background: #0e7490;
    }

    .empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      color: #64748b;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    .empty-state h3 {
      margin: 0;
      color: #e2e8f0;
    }

    .empty-state p {
      margin: 0.5rem 0 1rem;
    }

    .table-footer {
      margin-top: 1rem;
      color: #64748b;
      font-size: 0.75rem;
    }

    /* Modal */
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

    .customer-modal {
      background: #1e293b;
      border-radius: 1rem;
      width: 90%;
      max-width: 550px;
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

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group.full-width {
      grid-column: span 2;
    }

    .form-group label {
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .form-group input, .form-group select {
      padding: 0.75rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.875rem;
    }

    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: #22d3ee;
    }

    .checkbox-group {
      flex-direction: row;
      align-items: center;
      padding-top: 1.5rem;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .checkbox-group input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #334155;
    }

    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .form-group.full-width {
        grid-column: span 1;
      }
    }
  `]
})
export class CustomersComponent implements OnInit {
  private toast = inject(ToastService);
  isLoading = signal(true);
  customers = signal<CustomerRow[]>([]);
  filteredCustomers = signal<CustomerRow[]>([]);
  customerGroups = signal<{ id: string; name: string; discount_percent: string }[]>([]);
  searchQuery = signal('');
  showModal = signal(false);
  editingCustomer = signal<CustomerRow | null>(null);
  isSaving = signal(false);

  formData = signal({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    customer_group_id: '',
    credit_limit: 0,
    address: '',
    city: '',
    is_active: true
  });

  ngOnInit(): void {
    const data = loadCustomers();
    this.customers.set(data);
    this.filteredCustomers.set(data);
    this.isLoading.set(false);
  }

  getInitials(customer: CustomerRow): string {
    return `${customer.first_name.charAt(0)}${customer.last_name.charAt(0)}`.toUpperCase();
  }

  parseFloat(value: string): number {
    return parseFloat(value) || 0;
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchQuery.set(value);

    if (!value) {
      this.filteredCustomers.set(this.customers());
      return;
    }

    const filtered = this.customers().filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(value) ||
      c.phone.includes(value) ||
      c.code.toLowerCase().includes(value)
    );
    this.filteredCustomers.set(filtered);
  }

  openCustomerModal(): void {
    this.editingCustomer.set(null);
    this.formData.set({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      customer_group_id: '',
      credit_limit: 0,
      address: '',
      city: '',
      is_active: true
    });
    this.showModal.set(true);
  }

  editCustomer(customer: CustomerRow): void {
    this.editingCustomer.set(customer);
    this.formData.set({
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      email: customer.email || '',
      customer_group_id: '',
      credit_limit: parseFloat(customer.credit_limit),
      address: customer.address || '',
      city: customer.city || '',
      is_active: customer.is_active
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingCustomer.set(null);
  }

  updateForm(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.formData.update(form => ({ ...form, [field]: value }));
  }

  updateFormCheckbox(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.formData.update(form => ({ ...form, [field]: value }));
  }

  saveCustomer(): void {
    const form = this.formData();
    if (!form.first_name || !form.last_name || !form.phone) {
      this.toast.warning('Please fill in required fields');
      return;
    }

    this.isSaving.set(true);

    try {
      const all = loadCustomers();
      const editing = this.editingCustomer();

      if (editing) {
        const updated = all.map(c => c.id === editing.id ? {
          ...c,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          city: form.city || null,
          credit_limit: String(form.credit_limit),
          is_active: form.is_active
        } : c);
        persistCustomers(updated);
        this.customers.set(updated);
        this.filteredCustomers.set(updated);
        this.toast.success('Customer updated successfully!');
      } else {
        const newCustomer: CustomerRow = {
          id: crypto.randomUUID(),
          code: `C${Date.now().toString().slice(-6)}`,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          city: form.city || null,
          loyalty_points: 0,
          credit_limit: String(form.credit_limit),
          current_balance: '0',
          is_active: form.is_active,
          customer_groups: null
        };
        const updated = [...all, newCustomer];
        persistCustomers(updated);
        this.customers.set(updated);
        this.filteredCustomers.set(updated);
        this.toast.success('Customer added successfully!');
      }

      this.closeModal();
    } catch (error: any) {
      this.toast.error(`Failed to save customer: ${error.message}`);
    } finally {
      this.isSaving.set(false);
    }
  }

  viewHistory(customer: CustomerRow): void {
    this.toast.info(`Sales history for ${customer.first_name} ${customer.last_name} coming soon!`);
  }
}
