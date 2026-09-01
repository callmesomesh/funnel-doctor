/** One product-analytics event, as an analytics tool would store it. */
export interface AnalyticsEvent {
  userId: string;
  event: EventName;
  at: string; // ISO timestamp
  /** Reported environment property — often missing or wrong, which is the point. */
  env?: 'production' | 'development' | 'staging';
  device: 'desktop' | 'mobile';
  source: 'organic' | 'paid' | 'direct' | 'referral';
}

export type EventName =
  | 'signup'
  | 'project_created'
  | 'render_completed'
  | 'export_page_viewed'
  | 'export_completed';

/** The funnel this product lives or dies by. */
export const FUNNEL_STEPS: EventName[] = [
  'signup',
  'project_created',
  'render_completed',
  'export_completed',
];

export interface FunnelStepResult {
  step: EventName;
  users: number;
  conversionFromPrev: number | null; // null for the first step
}

export interface FunnelResult {
  steps: FunnelStepResult[];
  totalUsers: number;
  totalEvents: number;
}

export type FindingKind = 'internal_pollution' | 'tracking_break' | 'hyperactive_outlier';

export interface Finding {
  kind: FindingKind;
  severity: 'critical' | 'warning';
  title: string;
  evidence: string[];
  affectedUsers: string[];
  affectedEvents: number;
  recommendation: string;
}

export interface Diagnosis {
  findings: Finding[];
  /** User ids the cleaned view excludes. */
  excludedUsers: Set<string>;
  /** Event names whose post-break data cannot be trusted (with break date). */
  brokenTracking: Array<{ event: EventName; brokeAt: string; evidence: string }>;
}
