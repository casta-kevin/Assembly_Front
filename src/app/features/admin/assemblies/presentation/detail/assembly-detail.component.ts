import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GetAssemblyUseCase } from '../../../assemblies/application/use-cases/get-assembly.use-case';
import {
  AgendaTopic,
  AssemblyDetail,
  AssemblyHistory,
  TopicQuestion,
  TopicQuestionResult,
  TopicQuestionVote,
} from '../../../assemblies/domain/entities/assembly';
import { assemblyStatusBadge, assemblyStatusLabel } from '../../../assemblies/domain/entities/assembly-status.utils';

interface QuestionResultWithContext extends TopicQuestionResult {
  topic?: AgendaTopic;
  question?: TopicQuestion;
}

@Component({
  selector: 'app-assembly-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './assembly-detail.component.html',
  styleUrl: './assembly-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly getAssembly = inject(GetAssemblyUseCase);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly assemblyId = signal<string>('');
  protected readonly assembly = signal<AssemblyDetail | null>(null);
  protected readonly statusBadge = assemblyStatusBadge;

  protected readonly history = computed<AssemblyHistory>(() => this.assembly()?.history ?? { events: [], questionResults: [] });

  protected readonly questionResults = computed<QuestionResultWithContext[]>(() => {
    const assembly = this.assembly();
    if (!assembly) {
      return [];
    }

    const topicMap = new Map<string, AgendaTopic>();
    const questionMap = new Map<string, TopicQuestion>();

    assembly.agenda.forEach((topic) => {
      topicMap.set(topic.id, topic);
      topic.questions.forEach((question) => {
        questionMap.set(question.id, question);
      });
    });

    return (assembly.history?.questionResults ?? []).map((result) => ({
      ...result,
      topic: topicMap.get(result.topicId),
      question: questionMap.get(result.questionId),
    }));
  });

  protected readonly flattenedVotes = computed(() => this.questionResults().flatMap((result) => result.votes.map((vote) => ({
    ...vote,
    topicId: result.topicId,
    topicTitle: result.topic?.title ?? 'Topic',
    questionId: result.questionId,
    questionText: result.question?.text ?? result.questionText,
  }))));

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.loadContext(params));
  }

  protected cancel(): void {
    if (!this.assemblyId()) {
      return;
    }
    void this.router.navigate(['/admin', 'assemblies', this.assemblyId()]);
  }

  protected statusLabel(status: AssemblyDetail['status']): string {
    return assemblyStatusLabel(status);
  }

  protected choiceLabel(choice: TopicQuestionVote['choice']): string {
    switch (choice) {
      case 'si':
        return 'Sí';
      case 'no':
        return 'No';
      case 'abstencion':
        return 'Abstención';
      default:
        return choice;
    }
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
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible cargar la asamblea.';
          this.errorMessage.set(message);
          this.isLoading.set(false);
        },
      });
  }
}
