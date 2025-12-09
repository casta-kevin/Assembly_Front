import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthSession } from '../entities/auth-session';
import { UserCredentials } from '../entities/user-credentials';

export interface AuthRepository {
  signIn(credentials: UserCredentials): Observable<AuthSession>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AUTH_REPOSITORY');
