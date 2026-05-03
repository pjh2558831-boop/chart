export type UserPlan = "free" | "basic" | "pro" | "premium";

export interface UsageStatus {
  userId: string;
  plan: UserPlan;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  enabledFeatures: string[];
}

export interface AnalysisLogRecord {
  id: number;
  userId: string;
  analysisType: string;
  inputImageHash?: string | null;
  result: unknown;
  modelName?: string | null;
  createdAt: string;
}

export interface FeedbackRecord {
  id: number;
  userId: string;
  analysisId: number;
  rating?: number | null;
  correctSignal?: string | null;
  correctPattern?: string | null;
  comment?: string | null;
  createdAt: string;
}
