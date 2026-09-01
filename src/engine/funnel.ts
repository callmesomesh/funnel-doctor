import type { AnalyticsEvent, EventName, FunnelResult } from './types';
import { FUNNEL_STEPS } from './types';

/**
 * Ordered-unique-user funnel: a user counts at a step only if they completed
 * every earlier step first (by timestamp). This is stricter than "did the
 * event ever fire" — and it's the difference between a funnel and a bar chart
 * of event counts.
 */
export function computeFunnel(events: AnalyticsEvent[], excludeUsers: Set<string> = new Set()): FunnelResult {
  const kept = events.filter((e) => !excludeUsers.has(e.userId));

  // Earliest timestamp per user per event.
  const firstSeen = new Map<string, Map<EventName, string>>();
  for (const e of kept) {
    let m = firstSeen.get(e.userId);
    if (!m) {
      m = new Map();
      firstSeen.set(e.userId, m);
    }
    const prev = m.get(e.event);
    if (!prev || e.at < prev) m.set(e.event, e.at);
  }

  const stepUsers: number[] = FUNNEL_STEPS.map(() => 0);
  for (const [, m] of firstSeen) {
    let prevAt: string | null = null;
    for (let i = 0; i < FUNNEL_STEPS.length; i++) {
      const at = m.get(FUNNEL_STEPS[i]);
      if (!at) break;
      if (prevAt !== null && at < prevAt) break; // out of order — funnel stops here
      stepUsers[i]++;
      prevAt = at;
    }
  }

  return {
    steps: FUNNEL_STEPS.map((step, i) => ({
      step,
      users: stepUsers[i],
      conversionFromPrev: i === 0 ? null : stepUsers[i - 1] > 0 ? stepUsers[i] / stepUsers[i - 1] : 0,
    })),
    totalUsers: firstSeen.size,
    totalEvents: kept.length,
  };
}
