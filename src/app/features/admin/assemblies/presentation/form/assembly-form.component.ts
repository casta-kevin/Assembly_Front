import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

import { GetAssemblyUseCase } from '../../../assemblies/application/use-cases/get-assembly.use-case';
import { SaveAssemblyUseCase } from '../../../assemblies/application/use-cases/save-assembly.use-case';
import { AgendaTopic, AssemblyDetail, AssemblyLiveState, AssemblyStatus } from '../../../assemblies/domain/entities/assembly';

@Component({
  selector: 'app-assembly-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './assembly-form.component.html',
  styleUrl: './assembly-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly getAssembly = inject(GetAssemblyUseCase);
  private readonly saveAssembly = inject(SaveAssemblyUseCase);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly assemblyId = signal<string>('');
  protected readonly isNew = signal(false);
  protected readonly baseline = signal<AssemblyDetail | null>(null);

  protected readonly statusOptions: Array<{ label: string; value: AssemblyStatus }> = [
    { label: 'Borrador', value: 'DRFT' },
    { label: 'En progreso', value: 'INPR' },
    { label: 'Finalizada', value: 'FNLC' },
  ];

  protected readonly availableInitiators = [
    { id: 'admin-01', name: 'Administrador General' },
    { id: 'admin-02', name: 'Coordinador Seguridad' },
    { id: 'admin-03', name: 'Gestión Financiera' },
  ];

  private readonly residentCatalog = [
    { id: 'res-001', name: 'Laura Pérez', unit: 'Torre A - 301' },
    { id: 'res-002', name: 'Carlos Mendoza', unit: 'Torre B - 1204' },
    { id: 'res-003', name: 'Yuliana Romero', unit: 'Torre C - 905' },
    { id: 'res-004', name: 'Andrés Camacho', unit: 'Torre B - 502' },
    { id: 'res-005', name: 'Valeria Jiménez', unit: 'Torre A - 1802' },
    { id: 'res-006', name: 'Esteban Duarte', unit: 'Torre D - 204' },
    { id: 'res-007', name: 'Natalia Ortiz', unit: 'Torre C - 706' },
    { id: 'res-008', name: 'Santiago Rojas', unit: 'Torre A - 1501' },
    { id: 'res-009', name: 'María Fernanda Silva', unit: 'Torre D - 305' },
    { id: 'res-010', name: 'Julián Gutiérrez', unit: 'Torre B - 804' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(600)]],
    rules: ['', [Validators.required, Validators.maxLength(1000)]],
    startAt: ['', Validators.required],
    endAt: ['', Validators.required],
    status: this.fb.nonNullable.control<AssemblyStatus>('DRFT', Validators.required),
    canManageInitiators: [true],
    initiatorIds: this.fb.nonNullable.array<string>([]) as FormArray<FormControl<string>>,
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.initializeForm(params));
  }

  protected initiatorSelected(id: string): boolean {
    return this.form.controls.initiatorIds.controls.some((control) => control.value === id);
  }

  protected toggleInitiator(id: string): void {
    const array = this.form.controls.initiatorIds;
    const index = array.controls.findIndex((control) => control.value === id);

    if (index === -1) {
      array.push(this.fb.nonNullable.control(id));
    } else {
      array.removeAt(index);
    }
  }

  protected firstTopicId(): string | null {
    const agenda = this.baseline()?.agenda ?? [];
    return agenda[0]?.id ?? null;
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revisa la información ingresada antes de guardar.');
      return;
    }

    const payload = this.buildPayload();
    const wasNew = this.isNew();

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.saveAssembly
      .execute(payload)
      .pipe(
        switchMap((saved) =>
          this.getAssembly
            .execute(saved.id)
            .pipe(catchError(() => of(saved))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (detail) => {
          this.successMessage.set('Asamblea guardada correctamente.');
          this.isSaving.set(false);
          this.assemblyId.set(detail.id);
          this.isNew.set(false);
          this.baseline.set(detail);
          this.patchForm(detail);
          if (wasNew) {
            void this.router.navigate(['/admin', 'assemblies', detail.id]);
          }
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible guardar la asamblea.';
          this.errorMessage.set(message);
          this.isSaving.set(false);
        },
      });
  }

  protected cancel(): void {
    void this.router.navigate(['/admin', 'assemblies']);
  }

  private initializeForm(params: ParamMap): void {
    const id = params.get('id');
    const isNew = !id || id === 'new';

    this.isNew.set(isNew);

    if (isNew) {
      const newId = this.generateAssemblyId();
      this.assemblyId.set(newId);
      this.isLoading.set(false);
      const draft = this.buildDefaultAssembly(newId);
      this.baseline.set(draft);
      this.patchForm(draft);
      return;
    }

    this.assemblyId.set(id);
    this.isLoading.set(true);

    this.getAssembly
      .execute(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.baseline.set(detail);
          this.patchForm(detail);
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible cargar la asamblea.';
          this.errorMessage.set(message);
          this.isLoading.set(false);
        },
      });
  }

  private patchForm(detail: AssemblyDetail): void {
    this.form.patchValue({
      title: detail.title,
      description: detail.description,
      rules: detail.rules,
      startAt: detail.startAt ? detail.startAt.slice(0, 16) : '',
      endAt: detail.endAt ? detail.endAt.slice(0, 16) : '',
      status: detail.status,
      canManageInitiators: detail.canManageInitiators,
    });

    this.form.controls.initiatorIds.clear();
    detail.initiatorIds.forEach((id) => this.form.controls.initiatorIds.push(this.fb.nonNullable.control(id)));
  }

  private buildPayload(): AssemblyDetail {
    const id = this.assemblyId();
    const {
      title,
      description,
      rules,
      startAt,
      endAt,
      status,
      canManageInitiators,
    } = this.form.getRawValue();

    const initiatorIds = this.form.controls.initiatorIds.controls.map((control) => control.value);
    const baseline = this.baseline();
    const agenda = structuredClone(baseline?.agenda ?? []) as AgendaTopic[];
    const participants = baseline?.participants ?? [];
    const availableParticipants = baseline?.availableParticipants ?? structuredClone(this.residentCatalog);
    const liveState = baseline?.liveState ?? this.buildDefaultLiveState(agenda);
    const history = baseline?.history ?? { events: [], questionResults: [] };
    const auditLog = baseline?.auditLog ?? [];
    const files = baseline?.files ?? [];

    return {
      id,
      title,
      description,
      rules,
      startAt: this.toISOString(startAt),
      endAt: this.toISOString(endAt),
      status: status as AssemblyStatus,
      canManageInitiators,
      initiatorIds,
      agenda,
      participants: structuredClone(participants),
      availableParticipants: structuredClone(availableParticipants),
      liveState: structuredClone(liveState),
      history: structuredClone(history),
      auditLog: structuredClone(auditLog),
      files: structuredClone(files),
      createdBy: this.baseline()?.createdBy ?? 'admin-01',
      updatedAt: new Date().toISOString(),
    } satisfies AssemblyDetail;
  }

  private buildDefaultAssembly(id: string): AssemblyDetail {
    const now = new Date();
    const inHours = (hours: number) => {
      const copy = new Date(now);
      copy.setHours(copy.getHours() + hours);
      return copy.toISOString();
    };
    const agenda: AgendaTopic[] = [];

    return {
      id,
      title: 'Nueva asamblea',
      description: '',
      rules: '',
      startAt: inHours(48),
      endAt: inHours(52),
      status: 'DRFT',
      agenda,
      canManageInitiators: true,
      initiatorIds: ['admin-01'],
      participants: [],
      availableParticipants: structuredClone(this.residentCatalog),
      liveState: this.buildDefaultLiveState(agenda),
      history: {
        events: [],
        questionResults: [],
      },
      auditLog: [],
      files: [],
      createdBy: 'admin-01',
      updatedAt: now.toISOString(),
    };
  }

  private buildDefaultLiveState(agenda: AgendaTopic[]): AssemblyLiveState {
    const firstTopic = agenda[0];
    const firstQuestion = firstTopic?.questions[0];

    return {
      isLive: false,
      canStart: true,
      canClose: false,
      currentTopicId: firstTopic?.id,
      currentQuestionId: firstQuestion?.id,
      questionStates: agenda.flatMap((topic) => topic.questions.map((question) => ({
        questionId: question.id,
        status: 'PLND',
        votingWindowStart: question.startAt,
        votingWindowEnd: question.endAt,
        yes: 0,
        no: 0,
        abstain: 0,
        allowsTieBreaker: question.allowsTieBreaker,
        tieBreakerUsed: false,
      }))),
    } satisfies AssemblyLiveState;
  }

  private toISOString(value: string): string {
    if (!value) {
      return new Date().toISOString();
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  private generateAssemblyId(): string {
    return `asm-${Math.random().toString(36).slice(2, 8)}`;
  }
}
