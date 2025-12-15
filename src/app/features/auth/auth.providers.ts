import { Provider } from '@angular/core';

import { LoginUseCase } from './application/use-cases/login.use-case';
import { AUTH_REPOSITORY } from './domain/repositories/auth.repository';
import { HttpAuthRepository } from './infrastructure/repositories/http-auth.repository';

export function provideAuthFeature(): Provider[] {
  return [
    { provide: AUTH_REPOSITORY, useClass: HttpAuthRepository },
    LoginUseCase,
  ];
}
