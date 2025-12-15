import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { AgendaTopic, AssemblyDetail, AssemblyFilters, AssemblySummary } from '../entities/assembly';

export interface AssembliesRepository {
  findAll(filters?: Partial<AssemblyFilters>): Observable<AssemblySummary[]>;
  findById(id: string): Observable<AssemblyDetail>;
  save(payload: AssemblyDetail): Observable<AssemblyDetail>;
  saveAgenda(payload: {
    assemblyId: string;
    agenda: AgendaTopic[];
    startAt: string;
    endAt: string;
  }): Observable<void>;
}

export const ASSEMBLIES_REPOSITORY = new InjectionToken<AssembliesRepository>('ASSEMBLIES_REPOSITORY');
