import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

export default function Security(): ReactNode {
  return (
    <Layout
      title="Security"
      description="Security policy for ferrus.">
      <main>
        <section className={styles.section}>
          <div className="container">
            <Heading as="h1" className={styles.sectionTitle}>
              <span className={styles.prompt}>$</span> Security
            </Heading>
            <p className={styles.sectionLead}>
              If you discover a security issue related to ferrus, please report
              it privately before public disclosure.
            </p>
            <p className={styles.sectionLead}>
              Contact:{' '}
              <a href="mailto:security@ferrus.dev">security@ferrus.dev</a>
            </p>
            <p className={styles.sectionLead}>Supported versions:</p>
            <ul className={styles.sectionLead}>
              <li>latest alpha release</li>
            </ul>
            <p className={styles.sectionLead}>
              The project is currently in active alpha development and APIs may
              change between releases.
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
