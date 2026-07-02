import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

export default function About(): ReactNode {
  return (
    <Layout
      title="About"
      description="What ferrus is, its philosophy, and why deterministic orchestration matters.">
      <main>
        <section className={styles.section}>
          <div className="container">
            <Heading as="h1" className={styles.sectionTitle}>
              <span className={styles.prompt}>$</span> About
            </Heading>

            <h2 className={styles.colTitle}>What is Ferrus</h2>
            <p className={styles.sectionLead}>
              Ferrus is a deterministic orchestrator for AI coding agents. It
              drives a <strong>Supervisor → Executor → Reviewer</strong> state
              machine so agents like Claude Code, Codex, Qwen Code, goose, and
              opencode can carry out real software tasks through explicit,
              inspectable transitions instead of an open-ended chat.
            </p>

            <h2 className={styles.colTitle}>Philosophy</h2>
            <p className={styles.sectionLead}>
              <strong>Agents should be workers, not oracles.</strong>
            </p>
            <p className={styles.sectionLead}>
              Ferrus keeps runtime state in SQLite and task context in plain
              scoped Markdown files under <code>.ferrus/tasks/</code> and{' '}
              <code>.ferrus/runs/</code>, so humans and agents operate on the
              same source of truth. No hidden context, no implicit memory, no
              magic.
            </p>

            <h2 className={styles.colTitle}>Why deterministic</h2>
            <p className={styles.sectionLead}>
              <strong>Real software work needs repeatability.</strong>
            </p>
            <p className={styles.sectionLead}>
              Explicit state transitions, retries, and review cycles make
              execution auditable, resumable, and crash-safe. If a run is
              interrupted, the next invocation resumes exactly where the
              previous one stopped — because the state lives in{' '}
              <code>ferrus.db</code>, not in an agent's head.
            </p>

            <h2 className={styles.colTitle}>Open source</h2>
            <ul className={styles.sectionLead}>
              <li>
                Source:{' '}
                <Link href="https://github.com/RomanEmreis/ferrus">
                  GitHub
                </Link>
              </li>
              <li>
                Mirror:{' '}
                <Link href="https://codeberg.org/RomanEmreis/ferrus">
                  Codeberg
                </Link>
              </li>
              <li>
                Package:{' '}
                <Link href="https://crates.io/crates/ferrus">crates.io</Link>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </Layout>
  );
}
