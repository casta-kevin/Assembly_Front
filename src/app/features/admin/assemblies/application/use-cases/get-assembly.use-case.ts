import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AssemblyDetail } from '../../domain/entities/assembly';
import { ASSEMBLIES_REPOSITORY, AssembliesRepository } from '../../domain/repositories/assemblies.repository';

@Injectable()
export class GetAssemblyUseCase {
  constructor(
    @Inject(ASSEMBLIES_REPOSITORY) private readonly repository: AssembliesRepository,
  ) {}

  execute(id: string): Observable<AssemblyDetail> {
    return this.repository.findById(id);
  }
}
