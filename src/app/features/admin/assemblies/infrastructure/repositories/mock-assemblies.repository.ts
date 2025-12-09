import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import {
  AgendaTopic,
  AssemblyDetail,
  AssemblyFilters,
  AssemblyHistory,
  AssemblyHistoryEvent,
  AssemblyLiveState,
  AssemblyParticipant,
  AssemblyResidentCandidate,
  AssemblyAuditEvent,
  AssemblyAuditAction,
  AssemblyFile,
  AssemblySummary,
  QuestionStatus,
  TopicQuestionResult,
  TopicQuestionVote,
} from '../../domain/entities/assembly';
import { AssembliesRepository } from '../../domain/repositories/assemblies.repository';

@Injectable()
export class MockAssembliesRepository implements AssembliesRepository {
  private readonly assemblies$ = new BehaviorSubject<AssemblyDetail[]>(this.createSeedData());

  findAll(filters?: Partial<AssemblyFilters>): Observable<AssemblySummary[]> {
    return this.assemblies$.pipe(
      map((assemblies) => assemblies.map((assembly) => this.toSummary(assembly))),
      map((summaries) => this.applyFilters(summaries, filters)),
      delay(250),
    );
  }

  findById(id: string): Observable<AssemblyDetail> {
    return this.assemblies$.pipe(
      map((assemblies) => assemblies.find((assembly) => assembly.id === id)),
      map((assembly) => {
        if (!assembly) {
          throw new Error('La asamblea solicitada no existe.');
        }
        return structuredClone(assembly);
      }),
      delay(250),
    );
  }

  save(payload: AssemblyDetail): Observable<AssemblyDetail> {
    if (!payload.id) {
      return throwError(() => new Error('La asamblea debe tener identificador.'));
    }

    const current = this.assemblies$.getValue();
    const index = current.findIndex((item) => item.id === payload.id);
    const copy = structuredClone(current);
    const updated = {
      ...payload,
      updatedAt: new Date().toISOString(),
    } satisfies AssemblyDetail;

    if (index === -1) {
      copy.push(updated);
    } else {
      copy[index] = updated;
    }

    this.assemblies$.next(copy);

    return of(structuredClone(updated)).pipe(delay(250));
  }

  private applyFilters(data: AssemblySummary[], filters?: Partial<AssemblyFilters>): AssemblySummary[] {
    if (!filters) {
      return data;
    }

    return data.filter((summary) => {
      const matchesStatus = filters.status && filters.status !== 'todas'
        ? summary.status === filters.status
        : true;

      const matchesSearch = filters.search
        ? summary.title.toLowerCase().includes(filters.search.toLowerCase())
          || summary.description.toLowerCase().includes(filters.search.toLowerCase())
        : true;

      const matchesRange = filters.range?.start || filters.range?.end
        ? this.matchesRange(summary.startAt, summary.endAt, filters.range?.start, filters.range?.end)
        : true;

      return matchesStatus && matchesSearch && matchesRange;
    });
  }

  private matchesRange(start: string, end: string, from?: string, to?: string): boolean {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const fromTime = from ? new Date(from).getTime() : undefined;
    const toTime = to ? new Date(to).getTime() : undefined;

    if (fromTime && endTime < fromTime) {
      return false;
    }

    if (toTime && startTime > toTime) {
      return false;
    }

    return true;
  }

  private toSummary(detail: AssemblyDetail): AssemblySummary {
    return {
      id: detail.id,
      title: detail.title,
      description: detail.description,
      startAt: detail.startAt,
      endAt: detail.endAt,
      status: detail.status,
      topics: detail.agenda.length,
      createdBy: detail.createdBy,
      canEdit: detail.status === 'borrador' || detail.status === 'programada',
    } satisfies AssemblySummary;
  }

