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
  private readonly badgeClassMap: Record<ResidentAssemblySummary['status'], string> = {
    borrador: 'badge--draft',
    programada: 'badge--scheduled',
    'en-curso': 'badge--running',
    finalizada: 'badge--finished',
    cerrada: 'badge--closed',
  };

  protected readonly filteredAssignments = computed(() => {
    const list = this.assignments();
    const filters = this.currentFilters();

    return list.filter((item) => {
      const matchesStatus = filters.status === 'todas'
        ? true
        : filters.status === 'proximas'
          ? item.status === 'programada'
          : filters.status === 'en-curso'
            ? item.status === 'en-curso'
            : item.status === 'finalizada' || item.status === 'cerrada';

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
      upcoming: list.filter((item) => item.status === 'programada').length,
      live: list.filter((item) => item.status === 'en-curso').length,
      finished: list.filter((item) => item.status === 'finalizada' || item.status === 'cerrada').length,
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

  protected statusLabel(status: ResidentAssemblySummary['status']): string {
    switch (status) {
      case 'programada':
        return 'Programada';
      case 'en-curso':
        return 'En curso';
      case 'finalizada':
        return 'Finalizada';
      case 'cerrada':
        return 'Cerrada';
      default:
        return status;
    }
  }

  protected badgeClass(status: ResidentAssemblySummary['status']): string {
    return this.badgeClassMap[status] ?? this.badgeClassMap.programada;
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
