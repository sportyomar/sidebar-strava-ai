import React from 'react';
import styles from './ProductOverviewSection.module.css';

const ProductOverviewSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>

        {/* Opening Hook */}
        <div className={styles.openingBlock}>
          <h2 className={styles.mainHeading}>
            Your team makes decisions with data nobody trusts
          </h2>
          <p className={styles.mainDescription}>
            Every day, someone asks "where did this number come from?" or "can we actually use this for the board meeting?"
            You have spreadsheets, dashboards, and reports everywhere, but no one knows which version is right,
            who changed what, or if the data is even current.
          </p>
        </div>

        {/* Why This Happens - Education */}
        <div className={styles.educationBlock}>
          <h3 className={styles.subHeading}>
            Data chaos is the default state
          </h3>
          <p className={styles.bodyText}>
            Data lives everywhere: your CRM, financial systems, spreadsheets someone emailed last week, that CSV
            export sitting in Downloads. When you need insights, someone manually pulls it together.
            They clean it (maybe), combine it (somehow), and create a chart (hopefully correctly).
          </p>
          <p className={styles.bodyText}>
            A month later, no one remembers how that chart was made. The formulas changed. The source data updated.
            Someone copied it into PowerPoint, then someone else edited those numbers directly. Now you have
            three versions of "Q3 Revenue" and they're all different.
          </p>
          <p className={styles.bodyText}>
            This isn't a tools problem. This is what happens when data doesn't have structure, history, or rules.
            That's what data governance actually means—knowing your data is correct, traceable, and safe to use.
          </p>
        </div>

        {/* The Breakthrough */}
        <div className={styles.breakthroughBlock}>
          <h3 className={styles.subHeading}>
            AI makes governance automatic for the first time
          </h3>
          <p className={styles.bodyText}>
            Until now, data governance meant hiring consultants, implementing enterprise software, and forcing
            everyone to follow complex processes. It was expensive, slow, and people ignored it.
          </p>
          <p className={styles.bodyText}>
            AI changes this completely. It can read your data sources, understand what they mean, track every change,
            verify quality automatically, and answer questions in plain English—all while maintaining perfect records
            of where every number came from.
          </p>
        </div>

        {/* What You Can Actually Do */}
        <div className={styles.capabilitiesBlock}>
          <h3 className={styles.subHeading}>
            Work the way you want, with data you can trust
          </h3>

          <div className={styles.scenariosGrid}>
            <div className={styles.scenarioCard}>
              <div className={styles.scenarioNumber}>01</div>
              <h4 className={styles.scenarioTitle}>Ask questions, get answers</h4>
              <p className={styles.scenarioText}>
                "Show me customer retention by cohort for the last 6 months." Get a chart in seconds,
                with full context on where the data came from and how it was calculated.
              </p>
            </div>

            <div className={styles.scenarioCard}>
              <div className={styles.scenarioNumber}>02</div>
              <h4 className={styles.scenarioTitle}>Generate presentations instantly</h4>
              <p className={styles.scenarioText}>
                "Create a board deck with Q4 performance metrics." AI builds the slides, formats the charts,
                and includes data sources automatically. Edit it like a normal presentation.
              </p>
            </div>

            <div className={styles.scenarioCard}>
              <div className={styles.scenarioNumber}>03</div>
              <h4 className={styles.scenarioTitle}>Trace every number back to its source</h4>
              <p className={styles.scenarioText}>
                Click any chart or table to see the exact data sources, transformations, and calculations used.
                Every change is logged with who, when, and why.
              </p>
            </div>

            <div className={styles.scenarioCard}>
              <div className={styles.scenarioNumber}>04</div>
              <h4 className={styles.scenarioTitle}>Work in the tools you already use</h4>
              <p className={styles.scenarioText}>
                Export to Excel, embed in Notion, share links—everything stays connected to the source data
                and updates automatically when the data changes.
              </p>
            </div>

            <div className={styles.scenarioCard}>
              <div className={styles.scenarioNumber}>05</div>
              <h4 className={styles.scenarioTitle}>Control who sees what</h4>
              <p className={styles.scenarioText}>
                Set policies once: finance data only for finance team, customer data only for approved projects.
                AI enforces the rules automatically, no manual approvals needed.
              </p>
            </div>

            <div className={styles.scenarioCard}>
              <div className={styles.scenarioNumber}>06</div>
              <h4 className={styles.scenarioTitle}>Prove compliance instantly</h4>
              <p className={styles.scenarioText}>
                Auditor asks "who accessed customer data last quarter?" Get a complete report in 30 seconds,
                showing exactly who saw what, when, and for what purpose.
              </p>
            </div>
          </div>
        </div>

        {/* Who This Is For */}
        <div className={styles.audienceBlock}>
          <h3 className={styles.subHeading}>
            Built for teams who work with data, not data teams
          </h3>
          <p className={styles.bodyText}>
            You don't need a data warehouse, engineering team, or six months of setup. If you have data in systems
            and people who need insights from it—revenue, customers, operations, anything—this works for you.
          </p>

          <div className={styles.audienceGrid}>
            <div className={styles.audienceCard}>
              <h4 className={styles.audienceTitle}>Executives</h4>
              <p className={styles.audienceText}>
                Trust the numbers in board decks. Know decisions are based on accurate, current data.
              </p>
            </div>

            <div className={styles.audienceCard}>
              <h4 className={styles.audienceTitle}>Analysts</h4>
              <p className={styles.audienceText}>
                Stop rebuilding the same reports. Spend time on insights, not finding and cleaning data.
              </p>
            </div>

            <div className={styles.audienceCard}>
              <h4 className={styles.audienceTitle}>Operations</h4>
              <p className={styles.audienceText}>
                Get metrics without waiting for data teams. Make daily decisions with confidence.
              </p>
            </div>

            <div className={styles.audienceCard}>
              <h4 className={styles.audienceTitle}>Compliance</h4>
              <p className={styles.audienceText}>
                Respond to audits in minutes. Prove data access policies are actually enforced.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ProductOverviewSection;