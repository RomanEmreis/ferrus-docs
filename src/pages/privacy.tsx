import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

export default function Privacy(): ReactNode {
  return (
    <Layout
      title="Privacy"
      description="Privacy notice for ferrus.dev.">
      <main>
        <section className={styles.section}>
          <div className="container">
            <Heading as="h1" className={styles.sectionTitle}>
              <span className={styles.prompt}>$</span> Privacy
            </Heading>
            <p className={styles.sectionLead}>
              This site may use basic analytics and CDN services.
            </p>
            <p className={styles.sectionLead}>
              No personal data is intentionally collected beyond standard web
              server logs.
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
