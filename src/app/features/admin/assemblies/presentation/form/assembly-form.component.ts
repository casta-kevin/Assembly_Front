import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GetAssemblyUseCase } from '../../../assemblies/application/use-cases/get-assembly.use-case';
import { SaveAssemblyUseCase } from '../../../assemblies/application/use-cases/save-assembly.use-case';
import {
  AgendaTopic,
  AssemblyDetail,
  AssemblyLiveState,
  AssemblyStatus,
  TopicQuestion,
} from '../../../assemblies/domain/entities/assembly';
import { AgendaManagerComponent } from '../agenda/agenda-manager.component';

@Component({
  selector: 'app-assembly-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AgendaManagerComponent],
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
    { label: 'Borrador', value: 'borrador' },
    { label: 'Programada', value: 'programada' },
    { label: 'En curso', value: 'en-curso' },
    { label: 'Finalizada', value: 'finalizada' },
    { label: 'Cerrada', value: 'cerrada' },
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
    status: this.fb.nonNullable.control<AssemblyStatus>('borrador', Validators.required),
    canManageInitiators: [true],
    initiatorIds: this.fb.nonNullable.array<string>([]) as FormArray<FormControl<string>>,
    agenda: this.fb.nonNullable.array<FormGroup>([]) as FormArray<FormGroup>,
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.initializeForm(params));
  }

  protected get agenda(): FormArray<FormGroup> {
    return this.form.controls.agenda;
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

  protected addEmptyTopic(): void {
    this.agenda.push(this.buildTopicGroup());
  }

  protected removeTopic(index: number): void {
    this.agenda.removeAt(index);
    if (!this.agenda.length) {
      this.addEmptyTopic();
    }
  }

  protected upsertTopic(index: number, topic: AgendaTopic): void {
    const target = this.agenda.at(index);
    if (target) {
      target.patchValue({
        id: topic.id,
        title: topic.title,
        description: topic.description ?? '',
        startAt: topic.startAt ?? '',
        endAt: topic.endAt ?? '',
      });
    }
  }

  protected reorderAgenda(order: AgendaTopic[]): void {
    this.agenda.clear();
    order.forEach((topic) => this.agenda.push(this.buildTopicGroup(topic)));
  }

  protected firstTopicId(): string | null {
    const control = this.agenda.at(0);
    const value = control?.get('id')?.value;
    return typeof value === 'string' && value.length ? value : null;
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revisa la información ingresada antes de guardar.');
      return;
    }

    const payload = this.buildPayload();

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.saveAssembly
      .execute(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.successMessage.set('Asamblea guardada correctamente.');
          this.isSaving.set(false);
          this.assemblyId.set(updated.id);
          this.isNew.set(false);
          this.baseline.set(updated);
          void this.router.navigate(['/admin', 'assemblies', updated.id]);
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

    this.agenda.clear();
    detail.agenda.forEach((topic) => this.agenda.push(this.buildTopicGroup(topic)));
  }

  private buildTopicGroup(topic?: Partial<AgendaTopic>): FormGroup {
    const group = this.fb.nonNullable.group({
      id: [topic?.id ?? this.generateTopicId()],
      title: [topic?.title ?? '', Validators.required],
      description: [topic?.description ?? '', Validators.maxLength(600)],
      startAt: [topic?.startAt ?? ''],
      endAt: [topic?.endAt ?? ''],
      questions: this.fb.nonNullable.array<FormGroup>([]) as FormArray<FormGroup>,
    });

    const questionsArray = group.controls.questions;
    (topic?.questions ?? []).forEach((question) => questionsArray.push(this.buildQuestionGroup(question)));

    if (!questionsArray.length) {
      questionsArray.push(this.buildQuestionGroup());
    }

    return group;
  }

  private buildQuestionGroup(question?: Partial<TopicQuestion>): FormGroup {
    return this.fb.nonNullable.group({
      id: [question?.id ?? this.generateQuestionId()],
      text: [question?.text ?? '', [Validators.required, Validators.maxLength(280)]],
      description: [question?.description ?? '', Validators.maxLength(400)],
      startAt: [question?.startAt ?? ''],
      endAt: [question?.endAt ?? ''],
      allowsTieBreaker: [question?.allowsTieBreaker ?? true],
      status: [question?.status ?? 'programada'],
    });
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
    const agenda = this.agenda.controls.map((topic) => {
      const questionsArray = topic.get('questions') as FormArray<FormGroup>;
      return {
        id: topic.get('id')?.value,
        title: topic.get('title')?.value,
        description: topic.get('description')?.value || undefined,
        startAt: topic.get('startAt')?.value || undefined,
        endAt: topic.get('endAt')?.value || undefined,
        questions: questionsArray.controls.map((question) => ({
          id: question.get('id')?.value,
          text: question.get('text')?.value,
          description: question.get('description')?.value || undefined,
          startAt: question.get('startAt')?.value || undefined,
          endAt: question.get('endAt')?.value || undefined,
          allowsTieBreaker: question.get('allowsTieBreaker')?.value ?? false,
          status: question.get('status')?.value || undefined,
        })),
      } satisfies AgendaTopic;
    });

    const baseline = this.baseline();
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

    const topicId = this.generateTopicId();
    const questionId = this.generateQuestionId();
    const agenda: AgendaTopic[] = [
      {
        id: topicId,
        title: 'Nuevo topic',
        description: '',
        startAt: inHours(48),
        endAt: inHours(49),
        questions: [
          {
            id: questionId,
            text: '¿Aprueba la propuesta inicial?',
            allowsTieBreaker: true,
            startAt: inHours(48.25),
            endAt: inHours(48.5),
            status: 'programada',
          },
        ],
      },
    ];

    return {
      id,
      title: 'Nueva asamblea',
      description: '',
      rules: '',
      startAt: inHours(48),
      endAt: inHours(52),
      status: 'borrador',
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
        status: 'programada',
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

  private generateTopicId(): string {
    return `topic-${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateQuestionId(): string {
    return `question-${Math.random().toString(36).slice(2, 8)}`;
  }
}
