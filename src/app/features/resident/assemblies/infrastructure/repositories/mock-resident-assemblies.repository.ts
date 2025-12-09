import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import {
  ResidentAssemblyDetail,
  ResidentAssemblySummary,
  ResidentLiveQuestion,
  ResidentNotification,
  ResidentTopic,
  ResidentVoteChoice,
} from '../../domain/entities/resident-assembly';
import { QuestionStatus } from '../../../../admin/assemblies/domain/entities/assembly';
import { ResidentAssembliesRepository } from '../../domain/repositories/resident-assemblies.repository';

interface ResidentNotificationRecord extends ResidentNotification {
  residentId: string;
}

interface LiveQuestionRecord {
  assemblyId: string;
  topicId: string;
  topicTitle: string;
  questionId: string;
  questionText: string;
  questionDescription?: string;
  status: QuestionStatus;
  closesAt?: string;
  allowVoting: boolean;
  results: {
    yes: number;
    no: number;
    abstain: number;
  };
  userVotes: Map<string, ResidentVoteChoice>;
}

@Injectable()
export class MockResidentAssembliesRepository implements ResidentAssembliesRepository {
  private readonly notifications$ = new BehaviorSubject<ResidentNotificationRecord[]>(this.createNotifications());
  private readonly assignmentsByResident = this.createAssignments();
  private readonly liveSessions = this.createLiveSessions();
  private readonly detailsByAssembly = this.createDetails();

  getNotifications(residentId: string): Observable<ResidentNotification[]> {
    return this.notifications$.pipe(
      map((items) => items.filter((item) => item.residentId === residentId)),
      map((items) => structuredClone(items) as ResidentNotification[]),
      delay(200),
    );
  }

  getAssignments(residentId: string): Observable<ResidentAssemblySummary[]> {
    const assignments = this.assignmentsByResident.get(residentId) ?? [];
    return of(structuredClone(assignments)).pipe(delay(200));
  }

  getAssignmentDetail(residentId: string, assemblyId: string): Observable<ResidentAssemblyDetail> {
    const assignments = this.assignmentsByResident.get(residentId) ?? [];
    const isAssigned = assignments.some((assignment) => assignment.id === assemblyId);

    if (!isAssigned) {
      throw new Error('No estás asignado a la asamblea solicitada.');
    }

    const detail = this.detailsByAssembly.get(assemblyId);

    if (!detail) {
      throw new Error('No se encontró el detalle de la asamblea solicitada.');
    }

    const copy = structuredClone(detail) as ResidentAssemblyDetail;
    const session = this.liveSessions.get(assemblyId);

    if (session) {
      const normalized = this.normalizeSession(session);
      this.liveSessions.set(assemblyId, normalized);
      copy.currentTopicId = normalized.topicId;
      copy.currentQuestionId = normalized.questionId;
      copy.currentQuestion = this.toResidentLiveQuestion(normalized, residentId);
    }

    return of(copy).pipe(delay(200));
  }

  markNotificationAsRead(notificationId: string): Observable<void> {
    const current = this.notifications$.getValue();
    const index = current.findIndex((item) => item.id === notificationId);
    if (index !== -1) {
      const copy = structuredClone(current);
      copy[index] = {
        ...copy[index],
        read: true,
      } satisfies ResidentNotificationRecord;
      this.notifications$.next(copy);
    }
    return of(void 0).pipe(delay(150));
  }

  getLiveQuestion(residentId: string, assemblyId: string): Observable<ResidentLiveQuestion | null> {
    const session = this.liveSessions.get(assemblyId);

    if (!session) {
      return of(null).pipe(delay(150));
    }

    const normalized = this.normalizeSession(session);
    this.liveSessions.set(assemblyId, normalized);
    return of(this.toResidentLiveQuestion(normalized, residentId)).pipe(delay(150));
  }

