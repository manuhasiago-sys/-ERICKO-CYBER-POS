import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category } from '../../../core/models/product.model';
import { ToastService } from '../../../core/services/toast.service';

const PRODUCTS_KEY = 'ericko_pos_products';

function loadProducts(): ProductRow[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistProducts(products: ProductRow[]): void {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

interface ProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  cost_price: string;
  selling_price: string;
  reorder_level: number;
  is_active: boolean;
  category_id: string | null;
  categories: { name: string } | null;
  stock_levels: { quantity: string }[];
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="products-page">
      <header class="page-header">
        <div>
          <h1>Products</h1>
          <p class="subtitle">Manage your product catalog</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="openProductModal()">
            <span>&#43;</span> Add Product
          </button>
        </div>
      </header>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-input">
          <input
            type="text"
            placeholder="Search products..."
            [value]="searchQuery()"
            (input)="onSearch($event)"
          />
        </div>
        <select [value]="filterCategory()" (change)="onCategoryFilter($event)" class="filter-select">
          <option value="">All Categories</option>
          @for (category of categories(); track category.id) {
            <option [value]="category.id">{{ category.name }}</option>
          }
        </select>
      </div>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading products...</span>
        </div>
      } @else {
        <!-- Products Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (product of filteredProducts(); track product.id) {
                <tr>
                  <td class="product-cell">
                    <span class="product-name">{{ product.name }}</span>
                    @if (product.barcode) {
                      <span class="product-barcode">{{ product.barcode }}</span>
                    }
                  </td>
                  <td class="sku-cell">{{ product.sku }}</td>
                  <td>{{ product.categories?.name || '-' }}</td>
                  <td>KES {{ parseFloat(product.cost_price) | number:'1.0-2' }}</td>
                  <td class="price-cell">KES {{ parseFloat(product.selling_price) | number:'1.0-2' }}</td>
                  <td>
                    <span class="stock-badge" [class.low]="getStock(product) <= product.reorder_level" [class.out]="getStock(product) === 0">
                      {{ getStock(product) }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [class.active]="product.is_active" [class.inactive]="!product.is_active">
                      {{ product.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <button class="action-btn" (click)="editProduct(product)">&#9998;</button>
                    <button class="action-btn delete" (click)="deleteProduct(product)">&#128465;</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty-cell">
                    <div class="empty-state">
                      <span class="empty-icon">&#128230;</span>
                      <p>No products found</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="table-footer">
          <span>Showing {{ filteredProducts().length }} of {{ products().length }} products</span>
        </div>
      }
    </div>

    <!-- Add/Edit Product Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="product-modal anim-scale-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingProduct() ? 'Edit Product' : 'Add Product' }}</h2>
            <button class="close-btn" (click)="closeModal()">&#215;</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Product Name *</label>
                <input type="text" [value]="formData().name" (input)="updateForm('name', $event)" />
              </div>
              <div class="form-group">
                <label>SKU *</label>
                <input type="text" [value]="formData().sku" (input)="updateForm('sku', $event)" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Barcode</label>
                <input type="text" [value]="formData().barcode" (input)="updateForm('barcode', $event)" />
              </div>
              <div class="form-group">
                <label>Category</label>
                <select [value]="formData().category_id || ''" (change)="updateForm('category_id', $event)">
                  <option value="">Select Category</option>
                  @for (category of categories(); track category.id) {
                    <option [value]="category.id">{{ category.name }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Cost Price (KES) *</label>
                <input type="number" [value]="formData().cost_price" (input)="updateForm('cost_price', $event)" step="0.01" min="0" />
              </div>
              <div class="form-group">
                <label>Selling Price (KES) *</label>
                <input type="number" [value]="formData().selling_price" (input)="updateForm('selling_price', $event)" step="0.01" min="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Reorder Level</label>
                <input type="number" [value]="formData().reorder_level" (input)="updateForm('reorder_level', $event)" min="0" />
              </div>
              <div class="form-group checkbox-group">
                <label>
                  <input type="checkbox" [checked]="formData().is_active" (change)="updateFormCheckbox('is_active', $event)" />
                  Active
                </label>
              </div>
            </div>
            <div class="form-group full-width">
              <label>Description</label>
              <textarea [value]="formData().description" (input)="updateForm('description', $event)" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" (click)="saveProduct()" [disabled]="isSaving()">
              {{ isSaving() ? 'Saving...' : 'Save Product' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .products-page {
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
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .search-input {
      flex: 1;
      max-width: 400px;
    }

    .search-input input, .filter-select {
      width: 100%;
      padding: 0.625rem 1rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.875rem;
    }

    .filter-select {
      width: auto;
      min-width: 180px;
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
      vertical-align: middle;
    }

    .product-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .product-name {
      font-weight: 500;
    }

    .product-barcode {
      font-size: 0.75rem;
      color: #64748b;
      font-family: monospace;
    }

    .sku-cell {
      font-family: monospace;
      color: #22d3ee;
    }

    .price-cell {
      font-weight: 600;
    }

    .stock-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      background: #14532d;
      color: #86efac;
    }

    .stock-badge.low {
      background: #7c2d12;
      color: #fed7aa;
    }

    .stock-badge.out {
      background: #7f1d1d;
      color: #fecaca;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .status-badge.active {
      background: #14532d;
      color: #86efac;
    }

    .status-badge.inactive {
      background: #334155;
      color: #94a3b8;
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
      transition: background 0.2s;
    }

    .action-btn:hover {
      background: #475569;
    }

    .action-btn.delete:hover {
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

    .product-modal {
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

    .form-group input, .form-group select, .form-group textarea {
      padding: 0.75rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.875rem;
    }

    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
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
export class ProductsComponent implements OnInit {
  private toast = inject(ToastService);
  parseFloat = (value: string) => parseFloat(value) || 0;

  isLoading = signal(true);
  products = signal<ProductRow[]>([]);
  filteredProducts = signal<ProductRow[]>([]);
  categories = signal<Category[]>([]);
  searchQuery = signal('');
  filterCategory = signal('');
  showModal = signal(false);
  editingProduct = signal<ProductRow | null>(null);
  isSaving = signal(false);

  formData = signal({
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    cost_price: 0,
    selling_price: 0,
    reorder_level: 0,
    is_active: true,
    description: ''
  });

  ngOnInit(): void {
    // Load categories from localStorage (saved via Categories page)
    try {
      const raw = localStorage.getItem('ericko_pos_categories');
      this.categories.set(raw ? JSON.parse(raw) : []);
    } catch { this.categories.set([]); }

    const data = loadProducts();
    this.products.set(data);
    this.filteredProducts.set(data);
    this.isLoading.set(false);
  }

  getStock(product: ProductRow): number {
    return parseFloat((product as any).stock_levels?.[0]?.quantity || '0');
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchQuery.set(value);
    this.applyFilters();
  }

  onCategoryFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterCategory.set(value);
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.products();
    const query = this.searchQuery();
    const category = this.filterCategory();

    if (query) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.includes(query))
      );
    }

    if (category) {
      filtered = filtered.filter(p => p.category_id === category);
    }

    this.filteredProducts.set(filtered);
  }

  openProductModal(): void {
    this.editingProduct.set(null);
    this.formData.set({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      barcode: '',
      category_id: '',
      cost_price: 0,
      selling_price: 0,
      reorder_level: 0,
      is_active: true,
      description: ''
    });
    this.showModal.set(true);
  }

  editProduct(product: ProductRow): void {
    this.editingProduct.set(product);
    this.formData.set({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      cost_price: parseFloat(product.cost_price),
      selling_price: parseFloat(product.selling_price),
      reorder_level: product.reorder_level,
      is_active: product.is_active,
      description: product.description || ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
  }

  updateForm(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    this.formData.update(form => ({ ...form, [field]: field === 'category_id' && value === '' ? null : value }));
  }

  updateFormCheckbox(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.formData.update(form => ({ ...form, [field]: value }));
  }

  saveProduct(): void {
    const form = this.formData();
    if (!form.name || !form.sku) {
      this.toast.warning('Please fill in required fields');
      return;
    }

    this.isSaving.set(true);

    try {
      const all = loadProducts();
      const editing = this.editingProduct();
      const cat = this.categories().find(c => c.id === form.category_id);

      if (editing) {
        const updated = all.map(p => p.id === editing.id ? {
          ...p,
          name: form.name,
          sku: form.sku,
          barcode: form.barcode || null,
          category_id: form.category_id || null,
          categories: cat ? { name: cat.name } : null,
          cost_price: String(form.cost_price),
          selling_price: String(form.selling_price),
          reorder_level: form.reorder_level,
          is_active: form.is_active,
          description: form.description || null
        } : p);
        persistProducts(updated);
        this.products.set(updated);
        this.filteredProducts.set(updated);
        this.toast.success('Product updated successfully!');
      } else {
        const newProduct: ProductRow = {
          id: crypto.randomUUID(),
          sku: form.sku,
          barcode: form.barcode || null,
          name: form.name,
          description: form.description || null,
          cost_price: String(form.cost_price),
          selling_price: String(form.selling_price),
          reorder_level: form.reorder_level,
          is_active: form.is_active,
          category_id: form.category_id || null,
          categories: cat ? { name: cat.name } : null,
          stock_levels: [{ quantity: '0' }]
        };
        const updated = [...all, newProduct];
        persistProducts(updated);
        this.products.set(updated);
        this.filteredProducts.set(updated);
        this.toast.success('Product added successfully!');
      }

      this.closeModal();
    } catch (error: any) {
      this.toast.error(`Failed to save product: ${error.message}`);
    } finally {
      this.isSaving.set(false);
    }
  }

  deleteProduct(product: ProductRow): void {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    try {
      const all = loadProducts();
      const updated = all.filter(p => p.id !== product.id);
      persistProducts(updated);
      this.products.set(updated);
      this.filteredProducts.set(updated);
      this.toast.success('Product deleted successfully!');
    } catch (error: any) {
      this.toast.error(`Failed to delete product: ${error.message}`);
    }
  }
}
