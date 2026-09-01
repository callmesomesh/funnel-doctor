# Funnel Doctor

**Live demo: https://funnel-doctor-demo-someshs-projects-04586766.vercel.app** *(interactive, synthetic data, no signup)*

A product-analytics diagnosis engine: a month of events that looks like a busy product with an
export problem — until the diagnosis separates real users from internal pollution, and a real
funnel problem from a dead tracking event.

## What business problem this solves

Teams make roadmap and budget decisions on analytics that quietly include their own dev traffic
and silently broken instrumentation. The two most expensive lies a dashboard tells: "engagement
is up" (it's your own team clicking) and "conversion collapsed" (the event died, not the users).

## Original experience vs. this reconstruction

I (Somesh Samanta) performed the original work as a real analytics audit on a production Mixpanel
implementation: a full tracking inventory, internal-vs-real traffic segmentation (internal traffic
was polluting up to half of tracked volume and fabricating a growth story), real-user journey
reconstruction, and dating of instrumentation breaks — delivered as dated reports with the rule
that an untrustworthy metric is flagged unmeasured, never quoted.

**This repo is a clean-room, generalized reconstruction.** The dataset is entirely synthetic —
seeded and deterministic, so every visitor sees identical numbers — the product is invented, and
no employer data or identifiers appear.

## How the diagnosis works

1. **Internal pollution (labeled):** users carrying `env=development/staging` events.
2. **Internal pollution (unlabeled):** accounts firing ≥8× the median user's volume — test
   accounts rarely label themselves.
3. **Tracking breaks:** a step's event going permanently silent while its precursor keeps
   flowing. Users don't all stop exporting on the same day; broken code does.

Every finding carries the numbers that triggered it. Small denominators are never flagged —
noise flags teach people to ignore real ones.

## Run it

```bash
npm install
npm test        # 13 engine tests: funnel ordering, detection precision, break dating, determinism
npm run dev
```

No credentials, no network calls. Engine runs in your browser.

## Limitations (honest ones)

- Detection is heuristic; production should fingerprint office IPs / CI user agents at ingestion.
- Instrumentation death should alert within hours, not be found in a monthly audit.
- One funnel definition is hardcoded here; the original audited a full event taxonomy.

## For a real implementation

A funnel-measurement audit of your analytics stack: tracking inventory, pollution segmentation,
break dating, and a cleaned baseline your team can actually plan against. I've done this on a
production Mixpanel deployment where raw numbers were fabricating a 5x growth story. If your
dashboard feels too good (or too bad) to be true, this is what I do.

— Somesh Samanta · someshsamanta6@gmail.com
