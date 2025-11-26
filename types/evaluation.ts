// types/evaluation.ts
// Types for storing and tracking candidate performance

export interface SubCriteriaScores {
  clarity?: number;
  conciseness?: number;
  useOfExamples?: number;
  framing?: number;
  hypothesisDriven?: number;
  logicalDecomposition?: number;
  quantitativeReasoning?: number;
  useOfFrameworks?: number;
  tradeoffsAndAssumptions?: number;
  actionability?: number;
  prioritization?: number;
  impactAwareness?: number;
}

export interface CategoryScore {
  score: number; // 1-5
  weight: number; // percentage
  subcriteria?: SubCriteriaScores;
  rationale: string;
}

export interface EvaluationScores {
  communication: CategoryScore;
  problemStructuring: CategoryScore;
  analyticalDepth: CategoryScore;
  businessJudgment: CategoryScore;
  cultureFit: CategoryScore;
  overallScore: number; // Weighted average (0-5)
  finalScore?: number; // Optional: normalized to 0-100
}

export interface CandidateResponse {
  timestamp: string;
  message: string;
  messageIndex: number;
  phase: 'greeting' | 'background' | 'case_selection' | 'clarifying' | 'analysis' | 'synthesis' | 'recommendation' | 'completed';
}

export interface InterviewSession {
  sessionId: string;
  candidateName?: string;
  candidateBackground?: string;
  caseType?: string;
  startTime: string;
  endTime?: string;
  responses: CandidateResponse[];
  evaluation?: EvaluationScores;
  strengths?: string[];
  improvements?: string[];
  coachingActions?: string[];
  status: 'active' | 'completed' | 'abandoned';
}

export interface StoredInterviewData {
  sessions: InterviewSession[];
  currentSessionId?: string;
}
