import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LoadAssembliesUseCase } from '../../../assemblies/application/use-cases/load-assemblies.use-case';
import { GetAssemblyUseCase } from '../../../assemblies/application/use-cases/get-assembly.use-case';
import { SaveAgendaUseCase } from '../../../assemblies/application/use-cases/save-agenda.use-case';
import { AgendaTopic, AssemblyDetail, AssemblySummary, TopicQuestion } from '../../../assemblies/domain/entities/assembly';
import { AgendaManagerComponent } from './agenda-manager.component';

@Component({
  selector: 'app-assembly-agenda',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AgendaManagerComponent],
  templateUrl: './assembly-agenda.component.html',
  styleUrl: './assembly-agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyAgendaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly loadAssemblies = inject(LoadAssembliesUseCase);
  private readonly getAssembly = inject(GetAssemblyUseCase);
  private readonly saveAgendaUseCase = inject(SaveAgendaUseCase);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly assemblies = signal<AssemblySummary[]>([]);
  protected readonly isLoadingList = signal(true);
  protected readonly isLoadingAgenda = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly selectedAssembly = signal<AssemblyDetail | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    agenda: this.fb.nonNullable.array<FormGroup>([]) as FormArray<FormGroup>,
  });

  constructor() {
    this.observeRouteSelection();
    this.loadAssemblySummaries();
  }

  protected get agenda(): FormArray<FormGroup> {
    return this.form.controls.agenda;
  }

  protected addTopic(): void {
    this.agenda.push(this.buildTopicGroup());
  }

  protected removeTopic(index: number): void {
    this.agenda.removeAt(index);
    if (!this.agenda.length) {
      this.addTopic();
    }
  }

  protected selectAssembly(id: string): void {
    if (!id || this.selectedAssembly()?.id === id) {
      return;
    }

    this.isLoadingAgenda.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.getAssembly
      .execute(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.selectedAssembly.set(detail);
          this.populateAgenda(detail);
          this.isLoadingAgenda.set(false);
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible cargar el orden del día.';
          this.errorMessage.set(message);
          this.selectedAssembly.set(null);
          this.agenda.clear();
          this.isLoadingAgenda.set(false);
        },
      });
  }

  protected saveAgenda(): void {
    const detail = this.selectedAssembly();
    if (!detail) {
      this.errorMessage.set('Selecciona una asamblea para continuar.');
      return;
    }

    if (this.agenda.invalid) {
      this.agenda.markAllAsTouched();
      this.errorMessage.set('Revisa los campos del orden del día antes de guardar.');
      return;
    }

    const agendaPayload = this.buildAgendaPayload();

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.saveAgendaUseCase
      .execute({
        assemblyId: detail.id,
        agenda: agendaPayload,
        startAt: detail.startAt,
        endAt: detail.endAt,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Orden del día guardado correctamente.');
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible guardar el orden del día.';
          this.errorMessage.set(message);
          this.isSaving.set(false);
        },
      });
  }

  protected cancel(): void {
    void this.router.navigate(['/admin', 'assemblies']);
  }

  private observeRouteSelection(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.selectAssembly(id);
        }
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('assemblyId');
        if (id) {
          this.selectAssembly(id);
        }
      });
  }

  private loadAssemblySummaries(): void {
    this.isLoadingList.set(true);
    this.loadAssemblies
      .execute()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summaries) => {
          this.assemblies.set(summaries);
          this.isLoadingList.set(false);
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible cargar las asambleas disponibles.';
          this.errorMessage.set(message);
          this.isLoadingList.set(false);
        },
      });
  }

  private populateAgenda(detail: AssemblyDetail): void {
    this.agenda.clear();
    detail.agenda.forEach((topic) => this.agenda.push(this.buildTopicGroup(topic)));
    if (!this.agenda.length) {
      this.agenda.push(this.buildTopicGroup());
    }
  }

  private buildAgendaPayload(): AgendaTopic[] {
    return this.agenda.controls.map((topic) => {
      const questionsArray = topic.get('questions') as FormArray<FormGroup>;
      const questions = questionsArray.controls.map((question) => ({
        id: question.get('id')?.value,
        text: question.get('text')?.value,
        description: question.get('description')?.value || undefined,
        startAt: question.get('startAt')?.value || undefined,
        endAt: question.get('endAt')?.value || undefined,
        allowsTieBreaker: question.get('allowsTieBreaker')?.value ?? true,
        status: question.get('status')?.value || 'PLND',
      })) as TopicQuestion[];

      return {
        id: topic.get('id')?.value,
        title: topic.get('title')?.value,
        description: topic.get('description')?.value || undefined,
        startAt: topic.get('startAt')?.value || undefined,
        endAt: topic.get('endAt')?.value || undefined,
        questions,
      } as AgendaTopic;
    });
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
      status: [question?.status ?? 'PLND'],
    });
  }

  private generateTopicId(): string {
    return `topic-${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateQuestionId(): string {
    return `question-${Math.random().toString(36).slice(2, 8)}`;
  }
}
