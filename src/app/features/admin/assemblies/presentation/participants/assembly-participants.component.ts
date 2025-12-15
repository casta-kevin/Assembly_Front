import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GetAssemblyUseCase } from '../../../assemblies/application/use-cases/get-assembly.use-case';
import { SaveAssemblyUseCase } from '../../../assemblies/application/use-cases/save-assembly.use-case';
import { AssemblyDetail, AssemblyParticipant, AssemblyResidentCandidate } from '../../../assemblies/domain/entities/assembly';
import { participantStatusBadge, participantStatusLabel } from '../../../assemblies/domain/entities/assembly-status.utils';

@Component({
  selector: 'app-assembly-participants',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './assembly-participants.component.html',
  styleUrl: './assembly-participants.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyParticipantsComponent {
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
  protected readonly assembly = signal<AssemblyDetail | null>(null);
  protected readonly participants = signal<AssemblyParticipant[]>([]);
  protected readonly availableCandidates = signal<AssemblyResidentCandidate[]>([]);
  protected readonly participantStatusLabel = participantStatusLabel;
  protected readonly participantStatusBadge = participantStatusBadge;

  protected readonly filterControl: FormControl<string> = this.fb.nonNullable.control('');
  private readonly filterTerm = signal('');

  protected readonly isLocked = computed(() => {
    const status = this.assembly()?.status;
    return status !== 'DRFT';
  });

  protected readonly summary = computed(() => {
    const list = this.participants();
    return {
      total: list.length,
      startVoters: list.filter((item) => item.canVoteStart).length,
      blocked: list.filter((item) => item.membershipStatus === 'BLOCKED').length,
    };
  });

  protected readonly filteredCandidates = computed(() => {
    const term = this.filterTerm().trim().toLowerCase();
    const assignedIds = new Set(this.participants().map((item) => item.id));

    return this.availableCandidates().filter((candidate) => {
      if (assignedIds.has(candidate.id)) {
        return false;
      }
      if (!term) {
        return true;
      }
      return candidate.name.toLowerCase().includes(term) || candidate.unit.toLowerCase().includes(term);
    });
  });

  constructor() {
    this.filterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.filterTerm.set(value ?? ''));

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.loadContext(params));
  }

  protected toggleCanVoteStart(id: string): void {
    this.participants.update((current) => current.map((participant) => (
      participant.id === id
        ? { ...participant, canVoteStart: !participant.canVoteStart }
        : participant
    )));
  }

  protected toggleCanVoteQuestions(id: string): void {
    this.participants.update((current) => current.map((participant) => (
      participant.id === id
        ? { ...participant, canVoteQuestions: !participant.canVoteQuestions }
        : participant
    )));
  }

  protected updateStatus(id: string, status: AssemblyParticipant['membershipStatus']): void {
    this.participants.update((current) => current.map((participant) => (
      participant.id === id
        ? { ...participant, membershipStatus: status }
        : participant
    )));
  }

  protected removeParticipant(id: string): void {
    if (this.isLocked()) {
      return;
    }
    this.participants.update((current) => current.filter((participant) => participant.id !== id));
  }

  protected addParticipant(candidate: AssemblyResidentCandidate): void {
    if (this.isLocked()) {
      return;
    }

    const exists = this.participants().some((participant) => participant.id === candidate.id);
    if (exists) {
      return;
    }

    this.participants.update((current) => [
      ...current,
      {
        ...candidate,
        canVoteStart: false,
        canVoteQuestions: true,
        membershipStatus: 'INVITED',
        joinedAt: undefined,
      },
    ]);
  }

  protected saveChanges(): void {
    const assembly = this.assembly();
    if (!assembly) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload: AssemblyDetail = {
      ...structuredClone(assembly),
      participants: structuredClone(this.participants()),
      availableParticipants: structuredClone(this.availableCandidates()),
    };

    this.saveAssembly
      .execute(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.successMessage.set('Participantes actualizados correctamente.');
          this.assembly.set(updated);
          this.participants.set(structuredClone(updated.participants));
          this.availableCandidates.set(structuredClone(updated.availableParticipants));
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No fue posible guardar los participantes.';
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
          this.participants.set(structuredClone(detail.participants ?? []));
          this.availableCandidates.set(structuredClone(detail.availableParticipants ?? []));
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
