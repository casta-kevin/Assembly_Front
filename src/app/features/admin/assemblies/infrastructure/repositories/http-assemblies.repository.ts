import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Inject, Injectable, signal } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { APP_API_BASE_URL } from '../../../../../config/api.config';
import { AuthSessionService } from '../../../../auth/application/services/auth-session.service';
import {
  AgendaTopic,
  AssemblyDetail,
  AssemblyFilters,
  AssemblyStatus,
  AssemblySummary,
  TopicQuestion,
} from '../../domain/entities/assembly';
import { AssembliesRepository } from '../../domain/repositories/assemblies.repository';

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  errors?: string[];
  data?: T;
  Success?: boolean;
  Message?: string;
  Errors?: string[];
  Data?: T;
};

interface AssemblyDto {
  id?: string;
  propertyId?: string;
  title?: string;
  description?: string;
  rules?: string;
  startDatePlanned?: string;
  endDatePlanned?: string;
  startDateActual?: string;
  endDateActual?: string;
  status?: string;
  createdAt?: string;
}

interface CreateAssemblyDto {
  title: string;
  description?: string;
  rules?: string;
  startDatePlanned?: string;
  endDatePlanned?: string;
}

interface CreateAgendaDto {
  assemblyId: string;
  questions: CreateAgendaQuestionDto[];
}

interface CreateAgendaQuestionDto {
  title: string;
  description?: string;
  orderIndex: number;
  startDate?: string;
  endDate?: string;
  options: CreateAgendaOptionDto[];
}

interface CreateAgendaOptionDto {
  text: string;
}

@Injectable()
export class HttpAssembliesRepository implements AssembliesRepository {
  private readonly defaultAgenda = signal<AgendaTopic[]>([]);

  constructor(
    private readonly http: HttpClient,
    @Inject(APP_API_BASE_URL) private readonly apiBaseUrl: string,
    private readonly authSession: AuthSessionService,
  ) {
    this.defaultAgenda.set(this.createDefaultAgenda());
  }

  findAll(filters?: Partial<AssemblyFilters>): Observable<AssemblySummary[]> {
    const url = `${this.apiBaseUrl}/Assemblies`;
    let params = new HttpParams();

    if (filters?.status && filters.status !== 'ALL') {
      params = params.set('status', filters.status);
    }

    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    if (filters?.range?.start) {
      params = params.set('startDate', filters.range.start);
    }

    if (filters?.range?.end) {
      params = params.set('endDate', filters.range.end);
    }

    return this.http
      .get<ApiResponse<AssemblyDto[]>>(url, { headers: this.buildHeaders(), params })
      .pipe(map((response) => this.normalizeApiResponse(response)))
      .pipe(
        map((normalized) => {
          if (!normalized.success) {
            const message = normalized.message ?? normalized.errors?.[0] ?? 'No fue posible cargar las asambleas.';
            throw new Error(message);
          }

          return (normalized.data ?? []).map((item) => this.mapDtoToSummary(item));
        }),
      );
  }

  findById(id: string): Observable<AssemblyDetail> {
    const url = `${this.apiBaseUrl}/Assemblies/${id}`;

    return this.http
      .get<ApiResponse<AssemblyDto | null>>(url, { headers: this.buildHeaders() })
      .pipe(map((response) => this.normalizeApiResponse(response)))
      .pipe(
        map((normalized) => {
          if (!normalized.success || !normalized.data) {
            const message = normalized.message ?? 'No fue posible cargar la asamblea solicitada.';
            throw new Error(message);
          }

          return this.mapDtoToDetail(normalized.data);
        }),
      );
  }

  save(payload: AssemblyDetail): Observable<AssemblyDetail> {
    if (this.hasServerGeneratedId(payload.id)) {
      return this.updateAssembly(payload).pipe(map(() => payload));
    }

    return this.createAssembly(payload).pipe(
      map((assemblyId) => ({
        ...payload,
        id: assemblyId,
      } satisfies AssemblyDetail)),
    );
  }

  saveAgenda(payload: { assemblyId: string; agenda: AgendaTopic[]; startAt: string; endAt: string }): Observable<void> {
    return this.persistAgenda(payload.assemblyId, payload.agenda, payload.startAt, payload.endAt);
  }

  private normalizeApiResponse<T>(response: ApiResponse<T>) {
    return {
      success: response.success ?? response.Success ?? false,
      message: response.message ?? response.Message,
      errors: response.errors ?? response.Errors,
      data: response.data ?? response.Data,
    };
  }

  private createAssembly(payload: AssemblyDetail): Observable<string> {
    const url = `${this.apiBaseUrl}/Assemblies`;
    const body = this.buildAssemblyRequestBody(payload);

    return this.http
      .post<ApiResponse<string | { id: string }>>(url, body, { headers: this.buildHeaders() })
      .pipe(map((response) => this.normalizeApiResponse(response)))
      .pipe(
        map((normalized) => {
          if (!normalized.success || !normalized.data) {
            const message = normalized.message ?? normalized.errors?.[0] ?? 'No fue posible crear la asamblea.';
            throw new Error(message);
          }

          const identifier = typeof normalized.data === 'string' ? normalized.data : normalized.data.id;
          if (!identifier) {
            throw new Error('La creación de la asamblea no devolvió un identificador.');
          }

          return identifier;
        }),
      );
  }

  private updateAssembly(payload: AssemblyDetail): Observable<void> {
    const url = `${this.apiBaseUrl}/Assemblies/${payload.id}`;
    const body = this.buildAssemblyRequestBody(payload);

    return this.http
      .put<ApiResponse<unknown>>(url, body, { headers: this.buildHeaders() })
      .pipe(map((response) => this.normalizeApiResponse(response)))
      .pipe(
        map((normalized) => {
          if (!normalized.success) {
            const message = normalized.message ?? normalized.errors?.[0] ?? 'No fue posible actualizar la asamblea.';
            throw new Error(message);
          }
        }),
      );
  }

