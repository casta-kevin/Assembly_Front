import { InjectionToken } from '@angular/core';

export const APP_API_BASE_URL = new InjectionToken<string>('APP_API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'https://localhost:7270/api',
});
