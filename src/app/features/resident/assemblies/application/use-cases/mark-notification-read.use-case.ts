import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { RESIDENT_ASSEMBLIES_REPOSITORY, ResidentAssembliesRepository } from '../../domain/repositories/resident-assemblies.repository';

@Injectable()
export class MarkNotificationReadUseCase {
  private readonly repository = inject<ResidentAssembliesRepository>(RESIDENT_ASSEMBLIES_REPOSITORY);

  execute(notificationId: string): Observable<void> {
    return this.repository.markNotificationAsRead(notificationId);
  }
}
