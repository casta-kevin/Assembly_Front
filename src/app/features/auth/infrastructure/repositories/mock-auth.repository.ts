import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { AuthSession } from '../../domain/entities/auth-session';
import { UserCredentials } from '../../domain/entities/user-credentials';
import { AuthRepository } from '../../domain/repositories/auth.repository';

@Injectable()
export class MockAuthRepository implements AuthRepository {
  signIn(credentials: UserCredentials): Observable<AuthSession> {
    const email = (credentials.email ?? '').trim().toLowerCase() || 'usuario@assembly.local';
    const password = (credentials.password ?? '').trim();

    const timestamp = Date.now();
    const session: AuthSession = {
      user: {
        id: this.generateId(email),
        name: this.buildNameFromEmail(email),
        email,
        avatarUrl: this.buildAvatar(email),
      },
      token: this.generateToken(email, timestamp),
      propertyId: 'mock-property-id',
      roleId: email.includes('admin') ? 'admin' : 'resident',
      refreshToken: credentials.rememberMe ? this.generateToken(email, timestamp + 1) : undefined,
      expiresAt: new Date(timestamp + 1000 * 60 * 45),
    };

    return of(session).pipe(delay(500));
  }

  private buildNameFromEmail(email: string): string {
    if (!email.includes('@')) {
      return 'Usuario Asamblea';
    }

    const [name = 'Usuario'] = email.split('@');
    return name
      .split(/[._-]+/)
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ');
  }

  private buildAvatar(email: string): string {
    const seed = encodeURIComponent(email);
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=4f46e5&fontWeight=600`;
  }

  private generateToken(email: string, time: number): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${crypto.randomUUID()}-${time}`;
    }

    const hash = this.hashCode(`${email}:${time}`);
    return `${Math.abs(hash)}-${time}`;
  }

  private generateId(email: string): string {
    return `user-${Math.abs(this.hashCode(email))}`;
  }

  private hashCode(source: string): number {
    let hash = 0;
    for (let index = 0; index < source.length; index += 1) {
      hash = (hash << 5) - hash + source.charCodeAt(index);
      hash |= 0;
    }
    return hash;
  }
}
