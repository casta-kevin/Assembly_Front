import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LoadResidentNotificationsUseCase } from '../../../assemblies/application/use-cases/load-resident-notifications.use-case';
import { MarkNotificationReadUseCase } from '../../../assemblies/application/use-cases/mark-notification-read.use-case';
import { ResidentNotification } from '../../../assemblies/domain/entities/resident-assembly';
import { assemblyStatusBadge, assemblyStatusLabel } from '../../../../admin/assemblies/domain/entities/assembly-status.utils';

@Component({
  selector: 'app-resident-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './resident-notifications.component.html',
  styleUrl: './resident-notifications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentNotificationsComponent {
  private readonly loadNotifications = inject(LoadResidentNotificationsUseCase);
  private readonly markNotificationRead = inject(MarkNotificationReadUseCase);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly residentId = 'res-001';
  protected readonly statusLabel = assemblyStatusLabel;
  protected readonly badgeClass = assemblyStatusBadge;

  protected readonly notifications = signal<ResidentNotification[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.fetchNotifications();
  }

  protected trackById(_: number, item: ResidentNotification): string {
    return item.id;
  }

  protected openAssembly(notification: ResidentNotification): void {
    const navigate = () => void this.router.navigate(['/resident', 'assemblies', notification.assemblyId]);

    if (notification.read) {
      navigate();
      return;
    }

    this.markNotificationRead.execute(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: navigate,
        error: () => {
          this.errorMessage.set('No fue posible actualizar la notificación. Intenta nuevamente.');
        },
      });
  }

  private fetchNotifications(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.loadNotifications.execute(this.residentId)
      .pipe(
        tap((items) => this.notifications.set(items)),
        catchError(() => {
          this.errorMessage.set('No fue posible cargar las notificaciones. Intenta nuevamente.');
          this.notifications.set([]);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.isLoading.set(false),
        error: () => this.isLoading.set(false),
      });
  }
}
