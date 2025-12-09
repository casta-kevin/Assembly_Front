import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, of, timer } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GetResidentLiveQuestionUseCase } from '../../../assemblies/application/use-cases/get-resident-live-question.use-case';
import { SubmitResidentVoteUseCase } from '../../../assemblies/application/use-cases/submit-resident-vote.use-case';
import { ResidentLiveQuestion, ResidentVoteChoice } from '../../../assemblies/domain/entities/resident-assembly';

@Component({
  selector: 'app-resident-live-vote',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './resident-live-vote.component.html',
  styleUrl: './resident-live-vote.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentLiveVoteComponent {
  private readonly getLiveQuestion = inject(GetResidentLiveQuestionUseCase);
  private readonly submitVoteUseCase = inject(SubmitResidentVoteUseCase);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly residentId = 'res-001';
  private readonly refresh$ = new Subject<void>();
  private readonly pollIntervalMs = 15000;
  protected assemblyId: string | null = null;

  protected readonly question = signal<ResidentLiveQuestion | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly canVote = computed(() => {
    const current = this.question();
    return !!current && current.canVote && !this.isSubmitting();
  });

  protected readonly stateMessage = computed(() => {
    const current = this.question();

    if (!current) {
      return 'En este momento no hay una pregunta activa. Vuelve a intentarlo más tarde.';
    }

    if (current.status === 'cerrada') {
      return 'La pregunta fue cerrada. El voto ya no está disponible.';
    }

    if (current.userVote) {
      const label = this.voteLabel(current.userVote);
      return `Ya registraste tu voto (${label}). Puedes modificarlo cuando la administración reabra la pregunta.`;
    }

    if (!current.canVote) {
      return current.blockedReason ?? 'No puedes votar en esta pregunta ahora mismo.';
    }

    return 'La pregunta está activa. Elige una opción antes de que finalice el tiempo.';
  });

  constructor() {
    const assemblyId = this.route.snapshot.paramMap.get('id');
    if (!assemblyId) {
      this.errorMessage.set('No se encontró una asamblea válida para la votación.');
      return;
    }

    this.assemblyId = assemblyId;
    this.isLoading.set(true);

    timer(0, this.pollIntervalMs)
      .pipe(
        switchMap(() => this.loadQuestion()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.refresh$
      .pipe(
        switchMap(() => this.loadQuestion()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected refresh(): void {
    this.isLoading.set(true);
    this.refresh$.next();
  }

  protected vote(choice: ResidentVoteChoice): void {
    if (!this.canVote() || !this.assemblyId) {
      return;
    }

    const current = this.question();
    if (!current) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.submitVoteUseCase.execute(this.residentId, this.assemblyId, current.questionId, choice)
      .pipe(
        tap((updated) => {
          this.question.set(updated);
          this.successMessage.set('Tu voto fue registrado correctamente.');
        }),
        catchError((error: unknown) => {
          this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible registrar tu voto.');
          return this.loadQuestion();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }

  protected voteLabel(choice: ResidentVoteChoice): string {
    switch (choice) {
      case 'si':
        return 'Sí';
      case 'no':
        return 'No';
      default:
        return 'Abstención';
    }
  }

  private loadQuestion() {
    if (!this.assemblyId) {
      this.isLoading.set(false);
      this.question.set(null);
      return of(null);
    }

    return this.getLiveQuestion.execute(this.residentId, this.assemblyId).pipe(
      tap((result) => {
        this.question.set(result);
        this.errorMessage.set(null);
        this.isLoading.set(false);
        if (!result) {
          this.successMessage.set(null);
        }
      }),
      catchError((error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible obtener la pregunta activa.');
        this.question.set(null);
        this.isLoading.set(false);
        return of(null);
      }),
    );
  }
}
