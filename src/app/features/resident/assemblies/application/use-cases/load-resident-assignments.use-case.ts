import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ResidentAssemblySummary } from '../../domain/entities/resident-assembly';
import { RESIDENT_ASSEMBLIES_REPOSITORY, ResidentAssembliesRepository } from '../../domain/repositories/resident-assemblies.repository';

@Injectable()
export class LoadResidentAssignmentsUseCase {
  private readonly repository = inject<ResidentAssembliesRepository>(RESIDENT_ASSEMBLIES_REPOSITORY);

  execute(residentId: string): Observable<ResidentAssemblySummary[]> {
    return this.repository.getAssignments(residentId);
  }
}
