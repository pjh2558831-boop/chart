export type AnalysisModeName = "fast" | "standard" | "precision";
export type UserPlan = "guest" | "free" | "plus" | "pro";
export type IdentityType = "guest" | "user";

export interface UsageStatus {
  identityType: IdentityType;
  id: string;
  userId?: string | null;
  guestId?: string | null;
  plan: UserPlan;
  planLabel?: string;
  price: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  analysisMode: AnalysisModeName;
  enabledFeatures: string[];
  isLoggedIn?: boolean;
  isPaidPlan?: boolean;
}

export interface AnalysisLogRecord {
  id: number;
  userId?: string | null;
  guestId?: string | null;
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
