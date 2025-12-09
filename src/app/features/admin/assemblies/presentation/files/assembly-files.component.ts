import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GetAssemblyUseCase } from '../../../assemblies/application/use-cases/get-assembly.use-case';
import { SaveAssemblyUseCase } from '../../../assemblies/application/use-cases/save-assembly.use-case';
import { AssemblyAuditEvent, AssemblyDetail, AssemblyFile, AssemblyFileType } from '../../../assemblies/domain/entities/assembly';

@Component({
  selector: 'app-assembly-files',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './assembly-files.component.html',
  styleUrl: './assembly-files.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyFilesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly getAssembly = inject(GetAssemblyUseCase);
  private readonly saveAssembly = inject(SaveAssemblyUseCase);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly assemblyId = signal<string>('');
  protected readonly isLoading = signal(true);
  protected readonly isRegistering = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly assembly = signal<AssemblyDetail | null>(null);
  protected readonly files = signal<AssemblyFile[]>([]);

  protected readonly filterControl = this.fb.nonNullable.control<AssemblyFileType | 'todas'>('todas');

  protected readonly fileTypeOptions: Array<{ value: AssemblyFileType | 'todas'; label: string }> = [
    { value: 'todas', label: 'Todos los archivos' },
    { value: 'acta', label: 'Actas' },
    { value: 'anexo', label: 'Anexos' },
    { value: 'presentacion', label: 'Presentaciones' },
    { value: 'otro', label: 'Otros' },
  ];

  protected readonly filteredFiles = computed(() => {
    const filter = this.filterControl.value;
    if (!filter || filter === 'todas') {
      return this.files();
    }
    return this.files().filter((file) => file.type === filter);
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.loadContext(params));
  }

  protected navigateBack(): void {
    if (!this.assemblyId()) {
      return;
    }
    void this.router.navigate(['/admin', 'assemblies', this.assemblyId()]);
  }

  protected download(file: AssemblyFile): void {
    const assembly = this.assembly();
    if (!assembly) {
      return;
    }

    if (file.url && file.url !== '#') {
      window.open(file.url, '_blank', 'noopener');
    }

    const auditEvent = this.buildDownloadEvent(file);

    const updated: AssemblyDetail = {
      ...structuredClone(assembly),
      auditLog: [auditEvent, ...(assembly.auditLog ?? [])],
    };

    this.isRegistering.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.saveAssembly
      .execute(updated)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.isRegistering.set(false);
          this.successMessage.set(`Descarga registrada: ${file.name}`);
          this.assembly.set(detail);
          this.files.set(structuredClone(detail.files ?? []));
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible registrar la descarga.';
          this.errorMessage.set(message);
          this.isRegistering.set(false);
        },
      });
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
          this.files.set(structuredClone(detail.files ?? []));
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible cargar los archivos.';
          this.errorMessage.set(message);
          this.isLoading.set(false);
        },
      });
  }

  private buildDownloadEvent(file: AssemblyFile): AssemblyAuditEvent {
    const now = new Date().toISOString();
    return {
      id: `audit-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: now,
      actorId: 'admin-01',
      actorName: 'Administrador General',
      action: 'file-downloaded',
      entityType: 'file',
      entityId: file.id,
      metadata: {
        filename: file.name,
        sizeKb: file.sizeKb,
      },
    } satisfies AssemblyAuditEvent;
  }
}
