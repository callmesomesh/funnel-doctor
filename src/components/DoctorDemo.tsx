'use client';

import { useMemo, useState } from 'react';
import { DATASET } from '@/engine/dataset';
import { diagnose } from '@/engine/diagnose';
import { computeFunnel } from '@/engine/funnel';
import type { FunnelResult } from '@/engine/types';

const STEP_LABEL: Record<string, string> = {
  signup: 'Signed up',
  project_created: 'Created project',
  render_completed: 'Completed render',
  export_completed: 'Exported result',
};

function FunnelBars({ funnel, raw, brokenStep }: { funnel: FunnelResult; raw?: boolean; brokenStep?: string }) {
  const max = Math.max(1, funnel.steps[0].users);
  return (
    <div>
      {funnel.steps.map((s) => (
        <div className="fstep" key={s.step}>
          <span className="fstep-name">{STEP_LABEL[s.step]}</span>
          <span className="fstep-track">
            <span className={`fstep-fill${raw ? ' raw-fill' : ''}`} style={{ width: `${Math.max(4, (s.users / max) * 100)}%` }}>
              <span>{s.users}</span>
            </span>
          </span>
          <span className={`fstep-conv${s.step === brokenStep ? ' broken' : ''}`}>
            {s.conversionFromPrev === null
              ? 'users'
              : s.step === brokenStep
                ? `${(s.conversionFromPrev * 100).toFixed(0)}% ⚠ unmeasured`
                : `${(s.conversionFromPrev * 100).toFixed(0)}% from prev`}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DoctorDemo() {
  const [diagnosed, setDiagnosed] = useState(false);

  const rawFunnel = useMemo(() => computeFunnel(DATASET), []);
  const diagnosis = useMemo(() => diagnose(DATASET), []);
  const cleanFunnel = useMemo(() => computeFunnel(DATASET, diagnosis.excludedUsers), [diagnosis]);

  const excludedEvents = useMemo(
    () => DATASET.filter((e) => diagnosis.excludedUsers.has(e.userId)).length,
    [diagnosis],
  );
  const pollutionPct = ((excludedEvents / DATASET.length) * 100).toFixed(0);
  const brokeAt = diagnosis.brokenTracking[0]?.brokeAt.slice(0, 10);

  return (
    <div className="main-col">
      <section className="panel" aria-label="Raw analytics view">
        <div className="panel-head">
          <h2>{diagnosed ? 'What the dashboard said' : 'The dashboard, as found'}</h2>
          <span className="count">
            {DATASET.length.toLocaleString()} events · Aug 2026 · synthetic dataset
          </span>
        </div>
        <div className="funnel-panel">
          <div className="raw-headline">
            <span>
              <strong>{rawFunnel.totalUsers}</strong> active users
            </span>
            <span>
              <strong>{rawFunnel.totalEvents.toLocaleString()}</strong> events tracked
            </span>
            <span>
              <strong>
                {rawFunnel.steps[3].users}/{rawFunnel.steps[0].users}
              </strong>{' '}
              signups reached export
            </span>
          </div>
          <FunnelBars funnel={rawFunnel} raw />
          {!diagnosed && (
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '14px 0 6px' }}>
              Looks like a busy product with an export problem. Before anyone acts on this —
            </p>
          )}
          {!diagnosed && (
            <button className="btn btn-primary" onClick={() => setDiagnosed(true)} style={{ marginTop: 4 }}>
              run diagnosis →
            </button>
          )}
        </div>
      </section>

      {diagnosed && (
        <>
          <section className="panel" aria-label="Diagnosis findings">
            <div className="panel-head">
              <h2>Diagnosis</h2>
              <span className="count">{diagnosis.findings.length} findings</span>
            </div>
            <div className="funnel-panel">
              {diagnosis.findings.map((f) => (
                <div className={`finding ${f.severity}`} key={f.kind}>
                  <div className="finding-title">
                    <span className={`finding-sev ${f.severity}`}>{f.severity.toUpperCase()}</span>
                    {f.title}
                  </div>
                  <ul className="finding-evidence">
                    {f.evidence.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                  <p className="finding-rec">
                    <strong>Do this:</strong> {f.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" aria-label="Raw versus clean comparison">
            <div className="panel-head">
              <h2>Same data, two stories</h2>
            </div>
            <div className="funnel-panel">
              <div className="compare-grid">
                <div className="compare-col rawside">
                  <h3>Raw — internal traffic included</h3>
                  <p className="raw-headline" style={{ paddingBottom: 8 }}>
                    <span>
                      <strong>{rawFunnel.totalEvents.toLocaleString()}</strong> events ·{' '}
                      {rawFunnel.totalUsers} users
                    </span>
                  </p>
                  <FunnelBars funnel={rawFunnel} raw />
                </div>
                <div className="compare-col cleanside">
                  <h3>Clean — {diagnosis.excludedUsers.size} internal accounts excluded</h3>
                  <p className="raw-headline" style={{ paddingBottom: 8 }}>
                    <span>
                      <strong>{cleanFunnel.totalEvents.toLocaleString()}</strong> events (
                      −{pollutionPct}%) · {cleanFunnel.totalUsers} users
                    </span>
                  </p>
                  <FunnelBars funnel={cleanFunnel} brokenStep="export_completed" />
                  {brokeAt && (
                    <div className="unmeasured-note">
                      export_completed is UNMEASURED after {brokeAt} (tracking break) — the real
                      export rate is unknown, not zero.
                    </div>
                  )}
                </div>
              </div>
              <div className="verdict">
                <strong>The verdict a team can act on</strong>
                Just {diagnosis.excludedUsers.size} internal accounts produced {pollutionPct}% of
                all tracked activity — every &quot;engagement is up&quot; chart built on raw volume
                was reporting the team&apos;s own clicks. The real user base is{' '}
                {cleanFunnel.totalUsers} people behaving normally. And the scary export collapse
                isn&apos;t a product problem: the event stopped being recorded on {brokeAt} while
                users kept reaching the export page. Fix instrumentation first; only then judge
                the funnel.
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
