import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ToastContainerComponent } from '../toast-container/toast-container.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  template: `
    <div class="app-layout" [class.mobile-open]="mobileOpen()">
      <!-- Mobile Overlay -->
      @if (mobileOpen()) {
        <div class="mobile-overlay" (click)="closeMobile()"></div>
      }

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo-container">
            <span class="logo-icon">E</span>
            <span class="logo-text">ERICKO POS</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" (click)="closeMobile()">
            <span class="nav-icon">&#128200;</span>
            <span class="nav-label">Dashboard</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/pos" routerLinkActive="active" class="nav-item" (click)="closeMobile()">
            <span class="nav-icon">&#128722;</span>
            <span class="nav-label">Point of Sale</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/products" routerLinkActive="active" class="nav-item" (click)="closeMobile()">
            <span class="nav-icon">&#128230;</span>
            <span class="nav-label">Products</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/categories" routerLinkActive="active" class="nav-item" (click)="closeMobile()">
            <span class="nav-icon">&#128193;</span>
            <span class="nav-label">Categories</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/customers" routerLinkActive="active" class="nav-item" (click)="closeMobile()">
            <span class="nav-icon">&#128101;</span>
            <span class="nav-label">Customers</span>
            <span class="nav-indicator"></span>
          </a>
          <a routerLink="/sales" routerLinkActive="active" class="nav-item" (click)="closeMobile()">
            <span class="nav-icon">&#128179;</span>
            <span class="nav-label">Sales</span>
            <span class="nav-indicator"></span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/settings" routerLinkActive="active" class="nav-item" (click)="closeMobile()">
            <span class="nav-icon">&#9881;</span>
            <span class="nav-label">Settings</span>
            <span class="nav-indicator"></span>
          </a>
          <div class="version">v1.0.0</div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Mobile Header -->
        <header class="mobile-header">
          <button class="mobile-toggle" (click)="toggleMobile()">
            <span></span><span></span><span></span>
          </button>
          <span class="mobile-title">ERICKO POS</span>
        </header>

        <div class="content-area">
          <router-outlet />
        </div>
      </main>

      <app-toast-container />
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      background: #0f172a;
    }

    /* Mobile Overlay */
    .mobile-overlay {
      display: none;
    }

    /* Sidebar */
    .sidebar {
      width: 240px;
      display: flex;
      flex-direction: column;
      background: #1e293b;
      border-right: 1px solid #334155;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 50;
    }

    .sidebar-header {
      padding: 1.25rem;
      border-bottom: 1px solid #334155;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0891b2, #22d3ee);
      border-radius: 0.75rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      box-shadow: 0 0 20px rgba(34, 211, 238, 0.2);
      transition: box-shadow 0.3s;
    }

    .logo-container:hover .logo-icon {
      box-shadow: 0 0 28px rgba(34, 211, 238, 0.4);
    }

    .logo-text {
      font-size: 1.125rem;
      font-weight: 700;
      color: #e2e8f0;
      letter-spacing: 0.5px;
    }

    /* Navigation */
    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      color: #94a3b8;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }

    .nav-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%) scaleY(0);
      width: 3px;
      height: 60%;
      background: #22d3ee;
      border-radius: 0 2px 2px 0;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .nav-item:hover {
      background: rgba(51, 65, 85, 0.5);
      color: #e2e8f0;
      transform: translateX(2px);
    }

    .nav-item.active {
      background: linear-gradient(135deg, rgba(8, 145, 178, 0.2), rgba(34, 211, 238, 0.1));
      color: #22d3ee;
    }

    .nav-item.active::before {
      transform: translateY(-50%) scaleY(1);
    }

    .nav-icon {
      font-size: 1.25rem;
      width: 24px;
      text-align: center;
      transition: transform 0.2s;
    }

    .nav-item:hover .nav-icon {
      transform: scale(1.15);
    }

    .nav-label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .nav-indicator {
      display: none;
    }

    /* Footer */
    .sidebar-footer {
      padding: 1rem 0.75rem;
      border-top: 1px solid #334155;
    }

    .version {
      color: #475569;
      text-align: center;
      font-size: 0.75rem;
      margin-top: 0.5rem;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .content-area {
      flex: 1;
      overflow: hidden;
    }

    /* Mobile Header */
    .mobile-header {
      display: none;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }

    .mobile-toggle {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
    }

    .mobile-toggle span {
      width: 22px;
      height: 2px;
      background: #e2e8f0;
      border-radius: 1px;
      transition: all 0.2s;
    }

    .mobile-title {
      font-size: 1rem;
      font-weight: 700;
      color: #e2e8f0;
    }

    /* Mobile */
    @media (max-width: 768px) {
      .mobile-header {
        display: flex;
      }

      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        transform: translateX(-100%);
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
      }

      .app-layout.mobile-open .sidebar {
        transform: translateX(0);
      }

      .app-layout.mobile-open .mobile-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 40;
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    }
  `]
})
export class LayoutComponent {
  mobileOpen = signal(false);

  toggleMobile(): void {
    this.mobileOpen.update(v => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 768) {
      this.closeMobile();
    }
  }
}
