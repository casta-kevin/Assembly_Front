import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GetAssemblyUseCase } from '../../../assemblies/application/use-cases/get-assembly.use-case';
import { SaveAssemblyUseCase } from '../../../assemblies/application/use-cases/save-assembly.use-case';
import { AgendaTopic, AssemblyDetail, QuestionStatus, TopicQuestion } from '../../../assemblies/domain/entities/assembly';

@Component({
  selector: 'app-topic-questions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './topic-questions.component.html',
  styleUrl: './topic-questions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicQuestionsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly getAssembly = inject(GetAssemblyUseCase);
  private readonly saveAssembly = inject(SaveAssemblyUseCase);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly assemblyId = signal<string>('');
  protected readonly topicId = signal<string>('');
  protected readonly assembly = signal<AssemblyDetail | null>(null);
  protected readonly topic = signal<AgendaTopic | null>(null);
  protected readonly topicsList = computed(() => this.assembly()?.agenda ?? []);

  protected readonly statusOptions: Array<{ value: QuestionStatus; label: string }> = [
    { value: 'programada', label: 'Programada' },
    { value: 'activa', label: 'Activa' },
    { value: 'cerrada', label: 'Cerrada' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    questions: this.fb.nonNullable.array<FormGroup>([]) as FormArray<FormGroup>,
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.loadContext(params));
  }

  protected get questions(): FormArray<FormGroup> {
    return this.form.controls.questions;
  }

  protected addQuestion(): void {
    this.questions.push(this.buildQuestionGroup());
  }

  protected removeQuestion(index: number): void {
    if (this.questions.length <= 1) {
      return;
    }

    this.questions.removeAt(index);
  }

  protected saveQuestions(): void {
    if (this.form.invalid || !this.assembly()) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revisa la configuración de las preguntas antes de guardar.');
      return;
    }

    const assembly = structuredClone(this.assembly()!);
    const topicIndex = assembly.agenda.findIndex((item) => item.id === this.topicId());

    if (topicIndex === -1) {
      this.errorMessage.set('El topic seleccionado no existe en la asamblea.');
      return;
    }

    const updatedQuestions = this.questions.controls.map((group) => ({
      id: group.get('id')?.value ?? this.generateQuestionId(),
      text: group.get('text')?.value ?? '',
      description: group.get('description')?.value || undefined,
      startAt: this.toISOString(group.get('startAt')?.value),
      endAt: this.toISOString(group.get('endAt')?.value),
      allowsTieBreaker: group.get('allowsTieBreaker')?.value ?? true,
      status: group.get('status')?.value as QuestionStatus,
    })) as TopicQuestion[];

    assembly.agenda[topicIndex] = {
      ...assembly.agenda[topicIndex],
      questions: updatedQuestions,
    } satisfies AgendaTopic;

    if (assembly.liveState) {
      assembly.liveState = {
        ...assembly.liveState,
        questionStates: assembly.liveState.questionStates.map((state) => {
          const question = updatedQuestions.find((item) => item.id === state.questionId);
          if (!question) {
            return state;
          }
          return {
            ...state,
            status: question.status ?? state.status,
            votingWindowStart: question.startAt,
            votingWindowEnd: question.endAt,
            allowsTieBreaker: question.allowsTieBreaker,
          };
        }),
      } satisfies NonNullable<AssemblyDetail['liveState']>;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.saveAssembly
      .execute(assembly)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.successMessage.set('Preguntas actualizadas correctamente.');
          this.assembly.set(updated);
          const refreshedTopic = updated.agenda.find((item) => item.id === this.topicId());
          if (refreshedTopic) {
            this.topic.set(refreshedTopic);
            this.patchForm(refreshedTopic);
          }
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible guardar los cambios.';
          this.errorMessage.set(message);
          this.isSaving.set(false);
        },
      });
  }

  protected cancel(): void {
    if (!this.assemblyId()) {
      return;
    }
    void this.router.navigate(['/admin', 'assemblies', this.assemblyId()]);
  }

  protected navigateToTopic(topicId: string): void {
    if (!this.assemblyId() || !topicId) {
      return;
    }
    if (topicId === this.topicId()) {
      return;
    }
    void this.router.navigate(['/admin', 'assemblies', this.assemblyId(), 'questions', topicId]);
  }

  private loadContext(params: ParamMap): void {
    const assemblyId = params.get('id');
    const topicId = params.get('topicId');

    if (!assemblyId || !topicId) {
      this.errorMessage.set('No fue posible determinar la asamblea o el topic.');
      this.isLoading.set(false);
      return;
    }

    this.assemblyId.set(assemblyId);
    this.topicId.set(topicId);
    this.fetchAssembly(assemblyId, topicId);
  }

  private fetchAssembly(id: string, topicId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.getAssembly
      .execute(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.assembly.set(detail);
          const foundTopic = detail.agenda.find((item) => item.id === topicId) ?? null;
          this.topic.set(foundTopic);

          if (foundTopic) {
            this.patchForm(foundTopic);
          } else {
            this.errorMessage.set('El topic seleccionado no existe.');
          }

          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible cargar la asamblea.';
          this.errorMessage.set(message);
          this.isLoading.set(false);
        },
      });
  }

  private patchForm(topic: AgendaTopic): void {
    this.questions.clear();
    topic.questions.forEach((question) => this.questions.push(this.buildQuestionGroup(question)));

    if (!this.questions.length) {
      this.questions.push(this.buildQuestionGroup());
    }
  }

  private buildQuestionGroup(question?: TopicQuestion): FormGroup {
    return this.fb.nonNullable.group({
      id: [question?.id ?? this.generateQuestionId()],
      text: [question?.text ?? '', [Validators.required, Validators.maxLength(280)]],
      description: [question?.description ?? '', Validators.maxLength(400)],
      startAt: [question?.startAt ? question.startAt.slice(0, 16) : ''],
      endAt: [question?.endAt ? question.endAt.slice(0, 16) : ''],
      status: [question?.status ?? 'programada'],
      allowsTieBreaker: [question?.allowsTieBreaker ?? true],
    });
  }

  private generateQuestionId(): string {
    return `question-${Math.random().toString(36).slice(2, 8)}`;
  }

  private toISOString(value: unknown): string | undefined {
    if (!value || typeof value !== 'string') {
      return undefined;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
}