  private createSeedData(): AssemblyDetail[] {
    const now = new Date();
    const iso = (date: Date) => date.toISOString();

    const inDays = (days: number) => {
      const copy = new Date(now);
      copy.setDate(copy.getDate() + days);
      return copy;
    };

    const agendaUpcoming = this.createTopics('upcoming');
    const agendaCurrent = this.createTopics('current');
    const agendaPast = this.createTopics('past');

    const participantsUpcoming = this.createParticipants('upcoming');
    const participantsCurrent = this.createParticipants('current');
    const participantsPast = this.createParticipants('past');

    const availableUpcoming = this.createResidentCatalog();
    const availableCurrent = this.createResidentCatalog();
    const availablePast = this.createResidentCatalog();

    const historyPast = this.createHistory('past', agendaPast, participantsPast);
    const auditUpcoming = this.createAuditTrail('upcoming');
    const auditCurrent = this.createAuditTrail('current');
    const auditPast = this.createAuditTrail('past');
    const filesUpcoming = this.createFiles('upcoming');
    const filesCurrent = this.createFiles('current');
    const filesPast = this.createFiles('past');

    return [
      {
        id: 'asm-001',
        title: 'Asamblea Ordinaria Q1 2026',
        description: 'Definición de reglas generales, presentación de resultados y decisiones estratégicas.',
        rules: 'Quorum mínimo del 60%. Decisiones por mayoría simple, salvo lo contrario indicado.',
        startAt: iso(inDays(7)),
        endAt: iso(inDays(7.5)),
        status: 'programada',
        agenda: agendaUpcoming,
        canManageInitiators: true,
        initiatorIds: ['admin-01', 'admin-02'],
        participants: participantsUpcoming,
        availableParticipants: availableUpcoming,
        liveState: this.createLiveState('upcoming', agendaUpcoming),
        history: this.createHistory('upcoming', agendaUpcoming, participantsUpcoming),
        auditLog: auditUpcoming,
        files: filesUpcoming,
        createdBy: 'admin-01',
        updatedAt: iso(now),
      },
      {
        id: 'asm-002',
        title: 'Asamblea Extraordinaria Seguridad',
        description: 'Plan de seguridad, presupuesto y proveedores para las zonas comunes.',
        rules: 'Quorum mínimo del 70%. Empates resueltos por el administrador asignado.',
        startAt: iso(inDays(-1)),
        endAt: iso(inDays(0)),
        status: 'en-curso',
        agenda: agendaCurrent,
        canManageInitiators: false,
        initiatorIds: ['admin-02'],
        participants: participantsCurrent,
        availableParticipants: availableCurrent,
        liveState: this.createLiveState('current', agendaCurrent),
        history: this.createHistory('current', agendaCurrent, participantsCurrent),
        auditLog: auditCurrent,
        files: filesCurrent,
        createdBy: 'admin-02',
        updatedAt: iso(inDays(-0.1)),
      },
      {
        id: 'asm-003',
        title: 'Asamblea Ordinaria 2025',
        description: 'Cierre del año, aprobación de actas y plan de inversiones 2026.',
        rules: 'Mayoría simple. Empates resueltos por el administrador general.',
        startAt: iso(inDays(-90)),
        endAt: iso(inDays(-89)),
        status: 'finalizada',
        agenda: agendaPast,
        canManageInitiators: false,
        initiatorIds: ['admin-01'],
        participants: participantsPast,
        availableParticipants: availablePast,
        liveState: this.createLiveState('past', agendaPast, historyPast),
        history: historyPast,
        auditLog: auditPast,
        files: filesPast,
        createdBy: 'admin-01',
        updatedAt: iso(inDays(-85)),
      },
    ];
  }

  private createResidentCatalog(): AssemblyResidentCandidate[] {
    return [
      { id: 'res-001', name: 'Laura Pérez', unit: 'Torre A - 301' },
      { id: 'res-002', name: 'Carlos Mendoza', unit: 'Torre B - 1204' },
      { id: 'res-003', name: 'Yuliana Romero', unit: 'Torre C - 905' },
      { id: 'res-004', name: 'Andrés Camacho', unit: 'Torre B - 502' },
      { id: 'res-005', name: 'Valeria Jiménez', unit: 'Torre A - 1802' },
      { id: 'res-006', name: 'Esteban Duarte', unit: 'Torre D - 204' },
      { id: 'res-007', name: 'Natalia Ortiz', unit: 'Torre C - 706' },
      { id: 'res-008', name: 'Santiago Rojas', unit: 'Torre A - 1501' },
      { id: 'res-009', name: 'María Fernanda Silva', unit: 'Torre D - 305' },
      { id: 'res-010', name: 'Julián Gutiérrez', unit: 'Torre B - 804' },
    ];
  }

