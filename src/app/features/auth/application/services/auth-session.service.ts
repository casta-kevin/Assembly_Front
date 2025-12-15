import { Injectable, computed, signal } from '@angular/core';

import { AuthSession } from '../../domain/entities/auth-session';

interface StoredSessionPayload {
  token: string;
  roleId: string;
  propertyId: string;
  user: AuthSession['user'];
  expiresAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly storageKey = 'assembly.auth.session';
  private readonly sessionSignal = signal<AuthSession | null>(this.restoreSession());

  readonly session = computed(() => this.sessionSignal());
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);

  setSession(session: AuthSession, rememberMe: boolean): void {
    this.sessionSignal.set(session);
    this.persistSession(session, rememberMe);
  }

  clearSession(): void {
    this.sessionSignal.set(null);
    if (!this.isBrowser()) {
      return;
    }

    try {
      window.localStorage.removeItem(this.storageKey);
      window.sessionStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('No fue posible limpiar la sesión almacenada.', error);
    }
  }

  private persistSession(session: AuthSession, rememberMe: boolean): void {
    if (!this.isBrowser()) {
      return;
    }

    const target = rememberMe ? window.localStorage : window.sessionStorage;
    const fallback = rememberMe ? window.sessionStorage : window.localStorage;

    const payload = JSON.stringify({
      token: session.token,
      roleId: session.roleId,
      propertyId: session.propertyId,
      user: session.user,
      expiresAt: session.expiresAt ? session.expiresAt.toISOString() : null,
    });

    try {
      target.setItem(this.storageKey, payload);
      fallback.removeItem(this.storageKey);
    } catch (error) {
      console.warn('No fue posible almacenar la sesión de usuario.', error);
    }
  }

  private restoreSession(): AuthSession | null {
    if (!this.isBrowser()) {
      return null;
    }

    const stored = this.readFromStorage(window.localStorage) ?? this.readFromStorage(window.sessionStorage);
    if (!stored) {
      return null;
    }

    const expiresAt = stored.expiresAt ? new Date(stored.expiresAt) : undefined;
    return {
      token: stored.token,
      roleId: stored.roleId,
      propertyId: stored.propertyId,
      user: stored.user,
      expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined,
    } satisfies AuthSession;
  }

  private readFromStorage(storage: Storage): StoredSessionPayload | null {
    try {
      const value = storage.getItem(this.storageKey);
      if (!value) {
        return null;
      }

      const parsed = JSON.parse(value) as Partial<StoredSessionPayload> | null;
      if (!parsed || !parsed.token || !parsed.user || !parsed.roleId || !parsed.propertyId) {
        return null;
      }

      return {
        token: parsed.token,
        roleId: parsed.roleId,
        propertyId: parsed.propertyId,
        user: parsed.user,
        expiresAt: parsed.expiresAt ?? null,
      } satisfies StoredSessionPayload;
    } catch {
      return null;
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }
}
