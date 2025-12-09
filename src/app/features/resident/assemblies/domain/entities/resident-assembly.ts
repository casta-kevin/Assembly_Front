import { AssemblyStatus, QuestionStatus } from '../../../../admin/assemblies/domain/entities/assembly';

export type ResidentVoteChoice = 'si' | 'no' | 'abstencion';

export type ResidentAssemblyFilterStatus = 'todas' | 'proximas' | 'en-curso' | 'finalizadas';

export interface ResidentNotification {
  id: string;
  assemblyId: string;
  title: string;
  summary: string;
  startAt: string;
  status: AssemblyStatus;
  createdAt: string;
  read: boolean;
}

export interface ResidentAssemblyFilters {
  status: ResidentAssemblyFilterStatus;
  search?: string;
}

export interface ResidentAssemblySummary {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  status: AssemblyStatus;
}

export interface ResidentTopicQuestion {
  id: string;
  text: string;
  description?: string;
}

export interface ResidentTopic {
  id: string;
  title: string;
  description?: string;
  questions: ResidentTopicQuestion[];
}

export interface ResidentLiveQuestion {
  assemblyId: string;
  topicId: string;
  topicTitle: string;
  questionId: string;
  questionText: string;
  questionDescription?: string;
  status: QuestionStatus;
  closesAt?: string;
  canVote: boolean;
  userVote?: ResidentVoteChoice;
  blockedReason?: string;
  totalYes: number;
  totalNo: number;
  totalAbstain: number;
}

export interface ResidentAssemblyDetail {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  status: AssemblyStatus;
  topics: ResidentTopic[];
  currentTopicId?: string;
  currentQuestionId?: string;
  currentQuestion?: ResidentLiveQuestion;
}
