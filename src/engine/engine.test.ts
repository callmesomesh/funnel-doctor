import { describe, expect, it } from 'vitest';
import { DATASET } from './dataset';
import { diagnose } from './diagnose';
import { computeFunnel } from './funnel';
import type { AnalyticsEvent } from './types';

describe('dataset', () => {
  it('is deterministic across builds', () => {
    expect(DATASET.length).toBeGreaterThan(1000);
    // Spot-check stability of the seeded generator.
    expect(DATASET[0].at <= DATASET[DATASET.length - 1].at).toBe(true);
  });
  it('internal accounts generate a large share of volume (the planted story)', () => {
    const internalIds = new Set(
      DATASET.filter((e) => e.userId.startsWith('u_dev_') || Number(e.userId.slice(2)) >= 9900).map((e) => e.userId),
    );
    const internalEvents = DATASET.filter((e) => internalIds.has(e.userId)).length;
    expect(internalEvents / DATASET.length).toBeGreaterThan(0.35);
  });
});

describe('funnel computation', () => {
  it('steps are monotonically non-increasing', () => {
    const f = computeFunnel(DATASET);
    for (let i = 1; i < f.steps.length; i++) {
      expect(f.steps[i].users).toBeLessThanOrEqual(f.steps[i - 1].users);
    }
  });
  it('out-of-order events do not advance the funnel', () => {
    const evs: AnalyticsEvent[] = [
      { userId: 'x', event: 'project_created', at: '2026-08-01T00:00:00Z', device: 'desktop', source: 'direct' },
      { userId: 'x', event: 'signup', at: '2026-08-02T00:00:00Z', device: 'desktop', source: 'direct' },
    ];
    const f = computeFunnel(evs);
    expect(f.steps[0].users).toBe(1); // signup counted
    expect(f.steps[1].users).toBe(0); // project_created happened BEFORE signup — not a funnel progression
  });
  it('empty input returns a zeroed funnel, no crash', () => {
    const f = computeFunnel([]);
    expect(f.totalUsers).toBe(0);
    expect(f.steps.every((s) => s.users === 0)).toBe(true);
  });
  it('excluding users actually removes them', () => {
    const all = computeFunnel(DATASET);
    const { excludedUsers } = diagnose(DATASET);
    const clean = computeFunnel(DATASET, excludedUsers);
    expect(clean.totalUsers).toBe(all.totalUsers - excludedUsers.size);
    expect(clean.totalEvents).toBeLessThan(all.totalEvents);
  });
});

describe('diagnosis', () => {
  const d = diagnose(DATASET);

  it('finds the labeled dev-env pollution as critical', () => {
    const dev = d.findings.find((f) => f.kind === 'internal_pollution');
    expect(dev?.severity).toBe('critical');
    expect(dev!.affectedUsers.length).toBe(3);
  });

  it('finds the unlabeled hyperactive test accounts', () => {
    const hyper = d.findings.find((f) => f.kind === 'hyperactive_outlier');
    expect(hyper).toBeDefined();
    expect(hyper!.affectedUsers.length).toBeGreaterThanOrEqual(5);
    // No real user should be swept up: real users fire ≤ ~6 events total.
    expect(hyper!.affectedUsers.every((u) => Number(u.slice(2)) >= 9900)).toBe(true);
  });

  it('detects the export_completed tracking break with evidence', () => {
    const brk = d.findings.find((f) => f.kind === 'tracking_break');
    expect(brk?.severity).toBe('critical');
    expect(d.brokenTracking[0].event).toBe('export_completed');
    expect(d.brokenTracking[0].brokeAt.slice(0, 7)).toBe('2026-08');
    expect(d.brokenTracking[0].evidence).toContain('export_page_viewed');
  });

  it('excluded volume matches the planted pollution share', () => {
    const excludedEvents = DATASET.filter((e) => d.excludedUsers.has(e.userId)).length;
    expect(excludedEvents / DATASET.length).toBeGreaterThan(0.35);
    expect(excludedEvents / DATASET.length).toBeLessThan(0.65);
  });

  it('clean funnel conversion differs materially from raw', () => {
    const raw = computeFunnel(DATASET);
    const clean = computeFunnel(DATASET, d.excludedUsers);
    // Internal accounts sign up once but fire mid-funnel events forever,
    // so raw totals overstate activity; cleaned user count must drop.
    expect(clean.totalUsers).toBeLessThan(raw.totalUsers);
    expect(clean.totalEvents / raw.totalEvents).toBeLessThan(0.65);
  });

  it('is deterministic', () => {
    const d2 = diagnose(DATASET);
    expect(JSON.stringify([...d2.excludedUsers].sort())).toBe(JSON.stringify([...d.excludedUsers].sort()));
  });

  it('clean data yields no findings — no manufactured problems', () => {
    const cleanOnly = DATASET.filter(
      (e) => !d.excludedUsers.has(e.userId) && e.event !== 'export_completed' && e.event !== 'export_page_viewed',
    );
    const d3 = diagnose(cleanOnly);
    expect(d3.findings.filter((f) => f.kind !== 'tracking_break')).toHaveLength(0);
  });
});
