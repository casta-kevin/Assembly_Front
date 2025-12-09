import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ResidentLiveQuestion, ResidentVoteChoice } from '../../domain/entities/resident-assembly';
import { RESIDENT_ASSEMBLIES_REPOSITORY, ResidentAssembliesRepository } from '../../domain/repositories/resident-assemblies.repository';

@Injectable()
export class SubmitResidentVoteUseCase {
  private readonly repository = inject<ResidentAssembliesRepository>(RESIDENT_ASSEMBLIES_REPOSITORY);

  execute(
    residentId: string,
    assemblyId: string,
    questionId: string,
    choice: ResidentVoteChoice,
  ): Observable<ResidentLiveQuestion> {
    return this.repository.submitVote(residentId, assemblyId, questionId, choice);
  }
}