  private persistAgenda(
    assemblyId: string,
    agenda: AgendaTopic[],
    fallbackStart: string,
    fallbackEnd: string,
  ): Observable<void> {
    const questions = this.buildAgendaQuestions(agenda, fallbackStart, fallbackEnd);
    if (!questions.length) {
      return of(void 0);
    }

    const url = `${this.apiBaseUrl}/Assemblies/${assemblyId}/Agenda`;
    const body: CreateAgendaDto = {
      assemblyId,
      questions,
    };

    return this.http
      .post<ApiResponse<unknown>>(url, body, { headers: this.buildHeaders() })
      .pipe(map((response) => this.normalizeApiResponse(response)))
      .pipe(
        map((normalized) => {
          if (!normalized.success) {
            const message = normalized.message ?? normalized.errors?.[0] ?? 'No fue posible registrar el orden del día.';
            throw new Error(message);
          }
        }),
      );
  }

  private buildAssemblyRequestBody(payload: AssemblyDetail): CreateAssemblyDto {
    return {
      title: payload.title,
      description: payload.description || undefined,
      rules: payload.rules || undefined,
      startDatePlanned: payload.startAt,
      endDatePlanned: payload.endAt,
    } satisfies CreateAssemblyDto;
  }

  private mapDtoToSummary(dto: AssemblyDto): AssemblySummary {
    const start = dto.startDatePlanned ?? dto.startDateActual ?? new Date().toISOString();
    const end = dto.endDatePlanned ?? dto.endDateActual ?? start;

    return {
      id: dto.id ?? this.generateId('asm'),
      title: dto.title ?? 'Asamblea',
      description: dto.description ?? '',
      startAt: start,
      endAt: end,
      status: this.mapStatus(dto.status),
      topics: 0,
      createdBy: dto.propertyId ?? 'admin',
      canEdit: this.mapStatus(dto.status) === 'DRFT',
    } satisfies AssemblySummary;
  }

  private mapDtoToDetail(dto: AssemblyDto): AssemblyDetail {
    const start = dto.startDatePlanned ?? dto.startDateActual ?? new Date().toISOString();
    const end = dto.endDatePlanned ?? dto.endDateActual ?? start;
    const agenda = structuredClone(this.defaultAgenda());

    return {
      id: dto.id ?? this.generateId('asm'),
      title: dto.title ?? 'Asamblea',
      description: dto.description ?? '',
      rules: dto.rules ?? '',
      startAt: start,
      endAt: end,
      status: this.mapStatus(dto.status),
      agenda,
      canManageInitiators: true,
      initiatorIds: ['admin-01'],
      participants: [],
      availableParticipants: [],
      liveState: undefined,
      history: { events: [], questionResults: [] },
      auditLog: [],
      files: [],
      createdBy: dto.propertyId ?? 'admin',
      updatedAt: dto.createdAt ?? new Date().toISOString(),
    } satisfies AssemblyDetail;
  }

  private createDefaultAgenda(): AgendaTopic[] {
    const topicId = this.generateId('topic');
    const questionId = this.generateId('question');

    return [
      {
        id: topicId,
        title: 'Nuevo tema',
        description: '',
        questions: [
          {
            id: questionId,
            text: '¿Aprueba la propuesta?',
            allowsTieBreaker: true,
            status: 'PLND',
          },
        ],
      },
    ];
  }

  private mapStatus(status?: string): AssemblyStatus {
    const normalized = (status ?? '').toUpperCase();

    if (normalized === 'INPR' || normalized === 'IN_PROGRESS') {
      return 'INPR';
    }

    if (normalized === 'FNLC' || normalized === 'FINISHED') {
      return 'FNLC';
    }

    return 'DRFT';
  }

  private generateId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${random}`;
  }

  private hasServerGeneratedId(id: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  }

  private buildHeaders(): HttpHeaders {
    const token = this.authSession.session()?.token;

    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private buildAgendaQuestions(
    agenda: AgendaTopic[],
    fallbackStart: string,
    fallbackEnd: string,
  ): CreateAgendaQuestionDto[] {
    let order = 0;
    const fallbackStartIso = fallbackStart || new Date().toISOString();
    const fallbackEndIso = fallbackEnd || fallbackStartIso;

    return agenda.flatMap((topic) => {
      const topicStart = topic.startAt || fallbackStartIso;
      const topicEnd = topic.endAt || fallbackEndIso;

      return topic.questions.map((question) => {
        const questionStart = this.coalesceDate(question.startAt, topicStart, fallbackStartIso);
        const questionEnd = this.coalesceDate(question.endAt, topicEnd, fallbackEndIso);
        const payload: CreateAgendaQuestionDto = {
          title: question.text || `Pregunta ${order + 1}`,
          description: question.description || topic.description || undefined,
          orderIndex: order,
          startDate: questionStart,
          endDate: questionEnd,
          options: this.buildQuestionOptions(question),
        };
        order += 1;
        return payload;
      });
    });
  }

  private buildQuestionOptions(question: TopicQuestion): CreateAgendaOptionDto[] {
    if (question.description) {
      return [{ text: question.description }];
    }

    return [
      { text: 'Sí' },
      { text: 'No' },
      { text: 'Abstención' },
    ];
  }

  private coalesceDate(...values: Array<string | undefined>): string | undefined {
    return values.find((value) => !!value);
  }
}
