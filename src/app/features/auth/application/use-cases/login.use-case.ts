import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthSession } from '../../domain/entities/auth-session';
import { UserCredentials } from '../../domain/entities/user-credentials';
import { AUTH_REPOSITORY, AuthRepository } from '../../domain/repositories/auth.repository';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
  ) {}

  execute(credentials: UserCredentials): Observable<AuthSession> {
    return this.repository.signIn(credentials);
  }
}
