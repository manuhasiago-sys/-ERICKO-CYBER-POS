import { Component, signal, computed, effect, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductWithStock, Category } from '../core/models/product.model';
import { isLowStock as checkLowStock } from '../core/models/product.model';
import { CartItem, PaymentMethod, Customer } from '../core/models/sale.model';
import { posService } from '../core/services/pos.service';
import { printerService } from '../core/services/printer.service';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pos-container">
      <!-- Header -->
      <header class="pos-header">
        <div class="header-left">
          <h1 class="logo">ERICKO POS</h1>
          <span class="branch-name">{{ branchName() }}</span>
        </div>
        <div class="header-center">
          <div class="search-box">
            <input
              type="text"
              placeholder="Search products or scan barcode..."
              [value]="searchQuery()"
              (input)="onSearch($event)"
              (keydown.enter)="onSearchEnter($event)"
            />
            <span class="search-icon">&#128269;</span>
          </div>
        </div>
        <div class="header-right">
          <span class="datetime">{{ currentDateTime() }}</span>
        </div>
      </header>

      <div class="pos-body">
        <!-- Left Panel: Products -->
        <div class="products-panel">
          <!-- Categories -->
          <div class="categories-bar">
            <button
              class="category-btn"
              [class.active]="selectedCategory() === null"
              (click)="selectCategory(null)">
              All
            </button>
            @for (category of categories(); track category.id) {
              <button
                class="category-btn"
                [class.active]="selectedCategory() === category.id"
                (click)="selectCategory(category.id)">
                {{ category.name }}
              </button>
            }
          </div>

          <!-- Product Grid -->
          <div class="products-grid">
            @for (product of filteredProducts(); track product.id) {
              <button
                class="product-card"
                [class.low-stock]="isLowStock(product)"
                [class.out-of-stock]="product.stock_quantity === 0"
                (click)="addToCart(product)">
                <div class="product-info">
                  <span class="product-name">{{ product.name }}</span>
                  <span class="product-sku">{{ product.sku }}</span>
                </div>
                <div class="product-price">
                  <span class="currency">{{ currency() }}</span>
                  <span class="amount">{{ product.selling_price | number:'1.0-0' }}</span>
                </div>
                <div class="product-stock" [class.low]="isLowStock(product)">
                  Stock: {{ product.stock_quantity }}
                </div>
              </button>
            } @empty {
              <div class="no-products">No products found</div>
            }
          </div>
        </div>

        <!-- Right Panel: Cart -->
        <div class="cart-panel">
          <!-- Customer Section -->
          <div class="customer-section">
            <div class="customer-header">
              <span class="customer-label">Customer</span>
              @if (selectedCustomer()) {
                <button class="btn-clear-customer" (click)="clearCustomer()">Clear</button>
              }
            </div>
            @if (selectedCustomer()) {
              <div class="customer-info">
                <span class="customer-name">{{ selectedCustomer()!.first_name }} {{ selectedCustomer()!.last_name }}</span>
                <span class="customer-phone">{{ selectedCustomer()!.phone }}</span>
              </div>
            } @else {
              <div class="customer-search">
                <input
                  type="text"
                  placeholder="Search customer by phone..."
                  [value]="customerSearch()"
                  (input)="onCustomerSearch($event)"
                />
                @if (customerResults().length > 0) {
                  <div class="customer-results">
                    @for (customer of customerResults(); track customer.id) {
                      <button class="customer-result" (click)="selectCustomer(customer)">
                        {{ customer.first_name }} {{ customer.last_name }} - {{ customer.phone }}
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Cart Items -->
          <div class="cart-items">
            @for (item of cart(); track item.product_id; let i = $index) {
              <div class="cart-item anim-slide-in-right">
                <div class="item-info">
                  <span class="item-name">{{ item.product_name }}</span>
                  <span class="item-price">{{ currency() }}{{ item.unit_price | number:'1.0-0' }}</span>
                </div>
                <div class="item-controls">
                  <button class="qty-btn" (click)="decrementQty(i)" [disabled]="item.quantity <= 1">-</button>
                  <span class="item-qty">{{ item.quantity }}</span>
                  <button class="qty-btn" (click)="incrementQty(i)">+</button>
                  <button class="remove-btn" (click)="removeItem(i)">&#215;</button>
                </div>
                <div class="item-total">{{ currency() }}{{ item.line_total | number:'1.0-2' }}</div>
              </div>
            } @empty {
              <div class="empty-cart">
                <span class="empty-icon">&#128722;</span>
                <span>Cart is empty</span>
                <span class="hint">Click products to add</span>
              </div>
            }
          </div>

          <!-- Cart Summary -->
          <div class="cart-summary">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>{{ currency() }}{{ cartSubtotal() | number:'1.0-2' }}</span>
            </div>
            <div class="summary-row">
              <span>Tax ({{ taxRate() }}%)</span>
              <span>{{ currency() }}{{ cartTax() | number:'1.0-2' }}</span>
            </div>
            <div class="summary-row discount" (click)="editingDiscount.set(true)">
              @if (editingDiscount()) {
                <input
                  type="number"
                  class="discount-input"
                  [value]="discountAmount()"
                  (input)="onDiscountInput($event)"
                  (blur)="editingDiscount.set(false)"
                  min="0"
                  [max]="cartSubtotal()"
                />
              } @else {
                <span>Discount</span>
              }
              <span>-{{ currency() }}{{ discountAmount() | number:'1.0-2' }}</span>
            </div>
            <div class="summary-row total">
              <span>Total</span>
              <span>{{ currency() }}{{ cartTotal() | number:'1.0-2' }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="cart-actions">
            <button class="action-btn hold" (click)="holdSale()" [disabled]="cart().length === 0">
              Hold
            </button>
            <button class="action-btn clear" (click)="clearCart()" [disabled]="cart().length === 0">
              Clear
            </button>
            <button class="action-btn checkout" (click)="openPayment()" [disabled]="cart().length === 0">
              Pay {{ currency() }}{{ cartTotal() | number:'1.0-0' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Payment Modal -->
      @if (showPaymentModal()) {
        <div class="modal-overlay" (click)="closePayment()">
          <div class="payment-modal anim-scale-in" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Payment</h2>
              <button class="close-btn" (click)="closePayment()">&#215;</button>
            </div>

            <div class="modal-body">
              <div class="payment-total">
                <span>Amount Due</span>
                <span class="total-amount">{{ currency() }}{{ cartTotal() | number:'1.0-2' }}</span>
              </div>

              <div class="payment-methods">
                @for (method of paymentMethods(); track method.id) {
                  <button
                    class="method-btn"
                    [class.active]="selectedPaymentMethod() === method.id"
                    (click)="selectPaymentMethod(method.id)">
                    <span class="method-name">{{ method.name }}</span>
                  </button>
                }
              </div>

              @if (selectedPaymentMethod()) {
                <div class="payment-input">
                  <label>Amount</label>
                  <input
                    type="number"
                    [value]="paymentAmount()"
                    (input)="onPaymentAmountInput($event)"
                    min="0"
                    step="0.01"
                  />
                </div>

                @if (selectedPaymentMethodObj()?.requires_reference) {
                  <div class="payment-input">
                    <label>Reference Number</label>
                    <input
                      type="text"
                      [value]="paymentReference()"
                      (input)="onPaymentReferenceInput($event)"
                    />
                  </div>
                }

                <div class="payment-change">
                  <span>Change</span>
                  <span class="change-amount">{{ currency() }}{{ paymentChange() | number:'1.0-2' }}</span>
                </div>
              }

              <div class="modal-actions">
                <button class="modal-btn cancel" (click)="closePayment()">Cancel</button>
                <button
                  class="modal-btn confirm"
                  (click)="completeSale()"
                  [disabled]="!canCompletePayment()">
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Receipt Modal -->
      @if (showReceiptModal()) {
        <div class="modal-overlay" (click)="closeReceipt()">
          <div class="receipt-modal anim-scale-in" (click)="$event.stopPropagation()">
            <div class="receipt-content">
              <div class="receipt-header">
                <h3>{{ companyName() }}</h3>
                @if (companyAddress()) {
                  <p>{{ companyAddress() }}</p>
                }
                @if (companyPhone()) {
                  <p>Tel: {{ companyPhone() }}</p>
                }
              </div>
              <div class="receipt-details">
                <p>Receipt: {{ completedReceiptNumber() }}</p>
                <p>Date: {{ completedDateTime() }}</p>
                @if (selectedCustomer()) {
                  <p>Customer: {{ selectedCustomer()!.first_name }} {{ selectedCustomer()!.last_name }}</p>
                }
                @if (servedByName()) {
                  <p>{{ servedByLabel() }}: {{ servedByName() }}</p>
                }
              </div>
              <div class="receipt-items">
                @for (item of completedItems(); track item.product_id) {
                  <div class="receipt-item">
                    <span class="receipt-item-name">{{ item.product_name }}</span>
                    <span class="receipt-item-qty">x{{ item.quantity }}</span>
                    <span class="receipt-item-total">{{ currency() }}{{ item.line_total | number:'1.0-2' }}</span>
                  </div>
                }
              </div>
              <div class="receipt-totals">
                <p>Subtotal: {{ currency() }}{{ completedSubtotal() | number:'1.0-2' }}</p>
                <p>Tax: {{ currency() }}{{ completedTax() | number:'1.0-2' }}</p>
                <p class="receipt-total">Total: {{ currency() }}{{ completedTotal() | number:'1.0-2' }}</p>
                <p>Paid: {{ currency() }}{{ completedPaid() | number:'1.0-2' }}</p>
                <p>Change: {{ currency() }}{{ completedChange() | number:'1.0-2' }}</p>
              </div>
              <p class="receipt-footer">Thank you for your purchase!</p>
            </div>
            <div class="receipt-actions">
              <button class="modal-btn print" (click)="printReceipt()" [disabled]="isPrinting()">
                <span>&#128424;</span> {{ isPrinting() ? 'Printing...' : 'Print' }}
              </button>
              <button class="modal-btn confirm" (click)="closeReceipt()">Done</button>
            </div>
          </div>
        </div>
      }

      <!-- Loading Overlay -->
      @if (isLoading()) {
        <div class="loading-overlay anim-fade-in">
          <div class="spinner"></div>
          <span>Loading...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .pos-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Header */
    .pos-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.5rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }

    .header-left {
      display: flex;
      align-items: baseline;
      gap: 1rem;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: #22d3ee;
      margin: 0;
    }

    .branch-name {
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .header-center {
      flex: 1;
      max-width: 400px;
      margin: 0 2rem;
    }

    .search-box {
      position: relative;
      width: 100%;
    }

    .search-box input {
      width: 100%;
      padding: 0.625rem 1rem 0.625rem 2.5rem;
      background: #334155;
      border: 1px solid #475569;
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.875rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .search-box input:focus {
      outline: none;
      border-color: #22d3ee;
      box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1);
    }

    .search-box input::placeholder {
      color: #64748b;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .datetime {
      font-size: 0.875rem;
      color: #94a3b8;
    }

    /* Body */
    .pos-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Products Panel */
    .products-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 1rem;
      overflow: hidden;
    }

    .categories-bar {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 0;
      margin-bottom: 1rem;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .categories-bar::-webkit-scrollbar {
      display: none;
    }

    .category-btn {
      padding: 0.5rem 1rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      color: #94a3b8;
      font-size: 0.875rem;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .category-btn:hover {
      background: #334155;
      color: #e2e8f0;
    }

    .category-btn.active {
      background: linear-gradient(135deg, #0891b2, #0e7490);
      border-color: #0891b2;
      color: white;
      box-shadow: 0 2px 8px rgba(8, 145, 178, 0.3);
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    .product-card {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .product-card:hover {
      background: #334155;
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
      border-color: #475569;
    }

    .product-card.low-stock {
      border-color: #f59e0b;
    }

    .product-card.out-of-stock {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .product-card:active {
      transform: scale(0.97);
    }

    .product-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
    }

    .product-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #e2e8f0;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-sku {
      font-size: 0.75rem;
      color: #64748b;
    }

    .product-price {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      margin-top: auto;
    }

    .currency {
      font-size: 0.75rem;
      color: #22d3ee;
    }

    .product-price .amount {
      font-size: 1.125rem;
      font-weight: 700;
      color: #22d3ee;
    }

    .product-stock {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.5rem;
    }

    .product-stock.low {
      color: #f59e0b;
    }

    .no-products {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #64748b;
      font-size: 1rem;
    }

    /* Cart Panel */
    .cart-panel {
      width: 380px;
      display: flex;
      flex-direction: column;
      background: #1e293b;
      border-left: 1px solid #334155;
    }

    .customer-section {
      padding: 1rem;
      border-bottom: 1px solid #334155;
    }

    .customer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .customer-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn-clear-customer {
      font-size: 0.75rem;
      color: #ef4444;
      background: none;
      border: none;
      cursor: pointer;
    }

    .customer-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .customer-name {
      font-weight: 600;
      color: #e2e8f0;
    }

    .customer-phone {
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .customer-search {
      position: relative;
    }

    .customer-search input {
      width: 100%;
      padding: 0.5rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.875rem;
    }

    .customer-search input:focus {
      outline: none;
      border-color: #22d3ee;
    }

    .customer-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      margin-top: 0.25rem;
      max-height: 200px;
      overflow-y: auto;
      z-index: 10;
    }

    .customer-result {
      display: block;
      width: 100%;
      padding: 0.5rem;
      text-align: left;
      border: none;
      background: none;
      color: #e2e8f0;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .customer-result:hover {
      background: #1e293b;
    }

    .cart-items {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .cart-item {
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .cart-item:hover {
      background: #16243a;
      transform: translateX(-2px);
    }

    .item-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }

    .item-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #e2e8f0;
    }

    .item-price {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .item-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .qty-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #334155;
      border: none;
      border-radius: 0.375rem;
      color: #e2e8f0;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .qty-btn:hover:not(:disabled) {
      background: #475569;
    }

    .qty-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .item-qty {
      min-width: 2rem;
      text-align: center;
      font-weight: 600;
      color: #e2e8f0;
    }

    .remove-btn {
      margin-left: auto;
      background: none;
      border: none;
      color: #ef4444;
      font-size: 1.25rem;
      cursor: pointer;
    }

    .item-total {
      font-size: 0.875rem;
      font-weight: 600;
      color: #22d3ee;
      text-align: right;
    }

    .empty-cart {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #64748b;
      text-align: center;
      gap: 0.5rem;
    }

    .empty-icon {
      font-size: 3rem;
      opacity: 0.5;
    }

    .hint {
      font-size: 0.75rem;
    }

    .cart-summary {
      padding: 1rem;
      border-top: 1px solid #334155;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .summary-row.discount {
      cursor: pointer;
    }

    .summary-row.discount:hover {
      color: #e2e8f0;
    }

    .discount-input {
      width: 100px;
      padding: 0.25rem;
      background: #0f172a;
      border: 1px solid #22d3ee;
      border-radius: 0.25rem;
      color: #e2e8f0;
      text-align: right;
    }

    .summary-row.total {
      font-size: 1.25rem;
      font-weight: 700;
      color: #e2e8f0;
      padding-top: 0.5rem;
      margin-top: 0.5rem;
      border-top: 1px solid #334155;
    }

    .cart-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      padding: 1rem;
    }

    .action-btn {
      padding: 1rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn.hold {
      background: #334155;
      color: #e2e8f0;
    }

    .action-btn.hold:hover:not(:disabled) {
      background: #475569;
    }

    .action-btn.clear {
      background: #7f1d1d;
      color: #fecaca;
    }

    .action-btn.clear:hover:not(:disabled) {
      background: #991b1b;
    }

    .action-btn.checkout {
      grid-column: 1 / -1;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      color: white;
      font-size: 1rem;
      box-shadow: 0 2px 8px rgba(8, 145, 178, 0.3);
    }

    .action-btn.checkout:hover:not(:disabled) {
      background: linear-gradient(135deg, #0e7490, #155e75);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(8, 145, 178, 0.4);
    }

    .action-btn.checkout:active:not(:disabled) {
      transform: scale(0.98);
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

    .payment-modal, .receipt-modal {
      background: #1e293b;
      border-radius: 1rem;
      width: 90%;
      max-width: 420px;
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

    .payment-total {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .payment-total span:first-child {
      display: block;
      font-size: 0.875rem;
      color: #94a3b8;
      margin-bottom: 0.25rem;
    }

    .total-amount {
      font-size: 2rem;
      font-weight: 700;
      color: #22d3ee;
    }

    .payment-methods {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .method-btn {
      padding: 1rem;
      background: #0f172a;
      border: 2px solid #334155;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .method-btn:hover {
      border-color: #475569;
    }

    .method-btn.active {
      border-color: #22d3ee;
      background: rgba(34, 211, 238, 0.1);
      box-shadow: 0 0 16px rgba(34, 211, 238, 0.15);
    }

    .method-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #e2e8f0;
    }

    .payment-input {
      margin-bottom: 1rem;
    }

    .payment-input label {
      display: block;
      font-size: 0.75rem;
      color: #94a3b8;
      margin-bottom: 0.375rem;
    }

    .payment-input input {
      width: 100%;
      padding: 0.75rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 1.125rem;
    }

    .payment-input input:focus {
      outline: none;
      border-color: #22d3ee;
    }

    .payment-change {
      display: flex;
      justify-content: space-between;
      padding: 1rem;
      background: #0f172a;
      border-radius: 0.5rem;
      margin-top: 1rem;
    }

    .change-amount {
      font-size: 1.25rem;
      font-weight: 700;
      color: #22c55e;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .modal-btn {
      flex: 1;
      padding: 1rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .modal-btn.cancel {
      background: #334155;
      color: #e2e8f0;
    }

    .modal-btn.cancel:hover {
      background: #475569;
    }

    .modal-btn.confirm {
      background: #0891b2;
      color: white;
    }

    .modal-btn.confirm:hover:not(:disabled) {
      background: #0e7490;
    }

    .modal-btn.confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-btn.print {
      background: #14532d;
      color: #86efac;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .modal-btn.print:hover:not(:disabled) {
      background: #166534;
    }

    .modal-btn.print:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .receipt-actions {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      border-top: 1px solid #334155;
    }

    /* Receipt */
    .receipt-content {
      padding: 1.5rem;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: #e2e8f0;
    }

    .receipt-header {
      text-align: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px dashed #475569;
    }

    .receipt-header h3 {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
    }

    .receipt-header p {
      margin: 0.25rem 0;
      color: #94a3b8;
    }

    .receipt-details {
      margin-bottom: 1rem;
    }

    .receipt-details p {
      margin: 0.125rem 0;
      color: #94a3b8;
    }

    .receipt-items {
      padding: 0.5rem 0;
      border-top: 1px dashed #475569;
      border-bottom: 1px dashed #475569;
      margin-bottom: 1rem;
    }

    .receipt-item {
      display: flex;
      justify-content: space-between;
      margin: 0.25rem 0;
    }

    .receipt-item-name {
      flex: 1;
    }

    .receipt-item-qty {
      width: 50px;
      text-align: center;
      color: #94a3b8;
    }

    .receipt-totals p {
      display: flex;
      justify-content: space-between;
      margin: 0.25rem 0;
    }

    .receipt-total {
      font-weight: 700;
      font-size: 1rem;
      padding-top: 0.5rem;
      margin-top: 0.5rem;
      border-top: 1px solid #475569;
    }

    .receipt-footer {
      text-align: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px dashed #475569;
      color: #94a3b8;
    }

    /* Loading */
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 200;
      color: #e2e8f0;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #334155;
      border-top-color: #22d3ee;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .pos-body {
        flex-direction: column;
      }

      .products-panel {
        flex: none;
        height: 50%;
      }

      .cart-panel {
        width: 100%;
        flex: 1;
      }

      .categories-bar {
        overflow-x: auto;
      }
    }
  `]
})
export class PosComponent implements OnInit {
  private toast = inject(ToastService);

  // Helper methods for template
  isLowStock = checkLowStock;

  // State signals
  isLoading = signal(true);
  isPrinting = signal(false);
  categories = signal<Category[]>([]);
  products = signal<ProductWithStock[]>([]);
  filteredProducts = signal<ProductWithStock[]>([]);
  cart = signal<CartItem[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);
  selectedCategory = signal<string | null>(null);
  searchQuery = signal('');
  discountAmount = signal(0);
  selectedCustomer = signal<Customer | null>(null);
  customerSearch = signal('');
  customerResults = signal<Customer[]>([]);
  editingDiscount = signal(false);

  // Payment modal state
  showPaymentModal = signal(false);
  selectedPaymentMethod = signal<string | null>(null);
  paymentAmount = signal(0);
  paymentReference = signal('');

  // Receipt modal state
  showReceiptModal = signal(false);
  completedReceiptNumber = signal('');
  completedItems = signal<CartItem[]>([]);
  completedSubtotal = signal(0);
  completedTax = signal(0);
  completedTotal = signal(0);
  completedPaid = signal(0);
  completedChange = signal(0);
  completedDateTime = signal('');

  // Computed values
  branchName = computed(() => posService.getCurrentBranch()?.name || 'Select Branch');
  currency = computed(() => posService.getSetting('currency') || 'KES');
  taxRate = computed(() => parseFloat(posService.getSetting('tax_rate') || '0'));
  companyName = computed(() => posService.getSetting('company_name') || 'ERICKO ENTERPRISE');
  companyAddress = computed(() => posService.getSetting('company_address') || '');
  companyPhone = computed(() => posService.getSetting('company_phone') || '');
  servedByName = computed(() => posService.getSetting('cashier_name') || posService.getCurrentTerminal()?.name || '');
  servedByLabel = computed(() => posService.getSetting('receipt_served_by_label') || 'Served By');

  cartSubtotal = computed(() =>
    this.cart().reduce((sum, item) => sum + item.line_total, 0)
  );

  cartTax = computed(() =>
    this.cart().reduce((sum, item) => sum + item.tax_amount, 0)
  );

  cartTotal = computed(() =>
    this.cartSubtotal() - this.discountAmount() + this.cartTax()
  );

  selectedPaymentMethodObj = computed(() =>
    this.paymentMethods().find(m => m.id === this.selectedPaymentMethod())
  );

  paymentChange = computed(() =>
    Math.max(0, this.paymentAmount() - this.cartTotal())
  );

  currentDateTime = signal(this.formatDateTime(new Date()));

  canCompletePayment = computed(() => {
    const method = this.selectedPaymentMethodObj();
    if (!method) return false;
    if (this.paymentAmount() < this.cartTotal()) return false;
    if (method.requires_reference && !this.paymentReference()) return false;
    return true;
  });

  constructor() {
    // Update time every second
    setInterval(() => {
      this.currentDateTime.set(this.formatDateTime(new Date()));
    }, 1000);

    // Update filtered products when search or category changes
    effect(() => {
      const query = this.searchQuery().toLowerCase();
      const categoryId = this.selectedCategory();
      const allProducts = this.products();

      let filtered = allProducts;

      if (categoryId) {
        filtered = filtered.filter(p => p.category_id === categoryId);
      }

      if (query) {
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.barcode && p.barcode.includes(query))
        );
      }

      this.filteredProducts.set(filtered);
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      await posService.initialize();

      const [categories, products, paymentMethods] = await Promise.all([
        posService.getCategories(),
        posService.getProducts(),
        posService.getPaymentMethods()
      ]);

      this.categories.set(categories);
      this.products.set(products);
      this.filteredProducts.set(products);
      this.paymentMethods.set(paymentMethods);
    } catch (error) {
      console.error('Failed to initialize POS:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('en-KE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  selectCategory(categoryId: string | null): void {
    this.selectedCategory.set(categoryId);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  async onSearchEnter(event: Event): Promise<void> {
    const query = this.searchQuery().trim();
    if (!query) return;

    // Try barcode lookup
    if (/^\d+$/.test(query) && query.length >= 8) {
      const product = await posService.getProductByBarcode(query);
      if (product) {
        this.addToCart(product);
        this.searchQuery.set('');
        (event.target as HTMLInputElement).value = '';
        return;
      }
    }

    // Otherwise search
    const products = await posService.searchProducts(query);
    if (products.length > 0) {
      const existingIds = new Set(this.products().map(p => p.id));
      const newProducts = products.filter(p => !existingIds.has(p.id));
      if (newProducts.length > 0) {
        this.products.set([...this.products(), ...newProducts]);
      }
    }
  }

  addToCart(product: ProductWithStock): void {
    const existingIndex = this.cart().findIndex(item => item.product_id === product.id);

    if (existingIndex >= 0) {
      const cart = [...this.cart()];
      const item = cart[existingIndex];
      cart[existingIndex] = {
        ...item,
        quantity: item.quantity + 1,
        line_total: (item.quantity + 1) * item.unit_price
      };
      this.cart.set(cart);
    } else {
      const taxAmount = (product.selling_price * this.taxRate()) / 100;
      const newItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_barcode: product.barcode,
        quantity: 1,
        unit_price: product.selling_price,
        discount_amount: 0,
        tax_amount: taxAmount,
        line_total: product.selling_price
      };
      this.cart.set([...this.cart(), newItem]);
    }
  }

  incrementQty(index: number): void {
    const cart = [...this.cart()];
    const item = cart[index];
    cart[index] = {
      ...item,
      quantity: item.quantity + 1,
      line_total: (item.quantity + 1) * item.unit_price,
      tax_amount: item.tax_amount + (item.unit_price * this.taxRate()) / 100
    };
    this.cart.set(cart);
  }

  decrementQty(index: number): void {
    const cart = [...this.cart()];
    const item = cart[index];
    if (item.quantity > 1) {
      cart[index] = {
        ...item,
        quantity: item.quantity - 1,
        line_total: (item.quantity - 1) * item.unit_price,
        tax_amount: item.tax_amount - (item.unit_price * this.taxRate()) / 100
      };
      this.cart.set(cart);
    }
  }

  removeItem(index: number): void {
    const cart = [...this.cart()];
    cart.splice(index, 1);
    this.cart.set(cart);
  }

  clearCart(): void {
    this.cart.set([]);
    this.discountAmount.set(0);
    this.selectedCustomer.set(null);
  }

  holdSale(): void {
    this.toast.info('Sale hold functionality coming soon!');
  }

  onDiscountInput(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.discountAmount.set(Math.min(value, this.cartSubtotal()));
  }

  onCustomerSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.customerSearch.set(value);

    if (value.length >= 3) {
      posService.searchCustomers(value).then((results: Customer[]) => {
        this.customerResults.set(results);
      });
    } else {
      this.customerResults.set([]);
    }
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer.set(customer);
    this.customerSearch.set('');
    this.customerResults.set([]);
  }

  clearCustomer(): void {
    this.selectedCustomer.set(null);
  }

  openPayment(): void {
    this.showPaymentModal.set(true);
    this.paymentAmount.set(Math.ceil(this.cartTotal()));
    this.paymentReference.set('');
    this.selectedPaymentMethod.set(null);
  }

  closePayment(): void {
    this.showPaymentModal.set(false);
  }

  selectPaymentMethod(methodId: string): void {
    this.selectedPaymentMethod.set(methodId);
    this.paymentAmount.set(Math.ceil(this.cartTotal()));
  }

  onPaymentAmountInput(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.paymentAmount.set(value);
  }

  onPaymentReferenceInput(event: Event): void {
    this.paymentReference.set((event.target as HTMLInputElement).value);
  }

  async completeSale(): Promise<void> {
    if (!this.canCompletePayment()) return;

    this.isLoading.set(true);
    this.closePayment();

    try {
      const payments = [{
        payment_method_id: this.selectedPaymentMethod()!,
        amount: this.paymentAmount(),
        reference_number: this.paymentReference() || undefined
      }];

      const result = await posService.createSale(
        this.cart(),
        payments,
        this.selectedCustomer()?.id,
        this.discountAmount()
      );

      // Store receipt data
      this.completedReceiptNumber.set(result.receipt_number);
      this.completedItems.set([...this.cart()]);
      this.completedSubtotal.set(this.cartSubtotal());
      this.completedTax.set(this.cartTax());
      this.completedTotal.set(result.total);
      this.completedPaid.set(this.paymentAmount());
      this.completedChange.set(this.paymentChange());
      this.completedDateTime.set(new Date().toLocaleString());

      // Clear cart
      this.cart.set([]);
      this.discountAmount.set(0);
      this.selectedCustomer.set(null);

      // Show receipt
      this.showReceiptModal.set(true);
    } catch (error) {
      console.error('Failed to complete sale:', error);
      this.toast.error('Failed to complete sale. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  closeReceipt(): void {
    this.showReceiptModal.set(false);

    // Refresh products to update stock
    this.ngOnInit();
  }

  async printReceipt(): Promise<void> {
    this.isPrinting.set(true);
    try {
      const selectedMethod = this.paymentMethods().find(m => m.id === this.selectedPaymentMethod());
      await printerService.loadSettings();

      const result = await printerService.printReceipt({
        receiptNumber: this.completedReceiptNumber(),
        saleDate: this.completedDateTime(),
        customerName: this.selectedCustomer() ? `${this.selectedCustomer()!.first_name} ${this.selectedCustomer()!.last_name}` : null,
        items: this.completedItems(),
        subtotal: this.completedSubtotal(),
        discount: 0,
        tax: this.completedTax(),
        total: this.completedTotal(),
        paid: this.completedPaid(),
        change: this.completedChange(),
        paymentMethod: selectedMethod?.name || 'Cash',
        servedBy: posService.getSetting('cashier_name') || posService.getCurrentTerminal()?.name || 'Cashier'
      });

      if (!result.success) {
        console.warn('Print result:', result.error);
        this.toast.warning('Printer not reachable. Check printer settings.');
      } else {
        this.toast.success('Receipt sent to printer!');
      }
    } finally {
      this.isPrinting.set(false);
    }
  }
}
