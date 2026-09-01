import type { AnalyticsEvent, Diagnosis, EventName, Finding } from './types';

/**
 * Diagnosis heuristics, in the order a human analyst would apply them.
 * Each finding carries its evidence — the report's job is to be checkable,
 * not to be believed.
 */
export function diagnose(events: AnalyticsEvent[]): Diagnosis {
  const findings: Finding[] = [];
  const excludedUsers = new Set<string>();

  // ---- 1. Internal/dev traffic ------------------------------------------
  // Signal A: events that self-report a non-production env property.
  // Signal B: users whose event volume is wildly above the population —
  // a team member testing fires 10x the events of a real user, every day.
  const byUser = new Map<string, AnalyticsEvent[]>();
  for (const e of events) {
    const list = byUser.get(e.userId) ?? [];
    list.push(e);
    byUser.set(e.userId, list);
  }

  const devEnvUsers = new Set<string>();
  for (const [uid, evs] of byUser) {
    if (evs.some((e) => e.env === 'development' || e.env === 'staging')) devEnvUsers.add(uid);
  }

  const counts = [...byUser.values()].map((v) => v.length).sort((a, b) => a - b);
  const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
  const hyperThreshold = Math.max(10, median * 8);
  const hyperUsers = new Set<string>();
  for (const [uid, evs] of byUser) {
    if (evs.length >= hyperThreshold && !devEnvUsers.has(uid)) hyperUsers.add(uid);
  }

  if (devEnvUsers.size > 0) {
    const affectedEvents = events.filter((e) => devEnvUsers.has(e.userId)).length;
    for (const u of devEnvUsers) excludedUsers.add(u);
    findings.push({
      kind: 'internal_pollution',
      severity: 'critical',
      title: `${devEnvUsers.size} users carry development/staging environment events`,
      evidence: [
        `${affectedEvents} events (${pct(affectedEvents, events.length)} of all volume) belong to users seen with env=development or env=staging`,
        `median real user fires ${median} events; these accounts fire ${Math.round(affectedEvents / Math.max(1, devEnvUsers.size))} on average`,
      ],
      affectedUsers: [...devEnvUsers],
      affectedEvents,
      recommendation:
        'Filter internal traffic at ingestion (env property + team account list), not in each report. Backfill-exclude these users from every historical metric before quoting growth.',
    });
  }

  if (hyperUsers.size > 0) {
    const affectedEvents = events.filter((e) => hyperUsers.has(e.userId)).length;
    for (const u of hyperUsers) excludedUsers.add(u);
    findings.push({
      kind: 'hyperactive_outlier',
      severity: 'warning',
      title: `${hyperUsers.size} accounts behave like test accounts (volume ≥ 8× median)`,
      evidence: [
        `threshold: ≥${hyperThreshold} events vs median ${median}`,
        `${affectedEvents} events (${pct(affectedEvents, events.length)} of volume) from these accounts, without any env label — unlabeled internal use or automation`,
      ],
      affectedUsers: [...hyperUsers],
      affectedEvents,
      recommendation:
        'Verify each against the team roster / office IPs. If internal, add to the suppression list; if real, they are power users worth interviewing — either way, do not leave them blended into averages.',
    });
  }

  // ---- 2. Tracking breaks ------------------------------------------------
  // A step's volume collapsing to zero while its adjacent precursor keeps
  // flowing is instrumentation death, not user behavior. Users don't all
  // stop exporting on the same day; broken code does.
  const brokenTracking: Diagnosis['brokenTracking'] = [];
  const breakCheck = checkTrackingBreak(events, 'export_completed', 'export_page_viewed');
  if (breakCheck) {
    brokenTracking.push(breakCheck);
    findings.push({
      kind: 'tracking_break',
      severity: 'critical',
      title: `"export_completed" stopped firing on ${breakCheck.brokeAt.slice(0, 10)} — tracking break, not user behavior`,
      evidence: [breakCheck.evidence],
      affectedUsers: [],
      affectedEvents: 0,
      recommendation:
        `Treat every export metric after ${breakCheck.brokeAt.slice(0, 10)} as unmeasured, not zero. Fix the instrumentation, then annotate the gap in every report that spans it — a "0%" here would be a lie.`,
    });
  }

  return { findings, excludedUsers, brokenTracking };
}

function checkTrackingBreak(
  events: AnalyticsEvent[],
  target: EventName,
  precursor: EventName,
): { event: EventName; brokeAt: string; evidence: string } | null {
  const targetEvents = events.filter((e) => e.event === target).sort((a, b) => a.at.localeCompare(b.at));
  const precursorEvents = events.filter((e) => e.event === precursor);
  if (targetEvents.length === 0 || precursorEvents.length === 0) return null;

  const lastTarget = targetEvents[targetEvents.length - 1].at;
  const precursorAfter = precursorEvents.filter((e) => e.at > lastTarget).length;
  const allAfter = events.filter((e) => e.at > lastTarget).length;

  // Enough post-silence activity that "nobody exported again" is implausible.
  if (precursorAfter >= 10) {
    return {
      event: target,
      brokeAt: lastTarget,
      evidence: `last ${target} fired ${lastTarget.slice(0, 10)}; since then ${precursorAfter} ${precursor} events and ${allAfter} total events arrived with zero ${target} — users kept reaching the step, the event stopped being recorded`,
    };
  }
  return null;
}

function pct(n: number, of: number): string {
  return of === 0 ? '0%' : `${((n / of) * 100).toFixed(0)}%`;
}
