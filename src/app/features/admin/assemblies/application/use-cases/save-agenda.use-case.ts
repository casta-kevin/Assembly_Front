import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AgendaTopic } from '../../domain/entities/assembly';
import { ASSEMBLIES_REPOSITORY, AssembliesRepository } from '../../domain/repositories/assemblies.repository';

@Injectable()
export class SaveAgendaUseCase {
  constructor(
    @Inject(ASSEMBLIES_REPOSITORY) private readonly repository: AssembliesRepository,
  ) {}

  execute(payload: { assemblyId: string; agenda: AgendaTopic[]; startAt: string; endAt: string }): Observable<void> {
    return this.repository.saveAgenda(payload);
  }
}