  private createParticipants(mode: 'upcoming' | 'current' | 'past'): AssemblyParticipant[] {
    const catalog = this.createResidentCatalog();
    const subset = catalog.slice(0, 8);
    const joinedBase = new Date();
    joinedBase.setDate(joinedBase.getDate() - (mode === 'past' ? 90 : 1));
    const baseIso = joinedBase.toISOString();

    return subset.map((candidate, index) => {
      const isBlocked = mode !== 'upcoming' && index === subset.length - 1;
      const status: AssemblyParticipant['status'] = mode === 'upcoming'
        ? 'pendiente'
        : isBlocked
          ? 'bloqueado'
          : 'confirmado';

      return {
        ...candidate,
        canVoteStart: index < 3,
        canVoteQuestions: status !== 'bloqueado',
        status,
        joinedAt: mode === 'upcoming' ? undefined : this.addMinutes(baseIso, index * 12),
      } satisfies AssemblyParticipant;
    });
  }

  private createLiveState(
    mode: 'upcoming' | 'current' | 'past',
    agenda: AgendaTopic[],
    history?: AssemblyHistory,
  ): AssemblyLiveState {
    if (mode === 'past') {
      const results = history?.questionResults ?? [];
      const resultMap = new Map(results.map((result) => [result.questionId, result]));
      const events = history?.events ?? [];
      return {
        isLive: false,
        canStart: false,
        canClose: false,
        currentTopicId: undefined,
        currentQuestionId: undefined,
        startedAt: events[0]?.timestamp ?? agenda[0]?.startAt,
        closedAt: events[events.length - 1]?.timestamp ?? agenda.at(-1)?.endAt,
        questionStates: agenda.flatMap((topic) => topic.questions.map((question) => {
          const match = resultMap.get(question.id);
          return {
            questionId: question.id,
            status: 'cerrada',
            votingWindowStart: question.startAt,
            votingWindowEnd: question.endAt,
            yes: match?.yes ?? 0,
            no: match?.no ?? 0,
            abstain: match?.abstain ?? 0,
            allowsTieBreaker: question.allowsTieBreaker,
            tieBreakerUsed: match ? match.yes !== match.no : false,
          };
        })),
      } satisfies AssemblyLiveState;
    }

    if (mode === 'current') {
      const currentTopic = agenda[1] ?? agenda[0];
      const currentQuestion = currentTopic?.questions[0];

      return {
        isLive: true,
        canStart: false,
        canClose: true,
        currentTopicId: currentTopic?.id,
        currentQuestionId: currentQuestion?.id,
        startedAt: agenda[0]?.startAt ?? new Date().toISOString(),
        questionStates: agenda.flatMap((topic, topicIndex) => topic.questions.map((question, questionIndex) => {
          const status: QuestionStatus = topicIndex === 0
            ? 'cerrada'
            : topicIndex === 1 && questionIndex === 0
              ? 'activa'
              : 'programada';

          const yes = status === 'cerrada' ? 34 - questionIndex * 3 : status === 'activa' ? 20 : 0;
          const no = status === 'cerrada' ? 18 + questionIndex * 2 : status === 'activa' ? 20 : 0;
          const abstain = status === 'cerrada' ? 3 : status === 'activa' ? 2 : 0;

          return {
            questionId: question.id,
            status,
            votingWindowStart: question.startAt,
            votingWindowEnd: question.endAt,
            yes,
            no,
            abstain,
            allowsTieBreaker: question.allowsTieBreaker,
            tieBreakerUsed: status === 'cerrada' ? question.allowsTieBreaker && yes > no : false,
          };
        })),
      } satisfies AssemblyLiveState;
    }

    const firstTopic = agenda[0];
    const firstQuestion = firstTopic?.questions[0];

    return {
      isLive: false,
      canStart: true,
      canClose: false,
      currentTopicId: firstTopic?.id,
      currentQuestionId: firstQuestion?.id,
      questionStates: agenda.flatMap((topic) => topic.questions.map((question) => ({
        questionId: question.id,
        status: 'programada',
        votingWindowStart: question.startAt,
        votingWindowEnd: question.endAt,
        yes: 0,
        no: 0,
        abstain: 0,
        allowsTieBreaker: question.allowsTieBreaker,
        tieBreakerUsed: false,
      }))),
    } satisfies AssemblyLiveState;
  }

