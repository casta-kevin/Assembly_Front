import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { APP_API_BASE_URL } from '../../../../config/api.config';
import { AuthSession } from '../../domain/entities/auth-session';
import { UserCredentials } from '../../domain/entities/user-credentials';
import { AuthRepository } from '../../domain/repositories/auth.repository';

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  errors?: string[];
  data?: T;
  Success?: boolean;
  Message?: string;
  Errors?: string[];
  Data?: T;
};

type LoginResponseDto = {
  token?: string;
  userId?: string;
  propertyId?: string;
  username?: string;
  roleId?: string;
  Token?: string;
  UserId?: string;
  PropertyId?: string;
  Username?: string;
  RoleId?: string;
};

interface LoginRequestDto {
  username: string;
  password: string;
  email?: string;
}

@Injectable()
export class HttpAuthRepository implements AuthRepository {
  constructor(
    private readonly http: HttpClient,
    @Inject(APP_API_BASE_URL) private readonly apiBaseUrl: string,
  ) {}

  signIn(credentials: UserCredentials): Observable<AuthSession> {
    const url = `${this.apiBaseUrl}/auth/login`;
    const identifier = (credentials.email ?? '').trim();
    const payload: LoginRequestDto = {
      username: identifier,
      password: credentials.password,
      email: identifier,
    };

    return this.http.post<ApiResponse<LoginResponseDto>>(url, payload).pipe(
      map((response) => this.mapResponse(response, credentials.email)),
      catchError((error) => {
        const message = this.extractErrorMessage(error) ?? 'No fue posible iniciar sesión. Inténtalo de nuevo más tarde.';
        return throwError(() => new Error(message));
      }),
    );
  }

  private mapResponse(response: ApiResponse<LoginResponseDto>, email: string): AuthSession {
    const normalized = this.normalizeApiResponse(response);
    if (!normalized.success || !normalized.data) {
      const message = normalized.message ?? normalized.errors?.[0] ?? 'Las credenciales no son válidas.';
      throw new Error(message);
    }

    const payload = this.normalizeLoginPayload(normalized.data);
    if (!payload) {
      throw new Error('La respuesta del servidor es inválida.');
    }

    const { token, userId, propertyId, username, roleId } = payload;

    if (!token || !userId || !roleId) {
      throw new Error('La respuesta del servidor está incompleta.');
    }

    return {
      user: {
        id: userId,
        name: username || this.buildFallbackName(email),
        email,
      },
      token,
      propertyId: propertyId ?? '',
      roleId,
      expiresAt: this.estimateExpiry(token),
    };
  }

  private normalizeApiResponse<T>(response: ApiResponse<T>) {
    return {
      success: response.success ?? response.Success ?? false,
      message: response.message ?? response.Message,
      errors: response.errors ?? response.Errors,
      data: response.data ?? response.Data,
    };
  }

  private normalizeLoginPayload(payload?: LoginResponseDto | null) {
    if (!payload) {
      return null;
    }

    return {
      token: payload.token ?? payload.Token ?? '',
      userId: payload.userId ?? payload.UserId ?? '',
      propertyId: payload.propertyId ?? payload.PropertyId ?? '',
      username: payload.username ?? payload.Username ?? '',
      roleId: payload.roleId ?? payload.RoleId ?? '',
    };
  }

  private buildFallbackName(email: string): string {
    const [name] = email.split('@');
    if (!name) {
      return 'Usuario Assembly';
    }

    return name
      .split(/[._-]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private estimateExpiry(token: string): Date | undefined {
    try {
      const [, payload] = token.split('.');
      if (!payload) {
        return undefined;
      }

      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof decoded.exp !== 'number') {
        return undefined;
      }

      return new Date(decoded.exp * 1000);
    } catch {
      return undefined;
    }
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (!error) {
      return undefined;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object') {
      const maybeResponse = error as { error?: ApiResponse<unknown>; message?: string; statusText?: string };
      if (maybeResponse.error) {
        return maybeResponse.error.message ?? maybeResponse.error.errors?.[0];
      }
      return maybeResponse.message ?? maybeResponse.statusText;
    }

    if (typeof error === 'string') {
      return error;
    }

    return undefined;
  }
}
