import React from 'react';
import styles from './ProductOverviewSection.module.css';

const ProductOverviewSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>

        <div className={styles.hero}>
          <h2 className={styles.mainHeading}>Analytics you can actually trust</h2>
          <p className={styles.subheading}>Stop second-guessing your data. Get AI-powered insights with built-in quality validation.</p>
        </div>

        <div className={styles.capabilities}>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Automatic data quality validation</h3>
            <p className={styles.capabilityText}>
              Every answer includes confidence scores and quality checks. Automatically detects ID fragmentation,
              event gaps, and session breaks before you present to leadership.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Board-ready filtering</h3>
            <p className={styles.capabilityText}>
              "Show only high-confidence retention data for my board deck."
              Get filtered insights that automatically exclude unreliable cohorts and explain what's trustworthy.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Transparent data sourcing</h3>
            <p className={styles.capabilityText}>
              See exactly which data is reliable and what needs fixing. Every metric shows data quality scores,
              coverage percentages, and identified issues like "847 users tracked under multiple IDs."
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Conversational explanations, not just error codes</h3>
            <p className={styles.capabilityText}>
              "Can I trust these numbers for my board deck?" Get plain-English explanations of exactly why
              data is unreliable, which cohorts to exclude, and what the real confidence range is.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Honest answers, not false confidence</h3>
            <p className={styles.capabilityText}>
              The AI refuses to answer confidently when data quality is poor. Get transparent explanations
              of what you can trust vs. what needs instrumentation fixes before making decisions.
            </p>
          </div>

          <div className={styles.capabilityCard}>
            <h3 className={styles.capabilityTitle}>Audit trails for data integrity</h3>
            <p className={styles.capabilityText}>
              "Show me data quality issues from last quarter."
              Track regressions, missing events, and taxonomy violations automatically—no manual detective work.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export default ProductOverviewSection;