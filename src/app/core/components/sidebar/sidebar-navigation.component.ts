import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthSessionService } from '../../../features/auth/application/services/auth-session.service';

type UserSegment = 'admin' | 'resident' | 'guest';

type NavItem = {
  label: string;
  description?: string;
  route: string;
  queryParams?: Record<string, string> | null;
  badge?: string;
  roles?: UserSegment[];
  exact?: boolean;
};

type NavSection = {
  id: string;
  label: string;
  roles?: UserSegment[];
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'admin-overview',
    label: 'Panel administrativo',
    roles: ['admin'],
    items: [
      {
        label: 'Resumen general',
        description: 'Listado de todas las asambleas',
        route: '/admin/assemblies',
        exact: false,
      },
      {
        label: 'Participantes',
        description: 'Gestión de asistentes y quorum',
        route: '/admin/assemblies',
        queryParams: { view: 'participants' },
        exact: false,
      },
      {
        label: 'Auditoría',
        description: 'Historial de eventos y registros',
        route: '/admin/assemblies',
        queryParams: { view: 'audit' },
        exact: false,
      },
    ],
  },
  {
    id: 'assembly-actions',
    label: 'Asamblea',
    roles: ['admin'],
    items: [
      {
        label: 'Crear asamblea',
        description: 'Solo datos generales',
        route: '/admin/assemblies/new',
        badge: 'Nuevo',
      },
      {
        label: 'Orden del día',
        description: 'Diseñar agenda y preguntas',
        route: '/admin/assemblies/agenda',
        exact: false,
      },
    ],
  },
  {
    id: 'resident-overview',
    label: 'Mi participación',
    roles: ['resident'],
    items: [
      {
        label: 'Notificaciones',
        description: 'Avisos y recordatorios',
        route: '/resident/notifications',
        exact: false,
      },
      {
        label: 'Mis asambleas',
        description: 'Agenda de reuniones',
        route: '/resident/assemblies',
        exact: false,
      },
      {
        label: 'Votaciones en vivo',
        description: 'Participa cuando te llamen',
        route: '/resident/assemblies',
        queryParams: { view: 'live' },
        exact: false,
      },
    ],
  },
];

@Component({
  selector: 'app-sidebar-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="sidebar" aria-label="Navegación principal">
      <ng-container *ngIf="visibleSections().length; else guest">
        <section class="sidebar__section" *ngFor="let section of visibleSections()">
          <p class="sidebar__section-title">{{ section.label }}</p>
          <ul class="sidebar__list">
            <li *ngFor="let item of section.items" class="sidebar__item">
              <a
                [routerLink]="item.route"
                [queryParams]="item.queryParams ?? null"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: item.exact ?? true }"
                class="sidebar__link"
              >
                <div class="sidebar__link-text">
                  <span class="sidebar__item-label">{{ item.label }}</span>
                  <small class="sidebar__item-description" *ngIf="item.description">{{ item.description }}</small>
                </div>
                <span class="sidebar__badge" *ngIf="item.badge">{{ item.badge }}</span>
              </a>
            </li>
          </ul>
        </section>
      </ng-container>
      <ng-template #guest>
        <div class="sidebar__empty">
          <p>Inicia sesión para ver tus accesos.</p>
        </div>
      </ng-template>
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .sidebar {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        padding: var(--space-md) var(--space-sm);
        color: var(--sidebar-foreground);
      }

      .sidebar__section {
        display: flex;
        flex-direction: column;
        gap: var(--space-2xs);
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--radius-card);
        padding: var(--space-sm);
      }

      .sidebar__section-title {
        font-size: var(--text-sm);
        font-weight: var(--font-weight-medium);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin: 0;
        color: rgba(255, 255, 255, 0.8);
      }

      .sidebar__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2xs);
      }

      .sidebar__item {
        display: block;
      }

      .sidebar__link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2xs);
        text-decoration: none;
        padding: var(--space-2xs) var(--space-xs);
        border-radius: var(--radius);
        color: inherit;
        transition: background-color 180ms ease, transform 180ms ease;
        border: 1px solid transparent;
      }

      .sidebar__link:hover {
        background-color: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.12);
        transform: translateX(2px);
      }

      .is-active {
        background-color: rgba(255, 190, 0, 0.15);
        border-color: rgba(255, 190, 0, 0.6);
        color: #ffbe00;
      }

      .sidebar__link-text {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .sidebar__item-label {
        font-size: var(--text-base);
        font-weight: var(--font-weight-medium);
      }

      .sidebar__item-description {
        font-size: var(--text-sm);
        color: rgba(255, 255, 255, 0.7);
      }

      .sidebar__badge {
        font-size: var(--text-xs);
        background: var(--accent);
        color: var(--accent-foreground);
        border-radius: 999px;
        padding: 0.1rem 0.6rem;
        font-weight: var(--font-weight-medium);
      }

      .sidebar__empty {
        padding: var(--space-md);
        border-radius: var(--radius-card);
        background: rgba(255, 255, 255, 0.05);
        text-align: center;
      }

      @media (max-width: 960px) {
        .sidebar {
          flex-direction: row;
          overflow-x: auto;
        }

        .sidebar__section {
          min-width: 240px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarNavigationComponent {
  private readonly sessionService = inject(AuthSessionService);

  protected readonly visibleSections = computed(() => {
    const segment = this.currentSegment();
    return NAV_SECTIONS.filter((section) => {
      if (!section.roles || !section.roles.length) {
        return true;
      }
      if (segment === 'guest') {
        return false;
      }
      return section.roles.includes(segment);
    });
  });

  currentSegment(): UserSegment {
    const session = this.sessionService.session();
    const role = (session?.roleId ?? '').toUpperCase();

    if (role === 'ADMN' || role.includes('ADMIN')) {
      return 'admin';
    }

    if (role === 'RSDT' || role.includes('RESIDENT') || role.includes('VECINO')) {
      return 'resident';
    }

    return 'guest';
  }
}
