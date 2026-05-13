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

            <h2 className={styles.colTitle}>What is ferrus</h2>
            <p className={styles.sectionLead}>
              ferrus is a deterministic orchestrator for AI coding agents. It
              drives a <strong>Supervisor → Executor → Reviewer</strong> state
              machine so that agents like Claude Code, Codex, and Qwen Code
              can carry out real software tasks with explicit, inspectable
              transitions instead of an open-ended chat.
            </p>

            <h2 className={styles.colTitle}>Philosophy</h2>
            <p className={styles.sectionLead}>
              Agents should be workers, not oracles. ferrus keeps every piece
              of state on disk in plain files — <code>TASK.md</code>,{' '}
              <code>REVIEW.md</code>, <code>SUBMISSION.md</code> — so humans
              and agents read the same source of truth. No hidden context, no
              implicit memory, no magic.
            </p>

            <h2 className={styles.colTitle}>Why deterministic</h2>
            <p className={styles.sectionLead}>
              Real software work needs repeatability. A state machine with
              explicit transitions, retries, and review cycles is auditable,
              resumable, and crash-safe. If a run is interrupted, the next
              invocation picks up exactly where the last one stopped — because
              the state lives in <code>.ferrus/</code>, not in an agent's
              head.
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
