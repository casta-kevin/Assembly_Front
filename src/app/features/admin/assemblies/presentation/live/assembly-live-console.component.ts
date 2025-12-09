import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GetAssemblyUseCase } from '../../../assemblies/application/use-cases/get-assembly.use-case';
import { SaveAssemblyUseCase } from '../../../assemblies/application/use-cases/save-assembly.use-case';
import {
  AgendaTopic,
  AssemblyDetail,
  AssemblyLiveQuestionState,
  AssemblyLiveState,
  QuestionStatus,
  TopicQuestion,
} from '../../../assemblies/domain/entities/assembly';

@Component({
  selector: 'app-assembly-live-console',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './assembly-live-console.component.html',
  styleUrl: './assembly-live-console.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyLiveConsoleComponent {
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
  protected readonly assembly = signal<AssemblyDetail | null>(null);
  protected readonly liveState = signal<AssemblyLiveState | null>(null);
  protected readonly agenda = signal<AgendaTopic[]>([]);

  protected readonly topicsWithState = computed(() => {
    const agenda = this.agenda();
    const map = new Map((this.liveState()?.questionStates ?? []).map((state) => [state.questionId, state]));
    return agenda.map((topic) => ({
      topic,
      questions: topic.questions.map((question) => ({
        question,
        state: map.get(question.id) ?? null,
      })),
    }));
  });

  protected readonly currentTopic = computed<AgendaTopic | null>(() => {
    const state = this.liveState();
    const topics = this.agenda();
    if (!state?.currentTopicId) {
      return topics[0] ?? null;
    }
    return topics.find((topic) => topic.id === state.currentTopicId) ?? topics[0] ?? null;
  });

  protected readonly currentQuestion = computed<AssemblyLiveQuestionState | null>(() => {
    const state = this.liveState();
    if (!state?.currentQuestionId) {
      return null;
    }
    return state.questionStates.find((question) => question.questionId === state.currentQuestionId) ?? null;
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.loadContext(params));
  }

  protected startAssembly(): void {
    this.updateLiveState((state) => {
      if (state.isLive) {
        return state;
      }
      return {
        ...state,
        isLive: true,
        canStart: false,
        canClose: true,
        startedAt: this.nowIso(),
      } satisfies AssemblyLiveState;
    });
  }

  protected closeAssembly(): void {
    this.updateLiveState((state) => ({
      ...state,
      isLive: false,
      canClose: false,
      closedAt: this.nowIso(),
    }));
  }

  protected advanceTopic(): void {
    this.updateLiveState((state) => {
      const topics = this.agenda();
      if (!topics.length) {
        return state;
      }

      const currentIndex = state.currentTopicId
        ? topics.findIndex((topic) => topic.id === state.currentTopicId)
        : 0;

      const nextTopic = topics[(currentIndex + 1) % topics.length];
      const nextQuestion = nextTopic.questions[0];

      return {
        ...state,
        currentTopicId: nextTopic.id,
        currentQuestionId: nextQuestion?.id,
      } satisfies AssemblyLiveState;
    });
  }

  protected openQuestion(questionId: string): void {
    this.updateLiveState((state) => ({
      ...state,
      currentQuestionId: questionId,
      questionStates: state.questionStates.map((question) => (
        question.questionId === questionId
          ? {
            ...question,
            status: 'activa',
            votingWindowStart: question.votingWindowStart ?? this.nowIso(),
            votingWindowEnd: undefined,
          }
          : question
      )),
    }));
  }

  protected closeQuestion(questionId: string): void {
    this.updateLiveState((state) => ({
      ...state,
      questionStates: state.questionStates.map((question) => (
        question.questionId === questionId
          ? {
            ...question,
            status: 'cerrada',
            votingWindowEnd: this.nowIso(),
          }
          : question
      )),
    }));
  }

  protected applyTieBreaker(questionId: string, choice: 'si' | 'no'): void {
    this.updateLiveState((state) => ({
      ...state,
      questionStates: state.questionStates.map((question) => {
        if (question.questionId !== questionId) {
          return question;
        }

        const yes = choice === 'si' ? question.yes + 1 : question.yes;
        const no = choice === 'no' ? question.no + 1 : question.no;

        return {
          ...question,
          yes,
          no,
          tieBreakerUsed: true,
        } satisfies AssemblyLiveQuestionState;
      }),
    }));
  }

  protected saveLiveState(): void {
    const assembly = this.assembly();
    const liveState = this.liveState();
    if (!assembly || !liveState) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload: AssemblyDetail = {
      ...structuredClone(assembly),
      liveState: structuredClone(liveState),
    };

    this.saveAssembly
      .execute(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.successMessage.set('Estado en vivo guardado.');
          this.assembly.set(updated);
          this.liveState.set(structuredClone(updated.liveState ?? liveState));
          this.agenda.set(structuredClone(updated.agenda));
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

  protected questionStatusLabel(status: QuestionStatus): string {
    switch (status) {
      case 'programada':
        return 'Programada';
      case 'activa':
        return 'Activa';
      case 'cerrada':
        return 'Cerrada';
      default:
        return status;
    }
  }

  protected canUseTieBreaker(state: AssemblyLiveQuestionState | null): boolean {
    if (!state) {
      return false;
    }
    return state.allowsTieBreaker && !state.tieBreakerUsed && state.yes === state.no;
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
          this.liveState.set(structuredClone(detail.liveState ?? null));
          this.agenda.set(structuredClone(detail.agenda));
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible cargar la asamblea.';
          this.errorMessage.set(message);
          this.isLoading.set(false);
        },
      });
  }

  private updateLiveState(mutator: (state: AssemblyLiveState) => AssemblyLiveState): void {
    const current = this.liveState();
    const assembly = this.assembly();

    if (!current || !assembly) {
      return;
    }

    const next = mutator(structuredClone(current));
    this.liveState.set(next);
    this.assembly.set({ ...assembly, liveState: next });
  }

  private nowIso(): string {
    return new Date().toISOString();
  }
}
