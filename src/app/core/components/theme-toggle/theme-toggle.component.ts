import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="theme-toggle"
      [attr.aria-label]="isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      [title]="isDark() ? 'Modo claro' : 'Modo oscuro'"
      (click)="toggle()"
    >
      @if (isDark()) {
        <!-- Sun icon for dark mode (click to go light) -->
        <svg
          class="theme-toggle__icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      } @else {
        <!-- Moon icon for light mode (click to go dark) -->
        <svg
          class="theme-toggle__icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      }
    </button>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .theme-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        padding: 0;
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid rgba(255, 255, 255, 0.25);
        border-radius: var(--radius);
        color: #ffffff;
        cursor: pointer;
        transition: all 200ms ease;
        backdrop-filter: blur(4px);

        &:hover {
          background: rgba(255, 190, 0, 0.9);
          border-color: rgba(255, 190, 0, 1);
          color: #000000;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 190, 0, 0.4);
        }

        &:focus-visible {
          outline: 2px solid #ffbe00;
          outline-offset: 2px;
        }

        &:active {
          transform: scale(0.95);
        }
      }

      .theme-toggle__icon {
        width: 22px;
        height: 22px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);

  protected readonly isDark = () => this.themeService.resolvedTheme() === 'dark';

  protected toggle(): void {
    this.themeService.toggleTheme();
  }
}
