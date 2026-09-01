import DoctorDemo from '@/components/DoctorDemo';

export default function Page() {
  return (
    <div className="shell">
      <header className="masthead">
        <p className="wordmark">
          funnel<span>doctor</span>
        </p>
        <span className="masthead-what">raw events → diagnosis → numbers you can trust</span>
        <span className="provenance">interactive demo · synthetic data</span>
      </header>

      <section className="intro">
        <h1>
          Before you believe your growth chart, find out how much of it is your own team clicking
          around.
        </h1>
        <p>
          Below is a month of synthetic product analytics for an invented product. The dashboard
          view looks like a busy product with an export problem. Run the diagnosis and watch the
          engine separate real users from internal pollution — and a real funnel problem from a
          dead tracking event.
        </p>
      </section>

      <div style={{ marginTop: 28 }}>
        <DoctorDemo />
      </div>

      <article className="story">
        <p className="kicker">The business story</p>
        <h2>Why this system exists</h2>
        <p>
          At a startup I ran growth analytics for, the funnel numbers told a 5x growth story —
          until segmentation showed that roughly half of all tracked events were the engineering
          team&apos;s own localhost and dev-environment traffic. Quoting the raw numbers to
          anyone — investors, the founder, the team — would have been reporting fiction. The same
          audit found a revenue-related event that had silently stopped firing: what looked like a
          conversion collapse was a dead instrument.
        </p>

        <h3>What I actually did (the original work)</h3>
        <p>
          A full tracking-inventory and data-quality audit of the product&apos;s analytics:
          enumerating every event, segmenting internal versus real traffic, reconstructing real
          user journeys, dating the instrumentation breaks, and publishing dated reports the team
          could act on — with the rule that a metric which can&apos;t be trusted gets flagged as
          unmeasured, never quoted as zero or passed along inflated.
        </p>

        <h3>The judgment calls</h3>
        <ul>
          <li>
            <strong>Segment before quoting — always.</strong> No number leaves the report without
            the internal-traffic filter applied and stated.
          </li>
          <li>
            <strong>&quot;Zero&quot; and &quot;unmeasured&quot; are different facts.</strong> A
            step whose event died mid-month has an unknown rate, not a 0% rate. Confusing the two
            sends teams off to fix products that aren&apos;t broken.
          </li>
          <li>
            <strong>Findings carry evidence, not just verdicts.</strong> Every flag above shows
            the numbers that triggered it, so a skeptic can check the diagnosis instead of
            trusting it.
          </li>
          <li>
            <strong>Small anomalies are left alone.</strong> The detector requires volume far
            outside the population median before calling an account internal — flagging noise
            teaches people to ignore flags.
          </li>
        </ul>

        <h3>What went wrong along the way</h3>
        <p>
          The first pass at the original audit trusted the platform&apos;s own &quot;active
          users&quot; number and nearly shipped a growth summary built on it. The habit this demo
          encodes — diagnose the data before reading the data — exists because of that near-miss,
          and it later caught a second, unrelated tracking regression within days of it appearing.
        </p>

        <h3>What I&apos;d change today</h3>
        <p>
          Detection here is heuristic (env labels, volume outliers, precursor-vs-target survival).
          The production version should also fingerprint office IP ranges and CI user agents at
          ingestion, and alert on instrumentation death within hours — a dead event found in a
          monthly audit already cost a month of unmeasured data.
        </p>
      </article>

      <aside className="disclosure">
        <strong>Original vs. reconstruction</strong>
        <p>
          The original work was a real analytics audit I (Somesh Samanta) performed on a
          production Mixpanel implementation — internal-pollution segmentation, journey
          reconstruction, and tracking-break dating, delivered as dated reports. This demo is a
          clean-room, generalized reconstruction: the dataset is entirely synthetic (seeded and
          deterministic — every visitor sees identical numbers), the product is invented, and no
          employer data or identifiers appear. The engine and its 13 tests are open source below
          and run in your browser.
        </p>
      </aside>

      <footer className="footer">
        <span>Somesh Samanta — GTM &amp; growth systems</span>
        <a href="https://github.com/callmesomesh/funnel-doctor">source + tests on GitHub</a>
        <a href="https://daily-pulse-demo-someshs-projects-04586766.vercel.app">Daily Pulse →</a>
        <a href="https://leadflow-demo-someshs-projects-04586766.vercel.app">LeadFlow →</a>
      </footer>
    </div>
  );
}
