import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthSessionService } from '../../application/services/auth-session.service';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="logout-button"
      title="Cerrar sesión"
      (click)="logout()"
      [disabled]="!isAuthenticated()"
      aria-live="polite"
    >
      <svg
        class="logout-button__icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" x2="9" y1="12" y2="12" />
      </svg>
      <span class="logout-button__text">Cerrar sesión</span>
    </button>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .logout-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1.25rem;
        background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
        color: #ffffff;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: var(--radius-button);
        font-size: var(--text-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all 200ms ease;
        box-shadow: 0 4px 12px rgba(229, 57, 53, 0.4);
      }

      .logout-button:hover {
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(229, 57, 53, 0.5);
        border-color: rgba(255, 255, 255, 0.4);
      }

      .logout-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .logout-button:focus-visible {
        outline: 2px solid #ffbe00;
        outline-offset: 2px;
      }

      .logout-button:active {
        transform: scale(0.98);
      }

      .logout-button__icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .logout-button__text {
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      @media (max-width: 480px) {
        .logout-button__text {
          display: none;
        }

        .logout-button {
          padding: 0.6rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutButtonComponent {
  private readonly sessionService = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.sessionService.isAuthenticated;

  protected logout(): void {
    this.sessionService.clearSession();
    void this.router.navigate(['/']);
  }
}
