import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

export default function Contact(): ReactNode {
  return (
    <Layout
      title="Contact"
      description="How to reach the ferrus project.">
      <main>
        <section className={styles.section}>
          <div className="container">
            <Heading as="h1" className={styles.sectionTitle}>
              <span className={styles.prompt}>$</span> Contact
            </Heading>
            <p className={styles.sectionLead}>
              The fastest way to reach the project is on GitHub.
            </p>
            <ul className={styles.sectionLead}>
              <li>
                <Link href="https://github.com/RomanEmreis/ferrus/issues">
                  GitHub Issues
                </Link>{' '}
                — bug reports and feature requests
              </li>
              <li>
                <Link href="https://github.com/RomanEmreis/ferrus/discussions">
                  GitHub Discussions
                </Link>{' '}
                — questions and ideas
              </li>
              <li>
                Email: <Link href="mailto:contact@ferrus.dev">contact@ferrus.dev</Link>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </Layout>
  );
}
