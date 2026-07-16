import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" (click)="toastService.dismiss(toast.id)">
          <span class="toast-icon">{{ getIcon(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <span class="toast-close">&#215;</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: 0.625rem;
      background: #1e293b;
      border: 1px solid #334155;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      color: #e2e8f0;
      font-size: 0.875rem;
      cursor: pointer;
      pointer-events: auto;
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      transition: transform 0.2s, opacity 0.2s;
    }

    .toast:hover {
      transform: translateX(-4px);
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }

    .toast-success { border-left: 3px solid #22c55e; }
    .toast-error { border-left: 3px solid #ef4444; }
    .toast-warning { border-left: 3px solid #f59e0b; }
    .toast-info { border-left: 3px solid #22d3ee; }

    .toast-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .toast-success .toast-icon { color: #4ade80; }
    .toast-error .toast-icon { color: #f87171; }
    .toast-warning .toast-icon { color: #fbbf24; }
    .toast-info .toast-icon { color: #22d3ee; }

    .toast-message {
      flex: 1;
      line-height: 1.4;
    }

    .toast-close {
      color: #64748b;
      font-size: 1.125rem;
      flex-shrink: 0;
      transition: color 0.15s;
    }

    .toast:hover .toast-close {
      color: #94a3b8;
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  getIcon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: '\u2713',
      error: '\u2717',
      warning: '\u26A0',
      info: '\u2139'
    };
    return icons[type];
  }
}
