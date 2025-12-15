import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError, startWith } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LoadResidentAssignmentsUseCase } from '../../../assemblies/application/use-cases/load-resident-assignments.use-case';
import {
  ResidentAssemblyFilterStatus,
  ResidentAssemblyFilters,
  ResidentAssemblySummary,
} from '../../../assemblies/domain/entities/resident-assembly';
import { assemblyStatusBadge, assemblyStatusLabel } from '../../../../admin/assemblies/domain/entities/assembly-status.utils';

@Component({
  selector: 'app-resident-assemblies-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './resident-assemblies-list.component.html',
  styleUrl: './resident-assemblies-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentAssembliesListComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loadAssignments = inject(LoadResidentAssignmentsUseCase);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly residentId = 'res-001';

  protected readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['todas' as ResidentAssemblyFilterStatus],
  });

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly assignments = signal<ResidentAssemblySummary[]>([]);
  private readonly currentFilters = signal<ResidentAssemblyFilters>({ status: 'todas', search: '' });
  protected readonly statusLabel = assemblyStatusLabel;
  protected readonly badgeClass = assemblyStatusBadge;

  protected readonly filteredAssignments = computed(() => {
    const list = this.assignments();
    const filters = this.currentFilters();

    return list.filter((item) => {
      const matchesStatus = filters.status === 'todas'
        ? true
        : filters.status === 'proximas'
          ? item.status === 'DRFT'
          : filters.status === 'en-curso'
            ? item.status === 'INPR'
            : item.status === 'FNLC';

      const matchesSearch = filters.search
        ? item.title.toLowerCase().includes(filters.search)
          || item.description.toLowerCase().includes(filters.search)
        : true;

      return matchesStatus && matchesSearch;
    });
  });

  protected readonly stats = computed(() => {
    const list = this.assignments();
    return {
      total: list.length,
      upcoming: list.filter((item) => item.status === 'DRFT').length,
      live: list.filter((item) => item.status === 'INPR').length,
      finished: list.filter((item) => item.status === 'FNLC').length,
    };
  });

  constructor() {
    this.subscribeToFilters();
    this.fetchAssignments();
  }

  protected resetFilters(): void {
    this.filterForm.reset({
      search: '',
      status: 'todas',
    });
  }

  protected trackById(_: number, item: ResidentAssemblySummary): string {
    return item.id;
  }

  protected goToDetail(id: string): void {
    void this.router.navigate(['/resident', 'assemblies', id]);
  }

  private fetchAssignments(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.loadAssignments.execute(this.residentId)
      .pipe(
        catchError(() => {
          this.errorMessage.set('No fue posible cargar tus asambleas asignadas. Intenta nuevamente.');
          this.assignments.set([]);
          return of([] as ResidentAssemblySummary[]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.assignments.set(items);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  private subscribeToFilters(): void {
    this.filterForm.valueChanges
      .pipe(startWith(this.filterForm.getRawValue()), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ search, status }) => {
        const normalized = (search ?? '').trim().toLowerCase();
        const nextStatus = (status ?? 'todas') as ResidentAssemblyFilterStatus;
        const current = this.currentFilters();

        if (normalized !== current.search || nextStatus !== current.status) {
          this.currentFilters.set({ search: normalized, status: nextStatus });
        }
      });
  }
}
