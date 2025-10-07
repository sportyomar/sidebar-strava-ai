import React, { useEffect, useState } from 'react';
import styles from './PortfolioQ3Dashboard.module.css';
import renderBlock from '../orchestration/renderBlock';

export default function PortfolioQ3Dashboard() {
  const [sections, setSections] = useState([]);
  const [error, setError] = useState(null);

  const project = "portfolio_q3_2024";
  const path = `/data/${project}-injected.json`;

  useEffect(() => {
    fetch(path)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return res.json();
      })
      .then(manifest => setSections(manifest.dashboardSections || []))
      .catch(err => {
        console.error(`Error loading dashboard:`, err);
        setError(`Failed to load dashboard: ${err.message}`);
      });
  }, []);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!sections.length) return <div className={styles.loading}>Loading dashboard...</div>;

  const getBlock = kind => sections.find(b => b.blockKind === kind);

  const Header = getBlock("DashboardHeader");
  const Metrics = getBlock("MetricGrid");
  const Filters = getBlock("FilterPanel");
  const Legend = getBlock("StatusLegend");
  const NextSteps = getBlock("NextStepsPanel");

  const TableProblems = sections.find(b => b.settings?.title?.includes("🚨"));
  const TableWatchList = sections.find(b => b.settings?.title?.includes("⚠️"));
  const TablePerforming = sections.find(b => b.settings?.title?.includes("✅"));

  return (
    <div className={styles.container}>
      {Header && <div className={styles.header}>{renderBlock(Header)}</div>}
      {Metrics && <div className={styles.metrics}>{renderBlock(Metrics)}</div>}
      {Filters && <div className={styles.filters}>{renderBlock(Filters)}</div>}
      {Legend && <div className={styles.legends}>{renderBlock(Legend)}</div>}

      {TableProblems && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🚨 Problems</h2>
          {renderBlock(TableProblems)}
        </div>
      )}

      {TableWatchList && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>⚠️ Watch List</h2>
          {renderBlock(TableWatchList)}
        </div>
      )}

      {TablePerforming && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>✅ Performing Well</h2>
          {renderBlock(TablePerforming)}
        </div>
      )}

      {NextSteps && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📌 Next Steps</h2>
          {renderBlock(NextSteps)}
        </div>
      )}
    </div>
  );
}