  submitVote(
    residentId: string,
    assemblyId: string,
    questionId: string,
    choice: ResidentVoteChoice,
  ): Observable<ResidentLiveQuestion> {
    const session = this.liveSessions.get(assemblyId);

    if (!session || session.questionId !== questionId) {
      throw new Error('No hay una pregunta activa para registrar tu voto.');
    }

    const normalized = this.normalizeSession(session);
    this.liveSessions.set(assemblyId, normalized);

    if (normalized.status !== 'activa') {
      throw new Error(normalized.status === 'cerrada'
        ? 'La pregunta ya fue cerrada.'
        : 'La pregunta aún no está activa.');
    }

    if (!normalized.allowVoting) {
      throw new Error('No tienes permisos para votar en esta pregunta.');
    }

    if (normalized.userVotes.has(residentId)) {
      throw new Error('Ya registraste tu voto para esta pregunta.');
    }

    if (normalized.closesAt && new Date(normalized.closesAt).getTime() < Date.now()) {
      normalized.status = 'cerrada';
      normalized.allowVoting = false;
      this.liveSessions.set(assemblyId, normalized);
      throw new Error('La pregunta ya fue cerrada.');
    }

    normalized.userVotes.set(residentId, choice);

    switch (choice) {
      case 'si':
        normalized.results.yes += 1;
        break;
      case 'no':
        normalized.results.no += 1;
        break;
      case 'abstencion':
      default:
        normalized.results.abstain += 1;
        break;
    }

    this.liveSessions.set(assemblyId, normalized);
    return of(this.toResidentLiveQuestion(normalized, residentId)).pipe(delay(200));
  }

  private createNotifications(): ResidentNotificationRecord[] {
    const now = new Date();
    const iso = (date: Date) => date.toISOString();
    const daysFromNow = (days: number) => {
      const copy = new Date(now);
      copy.setDate(copy.getDate() + days);
      return copy;
    };

    return [
      {
        id: 'not-001',
        residentId: 'res-001',
        assemblyId: 'asm-001',
        title: 'Nueva asamblea programada',
        summary: 'Fuiste asignado a la Asamblea Ordinaria Q1 2026. Revisa la agenda y prepárate.',
        startAt: iso(daysFromNow(7)),
        status: 'programada',
        createdAt: iso(daysFromNow(-1)),
        read: false,
      },
      {
        id: 'not-002',
        residentId: 'res-001',
        assemblyId: 'asm-002',
        title: 'Asamblea en curso',
        summary: 'La Asamblea Extraordinaria de Seguridad está en curso. Puedes ingresar a seguir el progreso.',
        startAt: iso(daysFromNow(-1)),
        status: 'en-curso',
        createdAt: iso(daysFromNow(-0.2)),
        read: false,
      },
      {
        id: 'not-003',
        residentId: 'res-001',
        assemblyId: 'asm-003',
        title: 'Acta disponible',
        summary: 'Consulta el resumen de decisiones de la Asamblea Ordinaria 2025.',
        startAt: iso(daysFromNow(-90)),
        status: 'finalizada',
        createdAt: iso(daysFromNow(-70)),
        read: true,
      },
    ];
  }

  private createAssignments(): Map<string, ResidentAssemblySummary[]> {
    const now = new Date();
    const iso = (date: Date) => date.toISOString();
    const daysFromNow = (days: number) => {
      const copy = new Date(now);
      copy.setDate(copy.getDate() + days);
      return copy;
    };

    const assignments: ResidentAssemblySummary[] = [
      {
        id: 'asm-001',
        title: 'Asamblea Ordinaria Q1 2026',
        description: 'Resultados trimestrales, presupuestos y definiciones estratégicas.',
        startAt: iso(daysFromNow(7)),
        endAt: iso(daysFromNow(7.5)),
        status: 'programada',
      },
      {
        id: 'asm-002',
        title: 'Asamblea Extraordinaria Seguridad',
        description: 'Revisión de plan de seguridad y contratación de proveedores.',
        startAt: iso(daysFromNow(-1)),
        endAt: iso(daysFromNow(0)),
        status: 'en-curso',
      },
      {
        id: 'asm-003',
        title: 'Asamblea Ordinaria 2025',
        description: 'Cierre anual y plan de inversiones para 2026.',
        startAt: iso(daysFromNow(-90)),
        endAt: iso(daysFromNow(-89)),
        status: 'finalizada',
      },
    ];

    return new Map<string, ResidentAssemblySummary[]>([['res-001', assignments]]);
  }

  private createLiveSessions(): Map<string, LiveQuestionRecord> {
    const session: LiveQuestionRecord = {
      assemblyId: 'asm-002',
      topicId: 'top-current-002',
      topicTitle: 'Revisión de informes',
      questionId: 'q-current-002',
      questionText: 'Aprobación del informe financiero',
      questionDescription: 'Confirma el informe financiero presentado por la administración.',
      status: 'activa',
      closesAt: this.shiftIso(0.05),
      allowVoting: true,
      results: {
        yes: 20,
        no: 18,
        abstain: 2,
      },
      userVotes: new Map(),
    };

    return new Map([[session.assemblyId, session]] satisfies [string, LiveQuestionRecord][]);
  }

