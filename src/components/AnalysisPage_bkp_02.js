import React, { useState, useRef, useEffect } from 'react';
import styles from './AnalysisPage.module.css';
import { BarChart3, Table, Download, Share2 } from 'lucide-react';
import PlatformMenu from "./PlatformMenu";
import ExecutiveGanttChart from "./ExecutiveGanttChart";
import ExecutiveDataTable from "./ExecutiveDataTable";


// Mock components for demonstration
// const ExecutiveGanttChart = () => (
//   <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
//     <h3>Executive Gantt Chart Component</h3>
//     <p>Interactive timeline visualization would render here</p>
//   </div>
// );

// const ExecutiveDataTable = () => (
//   <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
//     <h3>Executive Data Table Component</h3>
//     <p>Detailed data table would render here</p>
//   </div>
// );

const EnhancedAnalysisPage = () => {
  const [activeView, setActiveView] = useState('gantt'); // 'gantt' or 'table'
  const pageRef = useRef(null);

  const handleExportBoth = () => {
    // This would trigger exports from both components
    console.log('Exporting both Gantt chart and table data...');
    // Implementation would depend on your specific export requirements
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Executive Timeline Analysis',
        text: 'Project timeline comparison: Traditional consulting vs. Enhanced intelligence methodology',
        url: window.location.href,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Analysis URL copied to clipboard!');
    }
  };

  useEffect(() => {
    if (pageRef.current) {
      pageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div ref={pageRef} className={styles.container}>
      <PlatformMenu onExport={handleExportBoth} onShare={handleShare} />
      {/* Platform Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.meta}>Executive Project Analysis</h1>
            <p className={styles.pageTitle}>
              Current State Analysis Timeline Comparison
            </p>
            <p className={styles.pageSubtitle}>
              3-Week delivery framework: Traditional consulting vs. enhanced intelligence methodology
            </p>
          </div>

          {/*<div className={styles.headerActions}>*/}
          {/*  /!* Primary Action Cluster *!/*/}
          {/*  <div className={styles.actionButtons}>*/}
          {/*    <button className={styles.actionButton} onClick={handleExportBoth}>*/}
          {/*      <Download size={16} />*/}
          {/*      Export*/}
          {/*    </button>*/}
          {/*    <button className={styles.actionButton} onClick={handleShare}>*/}
          {/*      <Share2 size={16} />*/}
          {/*      Share*/}
          {/*    </button>*/}
          {/*  </div>*/}
          {/*</div>*/}
        </div>
      </div>

      {/* Context Banner with integrated View Selector */}
      <div className={styles.viewIndicator}>
        <div className={styles.indicatorContent}>
          <div className={styles.indicatorLeft}>
            <div className={styles.indicatorIcon}>
              {activeView === 'gantt' ? <BarChart3 size={16} /> : <Table size={16} />}
            </div>
            <div className={styles.indicatorText}>
              <span className={styles.indicatorTitle}>
                {activeView === 'gantt' ? 'Visual Timeline Analysis' : 'Detailed Data Analysis'}
              </span>
              <span className={styles.indicatorDescription}>
                {activeView === 'gantt'
                  ? 'Interactive Gantt chart showing project timelines and dependencies'
                  : 'Sortable table with detailed task breakdowns and metrics'
                }
              </span>
            </div>
          </div>

          {/* View Selector (Compact) */}
          <div className={styles.contextViewSelector}>
            <button
              className={`${styles.contextToggleButton} ${activeView === 'gantt' ? styles.active : ''}`}
              onClick={() => setActiveView('gantt')}
            >
              <BarChart3 size={14} />
              Timeline
            </button>
            <button
              className={`${styles.contextToggleButton} ${activeView === 'table' ? styles.active : ''}`}
              onClick={() => setActiveView('table')}
            >
              <Table size={14} />
              Data
            </button>
          </div>
        </div>
      </div>

      {/* Content Canvas */}
      <div className={styles.content}>
        {activeView === 'gantt' ? (
          <div className={styles.ganttContainer}>
            <ExecutiveGanttChart />
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <ExecutiveDataTable />
          </div>
        )}
      </div>

      {/* Insight Footer */}
      <div className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.quickStat}>
            <span className={styles.statLabel}>Total Timeline</span>
            <span className={styles.statValue}>21 Days</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.statLabel}>Approaches Compared</span>
            <span className={styles.statValue}>2</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.statLabel}>Total Tasks</span>
            <span className={styles.statValue}>16</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.statLabel}>Analysis Type</span>
            <span className={styles.statValue}>Executive Summary</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAnalysisPage;