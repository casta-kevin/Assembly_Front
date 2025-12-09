import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AssemblyDetail } from '../../domain/entities/assembly';
import { ASSEMBLIES_REPOSITORY, AssembliesRepository } from '../../domain/repositories/assemblies.repository';

@Injectable()
export class SaveAssemblyUseCase {
  constructor(
    @Inject(ASSEMBLIES_REPOSITORY) private readonly repository: AssembliesRepository,
  ) {}

  execute(payload: AssemblyDetail): Observable<AssemblyDetail> {
    return this.repository.save(payload);
  }
}