  private createDetails(): Map<string, ResidentAssemblyDetail> {
    const detail: ResidentAssemblyDetail[] = [
      {
        id: 'asm-001',
        title: 'Asamblea Ordinaria Q1 2026',
        description: 'Discusión de resultados trimestrales, presupuesto y proyectos clave.',
        startAt: this.shiftIso(7),
        endAt: this.shiftIso(7.5),
        status: 'programada',
        topics: this.createTopics('upcoming'),
      },
      {
        id: 'asm-002',
        title: 'Asamblea Extraordinaria Seguridad',
        description: 'Plan de seguridad, presupuesto y proveedores para zonas comunes.',
        startAt: this.shiftIso(-1),
        endAt: this.shiftIso(0),
        status: 'en-curso',
        topics: this.createTopics('current'),
      },
      {
        id: 'asm-003',
        title: 'Asamblea Ordinaria 2025',
        description: 'Cierre del año, aprobación de actas y plan de inversiones 2026.',
        startAt: this.shiftIso(-90),
        endAt: this.shiftIso(-89),
        status: 'finalizada',
        topics: this.createTopics('past'),
      },
    ];

    return new Map(detail.map((item) => [item.id, item] satisfies [string, ResidentAssemblyDetail]));
  }

  private createTopics(mode: 'upcoming' | 'current' | 'past'): ResidentTopic[] {
    const baseTopics: ResidentTopic[] = [
      {
        id: `top-${mode}-001`,
        title: 'Presentación general',
        description: 'Bienvenida, verificación de quorum y orden del día.',
        questions: [
          {
            id: `q-${mode}-001`,
            text: 'Aprobación del orden del día',
            description: 'Confirma el orden propuesto por la administración.',
          },
        ],
      },
      {
        id: `top-${mode}-002`,
        title: 'Revisión de informes',
        description: 'Informe financiero, gestión y proyectos en curso.',
        questions: [
          {
            id: `q-${mode}-002`,
            text: 'Aprobación del informe financiero',
          },
          {
            id: `q-${mode}-003`,
            text: 'Aprobación del informe de gestión',
          },
        ],
      },
    ];

    if (mode === 'past') {
      baseTopics.push({
        id: 'top-past-003',
        title: 'Plan de inversiones 2026',
        description: 'Definición de prioridades y presupuesto estimado.',
        questions: [
          {
            id: 'q-past-004',
            text: 'Aprobación del plan de inversiones propuesto',
          },
        ],
      });
    }

    return baseTopics;
  }

  private normalizeSession(record: LiveQuestionRecord): LiveQuestionRecord {
    if (record.closesAt && new Date(record.closesAt).getTime() <= Date.now()) {
      record.status = 'cerrada';
      record.allowVoting = false;
    }

    return record;
  }

  private toResidentLiveQuestion(record: LiveQuestionRecord, residentId: string): ResidentLiveQuestion {
    const userVote = record.userVotes.get(residentId);
    const now = Date.now();
    const isClosedByTime = record.closesAt ? new Date(record.closesAt).getTime() <= now : false;
    const status = isClosedByTime ? 'cerrada' : record.status;
    const canVote = status === 'activa' && record.allowVoting && !userVote && !isClosedByTime;

    let blockedReason: string | undefined;
    if (userVote) {
      blockedReason = 'Ya registraste tu voto en esta pregunta.';
    } else if (status === 'programada') {
      blockedReason = 'La pregunta aún no está activa.';
    } else if (status === 'cerrada' || isClosedByTime) {
      blockedReason = 'La pregunta ya fue cerrada.';
    } else if (!record.allowVoting) {
      blockedReason = 'No tienes permisos para votar en esta pregunta.';
    }

    return {
      assemblyId: record.assemblyId,
      topicId: record.topicId,
      topicTitle: record.topicTitle,
      questionId: record.questionId,
      questionText: record.questionText,
      questionDescription: record.questionDescription,
      status,
      closesAt: record.closesAt,
      canVote,
      userVote,
      blockedReason,
      totalYes: record.results.yes,
      totalNo: record.results.no,
      totalAbstain: record.results.abstain,
    } satisfies ResidentLiveQuestion;
  }

  private shiftIso(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  }
}
