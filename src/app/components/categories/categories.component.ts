import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category } from '../../../core/models/product.model';
import { ToastService } from '../../../core/services/toast.service';

const CATEGORIES_KEY = 'ericko_pos_categories';

function loadFromStorage(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage(cats: Category[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="categories-page">
      <header class="page-header">
        <div>
          <h1>Categories</h1>
          <p class="subtitle">Manage product categories</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="openModal()">
            <span>&#43;</span> Add Category
          </button>
        </div>
      </header>

      <div class="table-container">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading categories...</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Display Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (cat of categories(); track cat.id) {
                <tr>
                  <td class="primary-cell">
                    <div class="font-medium">{{ cat.name }}</div>
                  </td>
                  <td class="text-secondary">{{ cat.description || '-' }}</td>
                  <td>{{ cat.display_order }}</td>
                  <td>
                    <span class="status-badge" [class.success]="cat.is_active" [class.error]="!cat.is_active">
                      {{ cat.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn-icon" (click)="editCategory(cat)" title="Edit">
                      &#9998;
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="empty-state">
                    No categories found.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Category Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Add Category</h2>
              <button class="btn-icon" (click)="closeModal()">&#x2715;</button>
            </div>

            <form (ngSubmit)="saveCategory()" class="modal-body">
              <div class="form-group">
                <label>Name <span class="required">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="editingCategory.name"
                  name="name"
                  required
                  placeholder="e.g. Electronics"
                />
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea
                  [(ngModel)]="editingCategory.description"
                  name="description"
                  rows="3"
                  placeholder="Optional description"
                ></textarea>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Display Order</label>
                  <input
                    type="number"
                    [(ngModel)]="editingCategory.display_order"
                    name="display_order"
                  />
                </div>
                <div class="form-group toggle-group" *ngIf="editingCategory.id">
                  <label>Status</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="editingCategory.is_active" name="is_active" id="activeToggle" />
                    <label for="activeToggle">Active</label>
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeModal()" [disabled]="saving()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="saving() || !editingCategory.name">
                  {{ saving() ? 'Saving...' : 'Save Category' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .categories-page {
      padding: 2rem;
      height: 100%;
      overflow-y: auto;
      background: #0f172a;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #94a3b8;
    }

    .btn-primary {
      background: #22d3ee;
      color: #0f172a;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #06b6d4;
    }

    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: transparent;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #1e293b;
      color: #e2e8f0;
    }

    .btn-icon {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.25rem;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #334155;
      color: #e2e8f0;
    }

    .table-container {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: 1rem 1.5rem;
      text-align: left;
    }

    .data-table th {
      background: #0f172a;
      color: #94a3b8;
      font-weight: 500;
      font-size: 0.875rem;
      border-bottom: 1px solid #334155;
    }

    .data-table td {
      color: #e2e8f0;
      border-bottom: 1px solid #334155;
    }

    .data-table tbody tr:hover {
      background: rgba(51, 65, 85, 0.5);
    }

    .font-medium {
      font-weight: 500;
    }

    .text-secondary {
      color: #94a3b8;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.success {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
    }

    .status-badge.error {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
    }

    .empty-state {
      text-align: center;
      padding: 3rem !important;
      color: #94a3b8 !important;
    }

    .loading-state {
      padding: 4rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: #94a3b8;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #334155;
      border-top-color: #22d3ee;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }

    .modal-content {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #e2e8f0;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      color: #94a3b8;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .required {
      color: #f87171;
    }

    input, textarea {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      color: #e2e8f0;
      transition: all 0.2s;
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: #22d3ee;
      box-shadow: 0 0 0 1px #22d3ee;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
    }
    
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    
    .toggle-group label {
      display: block;
      margin-bottom: 0.5rem;
    }
    
    .toggle-switch {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #e2e8f0;
    }
    
    .toggle-switch input[type="checkbox"] {
      width: auto;
    }
  `]
})
export class CategoriesComponent implements OnInit {
  private toastService = inject(ToastService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  showModal = signal(false);
  saving = signal(false);

  editingCategory: Partial<Category> = {
    name: '',
    description: '',
    display_order: 0,
    is_active: true
  };

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading.set(true);
    try {
      const data = loadFromStorage();
      this.categories.set(data);
    } catch (error) {
      this.toastService.error('Failed to load categories');
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }

  openModal() {
    this.editingCategory = { name: '', description: '', display_order: 0, is_active: true };
    this.showModal.set(true);
  }
  
  editCategory(cat: Category) {
    this.editingCategory = { ...cat };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveCategory() {
    if (!this.editingCategory.name?.trim()) return;

    this.saving.set(true);
    try {
      const existing = loadFromStorage();
      let updated: Category[];
      
      if (this.editingCategory.id) {
        updated = existing.map(c => c.id === this.editingCategory.id ? {
          ...c,
          name: this.editingCategory.name!.trim(),
          description: this.editingCategory.description?.trim() || null,
          display_order: this.editingCategory.display_order ?? 0,
          is_active: this.editingCategory.is_active ?? true
        } : c);
        this.toastService.success('Category updated successfully!');
      } else {
        const newCat: Category = {
          id: crypto.randomUUID(),
          name: this.editingCategory.name.trim(),
          description: this.editingCategory.description?.trim() || null,
          display_order: this.editingCategory.display_order ?? 0,
          is_active: true
        };
        updated = [...existing, newCat];
        this.toastService.success('Category added successfully!');
      }
      
      saveToStorage(updated);
      this.categories.set(updated);
      this.closeModal();
    } catch (error) {
      this.toastService.error('Failed to save category');
      console.error(error);
    } finally {
      this.saving.set(false);
    }
  }
}