  private createHistory(
    mode: 'upcoming' | 'current' | 'past',
    agenda: AgendaTopic[],
    participants: AssemblyParticipant[],
  ): AssemblyHistory | undefined {
    if (mode !== 'past') {
      return undefined;
    }

    const questionResults = this.flattenQuestionResults(agenda, participants);
    const baseStart = agenda[0]?.startAt ?? new Date().toISOString();
    const baseEnd = agenda.at(-1)?.endAt ?? this.addMinutes(baseStart, 180);

    const events: AssemblyHistoryEvent[] = [
      {
        timestamp: baseStart,
        actor: 'admin-01',
        description: 'Se inició la asamblea con verificación de quorum.',
      },
      {
        timestamp: this.addMinutes(baseStart, 45),
        actor: 'admin-02',
        description: 'Se presentaron los resultados financieros y se abrió el debate.',
      },
      {
        timestamp: baseEnd,
        actor: 'admin-01',
        description: 'La asamblea se cerró y se compartió el acta con los asistentes.',
      },
    ];

    return {
      events,
      questionResults,
    } satisfies AssemblyHistory;
  }

  private flattenQuestionResults(
    agenda: AgendaTopic[],
    participants: AssemblyParticipant[],
  ): TopicQuestionResult[] {
    const fallback = new Date().toISOString();

    return agenda.flatMap((topic, topicIndex) => topic.questions.map((question, questionIndex) => {
      const votes = participants.slice(0, 8).map((participant, voteIndex): TopicQuestionVote => {
        const choice: TopicQuestionVote['choice'] = voteIndex % 5 === 0
          ? 'abstencion'
          : (voteIndex + questionIndex) % 2 === 0
            ? 'si'
            : 'no';

        const base = question.startAt ?? fallback;

        return {
          participantId: participant.id,
          participantName: participant.name,
          participantUnit: participant.unit,
          choice,
          emittedAt: this.addMinutes(base, voteIndex * 4 + topicIndex * 7),
        } satisfies TopicQuestionVote;
      });

      const yes = votes.filter((vote) => vote.choice === 'si').length;
      const no = votes.filter((vote) => vote.choice === 'no').length;
      const abstain = votes.filter((vote) => vote.choice === 'abstencion').length;

      return {
        topicId: topic.id,
        questionId: question.id,
        questionText: question.text,
        yes,
        no,
        abstain,
        votes,
      } satisfies TopicQuestionResult;
    }));
  }

  private addMinutes(baseIso: string | undefined, minutes: number): string {
    const base = baseIso ? new Date(baseIso) : new Date();
    if (Number.isNaN(base.getTime())) {
      return new Date().toISOString();
    }
    base.setMinutes(base.getMinutes() + minutes);
    return base.toISOString();
  }

