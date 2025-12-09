import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ResidentAssemblyDetail,
  ResidentAssemblyFilters,
  ResidentAssemblySummary,
  ResidentLiveQuestion,
  ResidentNotification,
  ResidentVoteChoice,
} from '../entities/resident-assembly';

export interface ResidentAssembliesRepository {
  getNotifications(residentId: string): Observable<ResidentNotification[]>;
  getAssignments(residentId: string): Observable<ResidentAssemblySummary[]>;
  getAssignmentDetail(residentId: string, assemblyId: string): Observable<ResidentAssemblyDetail>;
  markNotificationAsRead(notificationId: string): Observable<void>;
  getLiveQuestion(residentId: string, assemblyId: string): Observable<ResidentLiveQuestion | null>;
  submitVote(
    residentId: string,
    assemblyId: string,
    questionId: string,
    choice: ResidentVoteChoice,
  ): Observable<ResidentLiveQuestion>;
}

export const RESIDENT_ASSEMBLIES_REPOSITORY = new InjectionToken<ResidentAssembliesRepository>('RESIDENT_ASSEMBLIES_REPOSITORY');
