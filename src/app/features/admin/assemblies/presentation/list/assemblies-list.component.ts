import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith, switchMap, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LoadAssembliesUseCase } from '../../../assemblies/application/use-cases/load-assemblies.use-case';
import { AssemblyFilters, AssemblySummary } from '../../../assemblies/domain/entities/assembly';

@Component({
  selector: 'app-assemblies-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './assemblies-list.component.html',
  styleUrl: './assemblies-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssembliesListComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly loadAssemblies = inject(LoadAssembliesUseCase);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['todas' as AssemblyFilters['status']],
    range: this.fb.nonNullable.group({
      start: [''],
      end: [''],
    }),
  });

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly assemblies = signal<AssemblySummary[]>([]);

  protected readonly stats = computed(() => {
    const list = this.assemblies();
    return {
      total: list.length,
      upcoming: list.filter((item) => item.status === 'programada').length,
      inProgress: list.filter((item) => item.status === 'en-curso').length,
      finished: list.filter((item) => item.status === 'finalizada' || item.status === 'cerrada').length,
    };
  });

  constructor() {
    this.filterForm.valueChanges
      .pipe(
        startWith(this.filterForm.getRawValue()),
        debounceTime(200),
        distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((filters) => this.loadAssemblies.execute(this.mapFilters(filters)).pipe(
          catchError(() => {
            this.errorMessage.set('No fue posible cargar las asambleas. Intenta nuevamente.');
            return of([] as AssemblySummary[]);
          }),
        )),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.assemblies.set(items);
        this.isLoading.set(false);
      });
  }

  protected resetFilters(): void {
    this.filterForm.reset({
      search: '',
      status: 'todas',
      range: { start: '', end: '' },
    });
  }

  protected statusLabel(status: AssemblySummary['status']): string {
    switch (status) {
      case 'borrador':
        return 'Borrador';
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

  protected statusBadgeClass(status: AssemblySummary['status']): string {
    return {
      borrador: 'badge--draft',
      programada: 'badge--scheduled',
      'en-curso': 'badge--running',
      finalizada: 'badge--finished',
      cerrada: 'badge--closed',
    }[status] ?? 'badge--draft';
  }

  protected trackById(_: number, item: AssemblySummary): string {
    return item.id;
  }

  protected goToCreate(): void {
    void this.router.navigate(['/admin', 'assemblies', 'new']);
  }

  protected goToAssembly(id: string): void {
    void this.router.navigate(['/admin', 'assemblies', id]);
  }

  private mapFilters(rawFilters: typeof this.filterForm.value): Partial<AssemblyFilters> {
    return {
      search: rawFilters.search ?? undefined,
      status: rawFilters.status ?? 'todas',
      range: {
        start: rawFilters.range?.start ?? undefined,
        end: rawFilters.range?.end ?? undefined,
      },
    };
  }
}
