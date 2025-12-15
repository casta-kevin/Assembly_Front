import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme-preference';

  /** Current theme setting (light, dark, or system) */
  readonly theme = signal<Theme>(this.getInitialTheme());

  /** Resolved theme based on system preference if theme is 'system' */
  readonly resolvedTheme = signal<'light' | 'dark'>(this.resolveTheme(this.theme()));

  constructor() {
    // Effect to apply theme changes to the DOM
    effect(() => {
      const theme = this.theme();
      const resolved = this.resolveTheme(theme);
      this.resolvedTheme.set(resolved);
      this.applyTheme(resolved);
      localStorage.setItem(this.STORAGE_KEY, theme);
    });

    // Listen for system theme changes
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (this.theme() === 'system') {
          this.resolvedTheme.set(e.matches ? 'dark' : 'light');
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /** Toggle between light and dark themes */
  toggleTheme(): void {
    const current = this.resolvedTheme();
    this.theme.set(current === 'light' ? 'dark' : 'light');
  }

  /** Set a specific theme */
  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  private getInitialTheme(): Theme {
    if (typeof window === 'undefined') return 'light';

    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored;
    }
    return 'light';
  }

  private resolveTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'system') {
      if (typeof window === 'undefined') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  private applyTheme(resolvedTheme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }
}
