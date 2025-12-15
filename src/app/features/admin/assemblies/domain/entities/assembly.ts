export type AssemblyStatus = 'DRFT' | 'INPR' | 'FNLC';

export type QuestionStatus = 'PLND' | 'INPR' | 'CLSD';
export type AssemblyAuditAction =
  | 'assembly-created'
  | 'assembly-updated'
  | 'participant-added'
  | 'participant-removed'
  | 'participant-updated'
  | 'question-opened'
  | 'question-closed'
  | 'tie-breaker'
  | 'file-downloaded'
  | 'file-uploaded';

export type AssemblyFileType = 'acta' | 'anexo' | 'presentacion' | 'otro';

export interface AssemblyResidentCandidate {
  id: string;
  name: string;
  unit: string;
}

export interface TopicQuestionVote {
  participantId: string;
  participantName: string;
  participantUnit?: string;
  choice: 'si' | 'no' | 'abstencion';
  emittedAt: string;
}

export interface TopicQuestionResult {
  topicId: string;
  questionId: string;
  questionText: string;
  yes: number;
  no: number;
  abstain: number;
  votes: TopicQuestionVote[];
}

export interface AssemblyHistoryEvent {
  timestamp: string;
  actor: string;
  description: string;
}

export interface AssemblyHistory {
  events: AssemblyHistoryEvent[];
  questionResults: TopicQuestionResult[];
}

export interface AssemblyAuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: AssemblyAuditAction;
  entityType: 'assembly' | 'participant' | 'topic' | 'question' | 'file';
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AssemblyFile {
  id: string;
  name: string;
  type: AssemblyFileType;
  sizeKb: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export type ParticipantMembershipStatus = 'INVITED' | 'CONFIRMED' | 'BLOCKED';

export interface AssemblyParticipant {
  id: string;
  name: string;
  unit: string;
  canVoteStart: boolean;
  canVoteQuestions: boolean;
  membershipStatus: ParticipantMembershipStatus;
  joinedAt?: string;
  confirmationMethodId?: string;
  confirmedByUserId?: string;
  confirmedAt?: string;
}

export interface AssemblyLiveQuestionState {
  questionId: string;
  status: QuestionStatus;
  votingWindowStart?: string;
  votingWindowEnd?: string;
  yes: number;
  no: number;
  abstain: number;
  allowsTieBreaker: boolean;
  tieBreakerUsed: boolean;
}

export interface AssemblyLiveState {
  isLive: boolean;
  canStart: boolean;
  canClose: boolean;
  currentTopicId?: string;
  currentQuestionId?: string;
  startedAt?: string;
  closedAt?: string;
  questionStates: AssemblyLiveQuestionState[];
}

export interface TopicQuestion {
  id: string;
  text: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  allowsTieBreaker: boolean;
  status?: QuestionStatus;
}

export interface AgendaTopic {
  id: string;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  questions: TopicQuestion[];
  attachments?: string[];
}

export interface AssemblySummary {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  status: AssemblyStatus;
  topics: number;
  createdBy: string;
  canEdit: boolean;
}

export interface AssemblyDetail {
  id: string;
  title: string;
  description: string;
  rules: string;
  startAt: string;
  endAt: string;
  status: AssemblyStatus;
  agenda: AgendaTopic[];
  canManageInitiators: boolean;
  initiatorIds: string[];
  participants: AssemblyParticipant[];
  availableParticipants: AssemblyResidentCandidate[];
  liveState?: AssemblyLiveState;
  history?: AssemblyHistory;
  auditLog: AssemblyAuditEvent[];
  files: AssemblyFile[];
  createdBy: string;
  updatedAt: string;
}

export interface AssemblyFilters {
  search: string;
  status: AssemblyStatus | 'ALL';
  range?: {
    start?: string;
    end?: string;
  };
}
