import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarNavigationComponent } from './core/components/sidebar/sidebar-navigation.component';
import { ThemeToggleComponent } from './core/components/theme-toggle/theme-toggle.component';
import { ThemeService } from './core/services/theme.service';
import { LogoutButtonComponent } from './features/auth/presentation/logout/logout-button.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LogoutButtonComponent, ThemeToggleComponent, SidebarNavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Inject ThemeService to initialize it on app startup
  private readonly themeService = inject(ThemeService);
}
