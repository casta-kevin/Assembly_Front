import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';

import { GetAssemblyUseCase } from '../../../assemblies/application/use-cases/get-assembly.use-case';
import { AssemblyAuditEvent, AssemblyAuditAction, AssemblyDetail } from '../../../assemblies/domain/entities/assembly';

interface AuditFilterForm {
  search: string;
  user: string;
  action: AssemblyAuditAction | 'todas';
  start: string;
  end: string;
}

@Component({
  selector: 'app-assembly-audit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './assembly-audit.component.html',
  styleUrl: './assembly-audit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyAuditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly getAssembly = inject(GetAssemblyUseCase);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly assemblyId = signal<string>('');
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly assembly = signal<AssemblyDetail | null>(null);
  protected readonly events = signal<AssemblyAuditEvent[]>([]);
  protected readonly filtersChanged = signal(0);

  protected readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    user: [''],
    action: ['todas' as AuditFilterForm['action']],
    start: [''],
    end: [''],
  });

  protected readonly actionOptions = computed(() => {
    return ['todas', ...new Set(this.events().map((event) => event.action))] as Array<AuditFilterForm['action']>;
  });

  protected readonly userOptions = computed(() => {
    return ['', ...new Map(this.events().map((event) => [event.actorId, event.actorName])).values()];
  });

  protected readonly filteredEvents = computed(() => {
    const { search, user, action, start, end } = this.filterForm.getRawValue() as AuditFilterForm;
    const searchTerm = search.trim().toLowerCase();
    const startTime = start ? new Date(start).getTime() : undefined;
    const endTime = end ? new Date(end).getTime() : undefined;

    return this.events().filter((event) => {
      const matchesSearch = !searchTerm
        || event.action.includes(searchTerm)
        || event.actorName.toLowerCase().includes(searchTerm)
        || event.metadata && JSON.stringify(event.metadata).toLowerCase().includes(searchTerm);

      const matchesUser = user ? event.actorName === user : true;
      const matchesAction = action !== 'todas' ? event.action === action : true;

      const eventTime = new Date(event.timestamp).getTime();
      const matchesStart = startTime ? eventTime >= startTime : true;
      const matchesEnd = endTime ? eventTime <= endTime : true;

      return matchesSearch && matchesUser && matchesAction && matchesStart && matchesEnd;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  constructor() {
    this.filterForm.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.filtersChanged.update((value) => value + 1));

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.loadContext(params));
  }

  protected resetFilters(): void {
    this.filterForm.reset({ search: '', user: '', action: 'todas', start: '', end: '' });
  }

  protected goBack(): void {
    if (!this.assemblyId()) {
      return;
    }
    void this.router.navigate(['/admin', 'assemblies', this.assemblyId()]);
  }

  protected actionLabel(action: AssemblyAuditAction): string {
    switch (action) {
      case 'assembly-created':
        return 'Creación de asamblea';
      case 'assembly-updated':
        return 'Actualización de asamblea';
      case 'participant-added':
        return 'Participante agregado';
      case 'participant-removed':
        return 'Participante removido';
      case 'participant-updated':
        return 'Participante actualizado';
      case 'question-opened':
        return 'Pregunta abierta';
      case 'question-closed':
        return 'Pregunta cerrada';
      case 'tie-breaker':
        return 'Desempate del administrador';
      case 'file-downloaded':
        return 'Descarga de archivo';
      case 'file-uploaded':
        return 'Archivo cargado';
      default:
        return action;
    }
  }

  protected metadataSummary(event: AssemblyAuditEvent): string | null {
    if (!event.metadata) {
      return null;
    }
    const entries = Object.entries(event.metadata);
    if (!entries.length) {
      return null;
    }
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
  }

  private loadContext(params: ParamMap): void {
    const assemblyId = params.get('id');

    if (!assemblyId) {
      this.errorMessage.set('No fue posible identificar la asamblea.');
      this.isLoading.set(false);
      return;
    }

    this.assemblyId.set(assemblyId);
    this.fetchAssembly(assemblyId);
  }

  private fetchAssembly(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.getAssembly
      .execute(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.assembly.set(detail);
          this.events.set(structuredClone(detail.auditLog ?? []));
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible cargar la auditoría.';
          this.errorMessage.set(message);
          this.isLoading.set(false);
        },
      });
  }
}
