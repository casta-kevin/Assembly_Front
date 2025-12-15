import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GetResidentAssemblyDetailUseCase } from '../../../assemblies/application/use-cases/get-resident-assembly-detail.use-case';
import { ResidentAssemblyDetail } from '../../../assemblies/domain/entities/resident-assembly';
import { assemblyStatusBadge, assemblyStatusLabel } from '../../../../admin/assemblies/domain/entities/assembly-status.utils';

@Component({
  selector: 'app-resident-assembly-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './resident-assembly-detail.component.html',
  styleUrl: './resident-assembly-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentAssemblyDetailComponent {
  private readonly getDetail = inject(GetResidentAssemblyDetailUseCase);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly residentId = 'res-001';

  protected readonly assembly = signal<ResidentAssemblyDetail | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusLabel = assemblyStatusLabel;
  protected readonly statusBadge = assemblyStatusBadge;

  protected readonly isHistoryView = computed(() => {
    const status = this.assembly()?.status;
    return status === 'FNLC';
  });

  protected readonly isLiveAssembly = computed(() => this.assembly()?.status === 'INPR');

  protected readonly currentQuestion = computed(() => this.assembly()?.currentQuestion ?? null);

  constructor() {
    const assemblyId = this.route.snapshot.paramMap.get('id');
    if (!assemblyId) {
      this.errorMessage.set('No se proporcionó una asamblea válida.');
      return;
    }

    this.fetchDetail(assemblyId);
  }

  protected trackByTopic(_: number, topic: ResidentAssemblyDetail['topics'][number]): string {
    return topic.id;
  }

  protected trackByQuestion(_: number, question: ResidentAssemblyDetail['topics'][number]['questions'][number]): string {
    return question.id;
  }

  private fetchDetail(assemblyId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.getDetail.execute(this.residentId, assemblyId)
      .pipe(
        catchError((error: unknown) => {
          this.errorMessage.set(error instanceof Error ? error.message : 'No fue posible cargar la asamblea.');
          this.assembly.set(null);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (detail) => {
          if (detail) {
            this.assembly.set(detail);
          }
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }
}
