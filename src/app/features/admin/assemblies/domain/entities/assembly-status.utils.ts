import { AssemblyStatus, ParticipantMembershipStatus, QuestionStatus } from './assembly';

const ASSEMBLY_STATUS_LABELS: Record<AssemblyStatus, string> = {
  DRFT: 'Borrador',
  INPR: 'En progreso',
  FNLC: 'Finalizada',
};

const ASSEMBLY_STATUS_BADGES: Record<AssemblyStatus, string> = {
  DRFT: 'badge--draft',
  INPR: 'badge--running',
  FNLC: 'badge--finished',
};

const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  PLND: 'Planificada',
  INPR: 'En progreso',
  CLSD: 'Cerrada',
};

const PARTICIPANT_STATUS_LABELS: Record<ParticipantMembershipStatus, string> = {
  INVITED: 'Invitado',
  CONFIRMED: 'Confirmado',
  BLOCKED: 'Bloqueado',
};

const PARTICIPANT_STATUS_BADGES: Record<ParticipantMembershipStatus, string> = {
  INVITED: 'badge--ghost',
  CONFIRMED: 'badge--success',
  BLOCKED: 'badge--warning',
};

export function assemblyStatusLabel(status: AssemblyStatus): string {
  return ASSEMBLY_STATUS_LABELS[status] ?? status;
}

export function assemblyStatusBadge(status: AssemblyStatus): string {
  return ASSEMBLY_STATUS_BADGES[status] ?? 'badge--draft';
}

export function questionStatusLabel(status: QuestionStatus): string {
  return QUESTION_STATUS_LABELS[status] ?? status;
}

export function participantStatusLabel(status: ParticipantMembershipStatus): string {
  return PARTICIPANT_STATUS_LABELS[status] ?? status;
}

export function participantStatusBadge(status: ParticipantMembershipStatus): string {
  return PARTICIPANT_STATUS_BADGES[status] ?? 'badge--ghost';
}
