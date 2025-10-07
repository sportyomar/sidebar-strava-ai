import React from 'react';
import styles from './ProductOverviewSection.module.css';

const ProductOverviewSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>

        <div className={styles.hero}>
          <h2 className={styles.mainHeading}>Ask your data anything</h2>
          <p className={styles.subheading}>Get answers instantly. Trust them completely.</p>
        </div>

        <div className={styles.capabilities}>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Generate board presentations</h3>
            <p className={styles.capabilityText}>
              "Create a Q4 performance deck with revenue trends and customer metrics."
              Get formatted slides in seconds, ready to present.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Create dashboards by typing questions</h3>
            <p className={styles.capabilityText}>
              "Show me customer retention by cohort for the last year."
              Get the chart you need without building it manually.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Get instant answers with sources</h3>
            <p className={styles.capabilityText}>
              Every answer shows where the data came from, who owns it, and when it was last updated.
              No detective work required.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Export anywhere, stay connected</h3>
            <p className={styles.capabilityText}>
              Send to Excel, embed in Notion, share as links.
              Everything updates when the underlying data changes.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Prove compliance when asked</h3>
            <p className={styles.capabilityText}>
              "Show me who accessed customer data last quarter."
              Get audit reports in seconds, not weeks of manual work.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export default ProductOverviewSection;