import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { AssemblyDetail, AssemblyFilters, AssemblySummary } from '../entities/assembly';

export interface AssembliesRepository {
  findAll(filters?: Partial<AssemblyFilters>): Observable<AssemblySummary[]>;
  findById(id: string): Observable<AssemblyDetail>;
  save(payload: AssemblyDetail): Observable<AssemblyDetail>;
}

export const ASSEMBLIES_REPOSITORY = new InjectionToken<AssembliesRepository>('ASSEMBLIES_REPOSITORY');
