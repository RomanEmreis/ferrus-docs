import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import FerrusLogo from '@site/src/components/FerrusLogo';
import IsoGrid from '@site/src/components/IsoGrid';

import styles from './index.module.css';

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx(styles.hero)}>
      <IsoGrid />
      <div className={styles.heroInner}>
        <div className={styles.logoHolder}>
          <FerrusLogo />
        </div>
        <p className={styles.tagline}>{siteConfig.tagline}</p>
        <p className={styles.subTagline}>
          <span className={styles.dim}>// </span>
          A Supervisor → Executor → Reviewer state machine for coding agents.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/quickstart">
            Get started
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/RomanEmreis/ferrus">
            GitHub →
          </Link>
        </div>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>alpha · v0.2.5</span>
          <span className={styles.badge}>Apache-2.0</span>
          <span className={styles.badge}>Rust 1.93+</span>
        </div>
      </div>
    </header>
  );
}

function Install() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          <span className={styles.prompt}>$</span> Install
        </Heading>
        <p className={styles.sectionLead}>
          ferrus ships as a single Rust crate. Install it from crates.io or
          build from source.
        </p>
        <div className={styles.twoCol}>
          <div>
            <h3 className={styles.colTitle}>From crates.io</h3>
            <CodeBlock language="bash">{`# stable — published on crates.io
cargo install ferrus
# or pin an exact version:
cargo install --locked ferrus@0.2.5-alpha.2`}</CodeBlock>
          </div>
          <div>
            <h3 className={styles.colTitle}>From source</h3>
            <CodeBlock language="bash">{`# latest main — tracks the repo
git clone https://github.com/RomanEmreis/ferrus
cd ferrus
cargo install --path .`}</CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          <span className={styles.prompt}>$</span> Quick start
        </Heading>
        <p className={styles.sectionLead}>
          From any project directory, scaffold ferrus, register your agents,
          and drop into HQ.
        </p>
        <CodeBlock language="bash">{`ferrus init                                                  # scaffold ferrus.toml + .ferrus/
ferrus register --supervisor claude-code --executor codex    # write agent configs
ferrus                                                       # enter HQ`}</CodeBlock>
        <p className={styles.sectionLead}>
          Inside HQ, type <code>/task</code>. A supervisor spawns, you describe
          what you want, and the Executor → Reviewer loop runs automatically
          until the task is <strong style={{color: 'var(--ferrus-green)'}}>Complete</strong>.
        </p>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: 'Deterministic',
      body: 'Not a chat. A real state machine with explicit transitions, retries, and review cycles.',
    },
    {
      title: 'Agent-agnostic',
      body: 'Claude Code, Codex, and experimental Qwen Code are interchangeable workers.',
    },
    {
      title: 'Crash-safe',
      body: 'State lives on disk in .ferrus/. Agents are stateless between runs — restarts resume exactly where you left off.',
    },
    {
      title: 'No hidden context',
      body: 'Everything the agents see lives in plain files you can read: TASK.md, REVIEW.md, SUBMISSION.md.',
    },
  ];
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          <span className={styles.prompt}>$</span> Why ferrus
        </Heading>
        <div className={styles.featureGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureTitle}>&gt; {f.title}</div>
              <div className={styles.featureBody}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="ferrus — deterministic orchestration of AI coding agents. A Supervisor → Executor → Reviewer state machine that turns coding agents into repeatable workers.">
      <Hero />
      <main>
        <Install />
        <QuickStart />
        <Features />
      </main>
    </Layout>
  );
}
