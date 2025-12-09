import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ResidentLiveQuestion } from '../../domain/entities/resident-assembly';
import { RESIDENT_ASSEMBLIES_REPOSITORY, ResidentAssembliesRepository } from '../../domain/repositories/resident-assemblies.repository';

@Injectable()
export class GetResidentLiveQuestionUseCase {
  private readonly repository = inject<ResidentAssembliesRepository>(RESIDENT_ASSEMBLIES_REPOSITORY);

  execute(residentId: string, assemblyId: string): Observable<ResidentLiveQuestion | null> {
    return this.repository.getLiveQuestion(residentId, assemblyId);
  }
}