  private createAuditTrail(mode: 'upcoming' | 'current' | 'past'): AssemblyAuditEvent[] {
    const now = new Date();
    const step = mode === 'past' ? -60 : mode === 'current' ? -4 : -1;
    const base = new Date(now);
    base.setDate(base.getDate() + step);

    const makeEvent = (offsetHours: number, action: AssemblyAuditAction, description: Partial<AssemblyAuditEvent>): AssemblyAuditEvent => {
      const timestamp = new Date(base);
      timestamp.setHours(timestamp.getHours() + offsetHours);
      return {
        id: `audit-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: timestamp.toISOString(),
        actorId: description.actorId ?? 'admin-01',
        actorName: description.actorName ?? 'Administrador General',
        action,
        entityType: description.entityType ?? 'assembly',
        entityId: description.entityId,
        metadata: description.metadata,
      } satisfies AssemblyAuditEvent;
    };

    return [
      makeEvent(-6, 'assembly-created', {}),
      makeEvent(-1, 'assembly-updated', { metadata: { field: 'descripcion' } }),
      makeEvent(0, 'participant-added', { entityType: 'participant', entityId: 'res-002', actorId: 'admin-02', actorName: 'Coordinador Seguridad' }),
      makeEvent(1, 'question-opened', { entityType: 'question', entityId: `${mode}-question-2` }),
      makeEvent(1.5, 'tie-breaker', { entityType: 'question', entityId: `${mode}-question-2`, metadata: { vote: 'si' } }),
      makeEvent(2, 'file-downloaded', { entityType: 'file', entityId: `${mode}-file-1`, metadata: { filename: 'Acta Asamblea Anterior.pdf' } }),
    ];
  }

  private createFiles(mode: 'upcoming' | 'current' | 'past'): AssemblyFile[] {
    const now = new Date();
    const iso = (hours: number) => {
      const copy = new Date(now);
      copy.setHours(copy.getHours() + hours);
      return copy.toISOString();
    };

    return [
      {
        id: `${mode}-file-1`,
        name: 'Acta Asamblea Anterior.pdf',
        type: 'acta',
        sizeKb: 742,
        url: '#',
        uploadedAt: iso(-72),
        uploadedBy: 'admin-01',
      },
      {
        id: `${mode}-file-2`,
        name: 'Propuesta presupuestal.xlsx',
        type: 'anexo',
        sizeKb: 1280,
        url: '#',
        uploadedAt: iso(-48),
        uploadedBy: 'admin-02',
      },
      {
        id: `${mode}-file-3`,
        name: 'Presentación general.pdf',
        type: 'presentacion',
        sizeKb: 5640,
        url: '#',
        uploadedAt: iso(-24),
        uploadedBy: 'admin-03',
      },
    ];
  }

  private createTopics(mode: 'upcoming' | 'current' | 'past'): AgendaTopic[] {
    const baseDate = new Date();
    const offset = mode === 'upcoming' ? 5 : mode === 'current' ? -0.2 : -90;

    const asISOString = (hoursOffset: number) => {
      const copy = new Date(baseDate);
      copy.setHours(copy.getHours() + hoursOffset + offset * 24);
      return copy.toISOString();
    };

    return [
      {
        id: `${mode}-topic-1`,
        title: 'Presentación de avances',
        description: 'Resultados generales del periodo y seguimiento de compromisos anteriores.',
        startAt: asISOString(0),
        endAt: asISOString(1),
        questions: [
          {
            id: `${mode}-question-1`,
            text: '¿Aprueba el acta de la asamblea anterior?',
            description: 'Incluye compromisos y pendientes documentados.',
            startAt: asISOString(0.2),
            endAt: asISOString(0.3),
            allowsTieBreaker: true,
            status: mode === 'past' ? 'cerrada' : 'programada',
          },
        ],
      },
      {
        id: `${mode}-topic-2`,
        title: 'Presupuesto y proveedores',
        description: 'Revisión de proyecciones de costos y selección de contratistas.',
        startAt: asISOString(1),
        endAt: asISOString(2),
        questions: [
          {
            id: `${mode}-question-2`,
            text: '¿Aprueba el presupuesto actualizado?',
            description: 'Incluye incrementos de mantenimiento y fondo de reserva.',
            startAt: asISOString(1.2),
            endAt: asISOString(1.4),
            allowsTieBreaker: true,
            status: mode === 'past' ? 'cerrada' : mode === 'current' ? 'activa' : 'programada',
          },
          {
            id: `${mode}-question-3`,
            text: '¿Aprueba el proveedor propuesto para vigilancia?',
            startAt: asISOString(1.5),
            endAt: asISOString(1.7),
            allowsTieBreaker: false,
            status: mode === 'past' ? 'cerrada' : 'programada',
          },
        ],
      },
    ];
  }
}
