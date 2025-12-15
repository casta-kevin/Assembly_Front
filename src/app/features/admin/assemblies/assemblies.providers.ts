import { Provider } from '@angular/core';

import { LoadAssembliesUseCase } from './application/use-cases/load-assemblies.use-case';
import { GetAssemblyUseCase } from './application/use-cases/get-assembly.use-case';
import { SaveAssemblyUseCase } from './application/use-cases/save-assembly.use-case';
import { ASSEMBLIES_REPOSITORY } from './domain/repositories/assemblies.repository';
import { HttpAssembliesRepository } from './infrastructure/repositories/http-assemblies.repository';
import { SaveAgendaUseCase } from './application/use-cases/save-agenda.use-case';

export function provideAssembliesFeature(): Provider[] {
  return [
    { provide: ASSEMBLIES_REPOSITORY, useClass: HttpAssembliesRepository },
    LoadAssembliesUseCase,
    GetAssemblyUseCase,
    SaveAssemblyUseCase,
    SaveAgendaUseCase,
  ];
}
