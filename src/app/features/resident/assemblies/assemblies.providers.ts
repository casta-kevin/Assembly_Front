import { Provider } from '@angular/core';

import { LoadResidentNotificationsUseCase } from './application/use-cases/load-resident-notifications.use-case';
import { LoadResidentAssignmentsUseCase } from './application/use-cases/load-resident-assignments.use-case';
import { GetResidentAssemblyDetailUseCase } from './application/use-cases/get-resident-assembly-detail.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { GetResidentLiveQuestionUseCase } from './application/use-cases/get-resident-live-question.use-case';
import { SubmitResidentVoteUseCase } from './application/use-cases/submit-resident-vote.use-case';
import { RESIDENT_ASSEMBLIES_REPOSITORY } from './domain/repositories/resident-assemblies.repository';
import { MockResidentAssembliesRepository } from './infrastructure/repositories/mock-resident-assemblies.repository';

export function provideResidentAssembliesFeature(): Provider[] {
  return [
    { provide: RESIDENT_ASSEMBLIES_REPOSITORY, useClass: MockResidentAssembliesRepository },
    LoadResidentNotificationsUseCase,
    LoadResidentAssignmentsUseCase,
    GetResidentAssemblyDetailUseCase,
    MarkNotificationReadUseCase,
    GetResidentLiveQuestionUseCase,
    SubmitResidentVoteUseCase,
  ];
}
