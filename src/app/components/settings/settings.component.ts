import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { printerService, PrintSettings } from '../../../core/services/printer.service';
import { ToastService } from '../../../core/services/toast.service';

interface SettingRow {
  key: string;
  value: string;
  description: string | null;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <header class="page-header">
        <div>
          <h1>Settings</h1>
          <p class="subtitle">Configure printer, receipt layout, and system settings</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="testPrint()" [disabled]="isTesting()">
            {{ isTesting() ? 'Testing...' : 'Test Print' }}
          </button>
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading settings...</span>
        </div>
      } @else {
        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn" [class.active]="activeTab() === 'printer'" (click)="activeTab.set('printer')">
            Printer
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'receipt'" (click)="activeTab.set('receipt')">
            Receipt Layout
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'company'" (click)="activeTab.set('company')">
            Company Info
          </button>
        </div>

        <div class="settings-content">
          <!-- Printer Settings -->
          @if (activeTab() === 'printer') {
            <div class="settings-section">
              <h3>Printer Configuration</h3>

              <div class="form-grid">
                <div class="form-group">
                  <label>Printer Type</label>
                  <select [(value)]="settings().printer_type" (change)="settingChanged()">
                    <option value="network">Network (WiFi)</option>
                    <option value="usb">USB</option>
                    <option value="bluetooth">Bluetooth</option>
                  </select>
                </div>

                @if (settings().printer_type === 'network') {
                  <div class="form-group">
                    <label>Printer IP Address</label>
                    <input type="text" [(value)]="settings().printer_ip" placeholder="192.168.1.100" />
                    <span class="hint">IP address of your Xprinter on the network</span>
                  </div>

                  <div class="form-group">
                    <label>Port</label>
                    <input type="text" [(value)]="settings().printer_port" placeholder="9100" />
                    <span class="hint">Default: 9100 for most network printers</span>
                  </div>
                }
              </div>

              <h3>Paper Settings</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label>Paper Width</label>
                  <select [(value)]="settings().printer_paper_width" (change)="settingChanged()">
                    <option value="58">58mm (2.25 inch)</option>
                    <option value="80">80mm (3 inch)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Lines to Feed Before Cut</label>
                  <input type="number" [(value)]="settings().printer_feed_lines" min="0" max="20" />
                  <span class="hint">Recommended: 5-8 lines</span>
                </div>
              </div>

              <h3>Auto-Cut Settings (Xprinter)</h3>
              <div class="form-grid">
                <div class="form-group toggle-group">
                  <label>
                    <input type="checkbox" [(checked)]="settings().printer_auto_cut" (change)="settingChanged()" />
                    <span class="toggle-label">Enable Auto Paper Cut</span>
                  </label>
                  <span class="hint">Automatically cut paper after printing each receipt</span>
                </div>

                <div class="form-group" [class.disabled]="settings().printer_auto_cut !== 'true'">
                  <label>Cut Type</label>
                  <select [(value)]="settings().printer_cut_type" [disabled]="settings().printer_auto_cut !== 'true'">
                    <option value="full">Full Cut (clean separation)</option>
                    <option value="partial">Partial Cut (easier tear)</option>
                  </select>
                </div>
              </div>
            </div>
          }

          <!-- Receipt Layout Settings -->
          @if (activeTab() === 'receipt') {
            <div class="settings-section">
              <h3>Receipt Header</h3>
              <div class="toggle-grid">
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_header === 'true'" (change)="updateSetting('receipt_show_header', $event)" />
                    Show Header (Company Name)
                  </label>
                </div>
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_company_info === 'true'" (change)="updateSetting('receipt_show_company_info', $event)" [disabled]="settings().receipt_show_header !== 'true'" />
                    Show Company Address &amp; Phone
                  </label>
                </div>
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_logo === 'true'" (change)="updateSetting('receipt_show_logo', $event)" />
                    Show Logo
                  </label>
                </div>
              </div>
              <div class="form-grid single-col">
                <div class="form-group" [class.disabled]="settings().receipt_show_logo !== 'true'">
                  <label>Logo Upload (max 100KB)</label>
                  <input type="file" accept="image/png, image/jpeg" (change)="onLogoUpload($event)" [disabled]="settings().receipt_show_logo !== 'true'" />
                  <span class="hint">Recommended: Black & White PNG or JPG. Image is converted to Base64.</span>
                  @if (settings().logo_base64) {
                    <div style="margin-top: 0.5rem; text-align: center; background: #fff; padding: 0.5rem; width: fit-content; border-radius: 4px;">
                      <img [src]="settings().logo_base64" alt="Receipt Logo" style="max-height: 80px;" />
                      <button (click)="removeLogo()" style="display: block; margin: 0.5rem auto 0; background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; cursor: pointer;">Remove Logo</button>
                    </div>
                  }
                </div>
                <div class="form-group">
                  <label>Custom Header Line (optional)</label>
                  <input type="text" [(value)]="settings().receipt_header_line" placeholder="e.g. Welcome to our store" />
                  <span class="hint">Appears below company info on the receipt</span>
                </div>
              </div>

              <h3>Date &amp; Time</h3>
              <div class="toggle-grid">
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_timestamp === 'true'" (change)="updateSetting('receipt_show_timestamp', $event)" />
                    Show Date &amp; Time
                  </label>
                </div>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Timestamp Format</label>
                  <select [(value)]="settings().receipt_timestamp_format">
                    <option value="full">Full Date &amp; Time (default)</option>
                    <option value="date_only">Date Only</option>
                    <option value="time_only">Time Only</option>
                    <option value="iso">ISO Format (machine readable)</option>
                  </select>
                </div>
              </div>

              <h3>Served By / Cashier</h3>
              <div class="toggle-grid">
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_served_by === 'true'" (change)="updateSetting('receipt_show_served_by', $event)" />
                    Show "Served By" on Receipt
                  </label>
                </div>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Served By Label</label>
                  <input type="text" [(value)]="settings().receipt_served_by_label" placeholder="Served By" />
                  <span class="hint">The label shown before the cashier name</span>
                </div>
                <div class="form-group">
                  <label>Cashier Name</label>
                  <input type="text" [(value)]="settings().cashier_name" placeholder="e.g. John Doe" />
                  <span class="hint">Name printed as the person who served the customer</span>
                </div>
              </div>

              <h3>Customer &amp; Items</h3>
              <div class="toggle-grid">
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_customer_info === 'true'" (change)="updateSetting('receipt_show_customer_info', $event)" />
                    Show Customer Name
                  </label>
                </div>
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_item_count === 'true'" (change)="updateSetting('receipt_show_item_count', $event)" />
                    Show Total Item Count
                  </label>
                </div>
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_tax === 'true'" (change)="updateSetting('receipt_show_tax', $event)" />
                    Show Tax Breakdown
                  </label>
                </div>
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_subtotal === 'true'" (change)="updateSetting('receipt_show_subtotal', $event)" />
                    Show Subtotal
                  </label>
                </div>
              </div>

              <h3>Payment Details</h3>
              <div class="toggle-grid">
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_payment_details === 'true'" (change)="updateSetting('receipt_show_payment_details', $event)" />
                    Show Payment Method &amp; Amount Paid
                  </label>
                </div>
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_change === 'true'" (change)="updateSetting('receipt_show_change', $event)" [disabled]="settings().receipt_show_payment_details !== 'true'" />
                    Show Change Amount
                  </label>
                </div>
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_barcode === 'true'" (change)="updateSetting('receipt_show_barcode', $event)" />
                    Show Receipt Barcode
                  </label>
                </div>
                <div class="toggle-item">
                  <label>
                    <input type="checkbox" [checked]="settings().receipt_show_qr === 'true'" (change)="updateSetting('receipt_show_qr', $event)" />
                    Show QR Code
                  </label>
                </div>
              </div>

              <h3>Receipt Footer</h3>
              <div class="form-grid single-col">
                <div class="form-group">
                  <label>Footer Line 1</label>
                  <input type="text" [(value)]="settings().receipt_footer_line1" placeholder="Thank you for your business!" />
                </div>
                <div class="form-group">
                  <label>Footer Line 2</label>
                  <input type="text" [(value)]="settings().receipt_footer_line2" placeholder="Optional second line" />
                </div>
                <div class="form-group">
                  <label>Footer Line 3</label>
                  <input type="text" [(value)]="settings().receipt_footer_line3" placeholder="Optional third line" />
                </div>
              </div>

              <h3>Print Options</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label>Font Size</label>
                  <select [(value)]="settings().receipt_font_size" (change)="settingChanged()">
                    <option value="small">Small</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Number of Copies</label>
                  <input type="number" [(value)]="settings().receipt_print_copy" min="1" max="3" />
                  <span class="hint">Print multiple copies per sale</span>
                </div>
              </div>
            </div>
          }

          <!-- Company Info Settings -->
          @if (activeTab() === 'company') {
            <div class="settings-section">
              <h3>Company Information (Printed on Receipt)</h3>

              <div class="form-grid single-col">
                <div class="form-group">
                  <label>Company Name</label>
                  <input type="text" [(value)]="settings().company_name" placeholder="ERICKO ENTERPRISE" />
                </div>

                <div class="form-group">
                  <label>Address</label>
                  <input type="text" [(value)]="settings().company_address" placeholder="123 Main Street, Nairobi" />
                </div>

                <div class="form-group">
                  <label>Phone</label>
                  <input type="tel" [(value)]="settings().company_phone" placeholder="+254700000000" />
                </div>

                <div class="form-group">
                  <label>Currency</label>
                  <select [(value)]="settings().currency">
                    <option value="KES">KES - Kenyan Shilling</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="UGX">UGX - Ugandan Shilling</option>
                    <option value="TZS">TZS - Tanzanian Shilling</option>
                    <option value="RWF">RWF - Rwandan Franc</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Default Tax Rate (%)</label>
                  <input type="number" [(value)]="settings().tax_rate" min="0" max="30" step="0.5" />
                  <span class="hint">Default: 16% (VAT)</span>
                </div>
              </div>
            </div>
          }

          <!-- Action Buttons -->
          <div class="actions-bar">
            <button class="btn-primary" (click)="saveSettings()" [disabled]="isSaving()">
              {{ isSaving() ? 'Saving...' : 'Save Settings' }}
            </button>
            @if (saveMessage()) {
              <span class="save-message" [class.error]="saveMessage().includes('Failed')">
                {{ saveMessage() }}
              </span>
            }
          </div>
        </div>
      }
    </div>

    <!-- Test Print Modal -->
    @if (showTestModal()) {
      <div class="modal-overlay" (click)="closeTestModal()">
        <div class="test-modal anim-scale-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Test Print Result</h2>
            <button class="close-btn" (click)="closeTestModal()">&#215;</button>
          </div>
          <div class="modal-body">
            @if (testResult()?.success) {
              <div class="test-success">
                <span class="success-icon">&#10003;</span>
                <p>Test print sent successfully!</p>
                <p class="hint">Check your printer for the test receipt.</p>
              </div>
            } @else {
              <div class="test-error">
                <span class="error-icon">&#10007;</span>
                <p>Test print failed</p>
                <p class="error-detail">{{ testResult()?.error }}</p>
                <div class="fallback-info">
                  <h4>Troubleshooting:</h4>
                  <ol>
                    <li>Ensure printer is powered on and has paper</li>
                    <li>Check the IP address is correct</li>
                    <li>Verify printer is on the same network</li>
                    <li>Try using USB connection instead</li>
                  </ol>
                </div>
              </div>
            }
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeTestModal()">Close</button>
            @if (!testResult()?.success) {
              <button class="btn-primary" (click)="testPrint()">Try Again</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .settings-page {
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

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #334155;
    }

    .tab-btn {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .tab-btn::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 50%;
      width: 0;
      height: 2px;
      background: #22d3ee;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(-50%);
    }

    .tab-btn.active::after {
      width: 100%;
    }

    .tab-btn:hover {
      color: #e2e8f0;
    }

    .tab-btn.active {
      color: #22d3ee;
      border-bottom-color: #22d3ee;
    }

    /* Settings Content */
    .settings-content {
      background: #1e293b;
      border-radius: 0.75rem;
      border: 1px solid #334155;
      padding: 1.5rem;
    }

    .settings-section h3 {
      margin: 0 0 1rem;
      font-size: 1rem;
      color: #e2e8f0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #334155;
    }

    .settings-section h3:not(:first-child) {
      margin-top: 2rem;
      animation: fadeIn 0.3s ease-out;
    }

    /* Form Grid */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .form-grid.single-col {
      grid-template-columns: 1fr;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group.disabled {
      opacity: 0.5;
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #94a3b8;
      cursor: pointer;
    }

    .form-group input,
    .form-group select {
      padding: 0.75rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.875rem;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #22d3ee;
    }

    .form-group .hint {
      font-size: 0.75rem;
      color: #64748b;
    }

    .toggle-group .form-group {
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 0.5rem;
    }

    .toggle-label {
      color: #e2e8f0;
    }

    /* Toggle Grid */
    .toggle-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .toggle-item {
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 0.5rem;
    }

    .toggle-item label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      color: #e2e8f0;
      font-size: 0.875rem;
    }

    .toggle-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #0891b2;
      cursor: pointer;
      transition: transform 0.15s;
    }

    .toggle-item input[type="checkbox"]:checked {
      transform: scale(1.1);
    }

    /* Actions Bar */
    .actions-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #334155;
    }

    .save-message {
      font-size: 0.875rem;
      color: #22c55e;
    }

    .save-message.error {
      color: #ef4444;
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

    .test-modal {
      background: #1e293b;
      border-radius: 1rem;
      width: 90%;
      max-width: 450px;
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

    .test-success, .test-error {
      text-align: center;
      padding: 1rem;
    }

    .success-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: #14532d;
      color: #22c55e;
      border-radius: 50%;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }

    .error-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: #7f1d1d;
      color: #ef4444;
      border-radius: 50%;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }

    .test-success p {
      margin: 0.25rem 0;
      color: #e2e8f0;
    }

    .test-error p {
      margin: 0.25rem 0;
      color: #e2e8f0;
    }

    .error-detail {
      color: #ef4444;
      font-family: monospace;
      font-size: 0.75rem;
    }

    .fallback-info {
      text-align: left;
      margin-top: 1rem;
      padding: 1rem;
      background: #0f172a;
      border-radius: 0.5rem;
    }

    .fallback-info h4 {
      margin: 0 0 0.5rem;
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .fallback-info ol {
      margin: 0;
      padding-left: 1.25rem;
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .fallback-info li {
      margin: 0.25rem 0;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #334155;
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  private toast = inject(ToastService);
  isLoading = signal(true);
  isSaving = signal(false);
  isTesting = signal(false);
  activeTab = signal<'printer' | 'receipt' | 'company'>('printer');
  saveMessage = signal('');
  showTestModal = signal(false);
  testResult = signal<{ success: boolean; error?: string } | null>(null);

  settings = signal<PrintSettings>({
    printer_type: 'network',
    printer_ip: '192.168.1.100',
    printer_port: '9100',
    printer_paper_width: '80',
    printer_auto_cut: 'true',
    printer_cut_type: 'full',
    printer_feed_lines: '5',
    receipt_show_logo: 'true',
    receipt_show_barcode: 'false',
    receipt_show_qr: 'false',
    receipt_font_size: 'normal',
    receipt_show_tax: 'true',
    receipt_footer_line1: 'Thank you for your business!',
    receipt_footer_line2: '',
    receipt_footer_line3: '',
    receipt_print_copy: '1',
    company_name: 'ERICKO ENTERPRISE',
    company_address: '',
    company_phone: '',
    currency: 'KES',
    tax_rate: '16',
    receipt_show_header: 'true',
    receipt_show_company_info: 'true',
    receipt_show_customer_info: 'true',
    receipt_show_payment_details: 'true',
    receipt_show_served_by: 'true',
    receipt_show_timestamp: 'true',
    receipt_timestamp_format: 'full',
    receipt_served_by_label: 'Served By',
    receipt_header_line: '',
    receipt_show_item_count: 'true',
    receipt_show_subtotal: 'true',
    receipt_show_change: 'true',
    cashier_name: '',
    logo_base64: ''
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.loadSettings();
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadSettings(): Promise<void> {
    const settings = await printerService.loadSettings();
    this.settings.set(settings);
  }

  settingChanged(): void {
    // Mark as changed
  }

  updateSetting(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.settings.update(s => ({ ...s, [key]: checked ? 'true' : 'false' }));
  }

  onLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 150000) { // Limit to ~150KB
        this.toast.error('Logo file size must be less than 150KB.');
        input.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        this.settings.update(s => ({ ...s, logo_base64: base64 }));
        this.toast.success('Logo uploaded and converted successfully!');
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogo(): void {
    this.settings.update(s => ({ ...s, logo_base64: '' }));
    this.toast.info('Logo removed.');
  }

  async saveSettings(): Promise<void> {
    this.isSaving.set(true);
    this.saveMessage.set('');

    try {
      const currentSettings = this.settings();
      localStorage.setItem('ericko_pos_settings', JSON.stringify(currentSettings));

      this.saveMessage.set('Settings saved successfully!');
      this.toast.success('Settings saved successfully!');
      setTimeout(() => this.saveMessage.set(''), 3000);
    } catch {
      this.saveMessage.set('Failed to save settings');
      this.toast.error('Failed to save settings');
    } finally {
      this.isSaving.set(false);
    }
  }

  async testPrint(): Promise<void> {
    this.isTesting.set(true);
    try {
      const result = await printerService.testPrint();
      this.testResult.set(result);
      this.showTestModal.set(true);
    } catch (error: any) {
      this.testResult.set({ success: false, error: error.message });
      this.showTestModal.set(true);
    } finally {
      this.isTesting.set(false);
    }
  }

  closeTestModal(): void {
    this.showTestModal.set(false);
  }
}
