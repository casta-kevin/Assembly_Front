import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AssemblyFilters, AssemblySummary } from '../../domain/entities/assembly';
import { ASSEMBLIES_REPOSITORY, AssembliesRepository } from '../../domain/repositories/assemblies.repository';

@Injectable()
export class LoadAssembliesUseCase {
  constructor(
    @Inject(ASSEMBLIES_REPOSITORY) private readonly repository: AssembliesRepository,
  ) {}

  execute(filters?: Partial<AssemblyFilters>): Observable<AssemblySummary[]> {
    return this.repository.findAll(filters);
  }
}
