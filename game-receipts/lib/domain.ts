import type { Forecast, Outcome, QuestionShape, ScoreBreakdown } from "./scoring";
import type { League } from "./catalog/teams";

export type Category = "award" | "trade" | "breakout" | "team" | "comparison";
export const CATEGORY_LABEL: Record<Category | "debate", string> = {
  award: "Award", trade: "Trade", breakout: "Breakout", team: "Team", comparison: "Head-to-head", debate: "Hot take",
};

export interface Subject { type: "player" | "team"; id: string }

export interface QuestionOption { id: string; label: string; baseline: number }

export interface Evidence { source: string; url: string; note: string }

export interface ReceiptAwards {
  earliestCorrect?: string;   // prediction id
  mostImpressive?: string;
  bestCalibrated?: string;
}

export interface Development { at: string; text: string }

export interface Question {
  id: string;
  league: League;
  category: Category;
  kind: "binary" | "categorical";
  /** Short title, e.g. "2026-27 NBA MVP" or the binary claim itself. */
  title: string;
  /** Exact official resolution criteria shown before locking. */
  criteria: string;
  /** Where the outcome will be verified. */
  resolutionSource: string;
  options?: QuestionOption[];
  baselineYes?: number;
  baselineSource: "mock-consensus" | "none";
  specificity: number;
  resolvesBy: string;
  status: "open" | "resolved" | "void";
  outcome?: Outcome;
  resolvedAt?: string;
  resolvedBy?: string;
  evidence?: Evidence[];
  awards?: ReceiptAwards;
  developments?: Development[];
  createdBy: string; // "system" or user id
  /** User-drafted questions count toward reputation only once an admin approves them. */
  reviewStatus: "approved" | "pending" | "rejected";
  createdAt: string;
  seed?: boolean;
}

export type PredictionKind = "graded" | "debate";

export interface Prediction {
  id: string;
  userId: string;
  kind: PredictionKind;
  questionId: string | null;
  league: League | null;
  /** The player or team this take is about — rendered as its avatar. */
  subject?: Subject | null;
  category: Category | "debate";
  originalText: string;
  structuredText: string;
  criteria: string;
  resolvesBy: string | null;
  forecast: Forecast | null;
  /** Consensus snapshot taken at lock — grading uses this, never later odds. */
  baselineSnapshot: QuestionShape | null;
  gradingVersion: string;
  lockedAt: string;
  chainId: string;
  revisionOf: string | null;
  revisionNumber: number;
  prevHash: string;
  hash: string;
  // ---- mutable lifecycle fields (not covered by the hash) ----
  status: "pending" | "resolved" | "void";
  supersededAt: string | null;
  withdrawnAt: string | null;
  withdrawnInGrace: boolean;
  score: ScoreBreakdown | null;
  resolvedAt: string | null;
  hidden: boolean;
  seed?: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  bio: string;
  avatarColor: string;
  favoriteLeagues: League[];
  favoriteTeams: string[];
  role: "user" | "admin";
  plan: "free" | "pro" | "creator";
  onboarded: boolean;
  isCreator: boolean;
  createdAt: string;
  private: boolean;
  seed?: boolean;
  /** Served by /api/avatar/<file>; absent means the colour monogram. */
  avatarUrl?: string;
  location?: string;
  /** One http(s) link, rendered nofollow. */
  website?: string;
  usernameChangedAt?: string;
  /** Retired handles; /u/<old> redirects to the current one. */
  previousUsernames?: string[];
  /** Set when the account was deleted and anonymized (predictions remain as public records). */
  deletedAt?: string;
}

export interface Follow { followerId: string; followeeId: string; createdAt: string }
export interface Block { blockerId: string; blockedId: string; createdAt: string }
export interface Like { userId: string; predictionId: string; createdAt: string }
export interface Comment { id: string; userId: string; predictionId: string; body: string; createdAt: string; hidden: boolean }
export interface DebateVote { userId: string; predictionId: string; agree: boolean; createdAt: string }

export interface Battle {
  id: string;
  questionId: string;
  challengerId: string;
  opponentId: string;
  challengerPredictionId: string;
  opponentPredictionId: string | null;
  message: string;
  status: "open" | "accepted" | "declined" | "resolved";
  winnerId: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  inviteCode: string;
  visibility: "public" | "private";
  isCreatorLeague: boolean;
  questionIds: string[];
  createdAt: string;
}
export interface GroupMember { groupId: string; userId: string; role: "owner" | "member"; joinedAt: string }

export type NotificationKind = "follow" | "like" | "comment" | "battle" | "resolved" | "receipt" | "appeal" | "development";
export interface Notification {
  id: string; userId: string; kind: NotificationKind; text: string; href: string; createdAt: string; read: boolean; actorId?: string;
}

export interface Report {
  id: string; reporterId: string; targetType: "prediction" | "comment" | "user"; targetId: string; reason: string;
  status: "open" | "actioned" | "dismissed"; createdAt: string; resolvedBy?: string;
}

export interface Appeal {
  id: string; predictionId: string; userId: string; reason: string;
  status: "open" | "upheld" | "overturned"; response?: string; createdAt: string; resolvedAt?: string; resolvedBy?: string;
}

export interface AuditEntry { id: string; at: string; actorId: string; action: string; entity: string; entityId: string; data?: unknown }

export interface DB {
  version: 1;
  users: User[];
  questions: Question[];
  predictions: Prediction[];
  follows: Follow[];
  blocks: Block[];
  likes: Like[];
  comments: Comment[];
  votes: DebateVote[];
  battles: Battle[];
  groups: Group[];
  groupMembers: GroupMember[];
  notifications: Notification[];
  reports: Report[];
  appeals: Appeal[];
  audit: AuditEntry[];
  waitlist: { userId: string; plan: string; createdAt: string }[];
}
