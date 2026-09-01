import type { AnalyticsEvent } from './types';

/**
 * Deterministic synthetic dataset — same seed, same events, every run.
 * The story planted in the data (all invented, engineered to be findable):
 *
 *  - ~300 real users with realistic drop-off through the funnel
 *  - 9 internal accounts (3 labeled env=development, 6 unlabeled team/test
 *    accounts) generating roughly half of all event volume
 *  - export_completed instrumentation dies on 2026-08-18 while
 *    export_page_viewed keeps flowing — the "0% conversion" that isn't
 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260901);

const DAY_MS = 86_400_000;
const START = Date.UTC(2026, 7, 1); // 2026-08-01
const DAYS = 31;
const BREAK_DAY = 17; // export_completed dies after 2026-08-18

function iso(dayIndex: number, r: () => number): string {
  const t = START + dayIndex * DAY_MS + Math.floor(r() * DAY_MS);
  return new Date(t).toISOString();
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function buildDataset(): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  const sources: AnalyticsEvent['source'][] = ['organic', 'paid', 'direct', 'referral'];

  // --- real users -------------------------------------------------------
  for (let i = 0; i < 300; i++) {
    const uid = `u_${1000 + i}`;
    const device = rand() < 0.55 ? 'desktop' : 'mobile';
    const source = pick(rand, sources);
    const signupDay = Math.floor(rand() * DAYS);
    let at = iso(signupDay, rand);
    events.push({ userId: uid, event: 'signup', at, env: 'production', device, source });

    if (rand() < 0.62) {
      const d2 = Math.min(DAYS - 1, signupDay + Math.floor(rand() * 3));
      at = later(at, iso(d2, rand));
      events.push({ userId: uid, event: 'project_created', at, env: 'production', device, source });

      if (rand() < 0.58) {
        const d3 = Math.min(DAYS - 1, d2 + Math.floor(rand() * 2));
        at = later(at, iso(d3, rand));
        events.push({ userId: uid, event: 'render_completed', at, env: 'production', device, source });

        if (rand() < 0.65) {
          const d4 = Math.min(DAYS - 1, d3 + Math.floor(rand() * 2));
          const viewAt = later(at, iso(d4, rand));
          events.push({ userId: uid, event: 'export_page_viewed', at: viewAt, env: 'production', device, source });
          // The instrumentation break: completions only recorded before day 17.
          if (rand() < 0.7 && d4 <= BREAK_DAY) {
            events.push({ userId: uid, event: 'export_completed', at: plusMinutes(viewAt, 3), env: 'production', device, source });
          }
        }
      }
    }
  }

  // --- labeled internal users (env=development leaks into prod project) ---
  for (let i = 0; i < 3; i++) {
    const uid = `u_dev_${i}`;
    for (let d = 0; d < DAYS; d++) {
      const perDay = 2 + Math.floor(rand() * 3);
      for (let k = 0; k < perDay; k++) {
        events.push({
          userId: uid,
          event: pick(rand, ['signup', 'project_created', 'render_completed', 'export_page_viewed'] as const),
          at: iso(d, rand),
          env: rand() < 0.7 ? 'development' : 'production',
          device: 'desktop',
          source: 'direct',
        });
      }
    }
  }

  // --- unlabeled team/test accounts (the sneaky half) ---------------------
  for (let i = 0; i < 6; i++) {
    const uid = `u_${9900 + i}`; // looks like any other user id
    for (let d = 0; d < DAYS; d++) {
      const perDay = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < perDay; k++) {
        events.push({
          userId: uid,
          event: pick(rand, ['project_created', 'render_completed', 'export_page_viewed'] as const),
          at: iso(d, rand),
          env: 'production',
          device: 'desktop',
          source: 'direct',
        });
      }
    }
    // They "signed up" once, long ago on day 0.
    events.push({ userId: uid, event: 'signup', at: iso(0, rand), env: 'production', device: 'desktop', source: 'direct' });
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}

function later(a: string, b: string): string {
  return b > a ? b : plusMinutes(a, 30);
}

function plusMinutes(isoStr: string, min: number): string {
  return new Date(new Date(isoStr).getTime() + min * 60_000).toISOString();
}

export const DATASET: AnalyticsEvent[] = buildDataset();
