import React, { useState } from 'react';
import ExecutiveGanttChart from './ExecutiveGanttChart';
import ExecutiveDataTable from './ExecutiveDataTable';
import styles from './AnalysisPage.module.css';
import { BarChart3, Table, Download, Share2 } from 'lucide-react';

const EnhancedAnalysisPage = () => {
  const [activeView, setActiveView] = useState('gantt'); // 'gantt' or 'table'

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

  return (
    <div className={styles.container}>
      {/* Navigation Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.pageTitle}>Executive Project Analysis</h1>
            <p className={styles.pageSubtitle}>
              Comprehensive timeline and resource analysis for strategic decision-making
            </p>
          </div>

          <div className={styles.headerActions}>
            {/* View Toggle */}
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleButton} ${activeView === 'gantt' ? styles.active : ''}`}
                onClick={() => setActiveView('gantt')}
              >
                <BarChart3 size={18} />
                Timeline View
              </button>
              <button
                className={`${styles.toggleButton} ${activeView === 'table' ? styles.active : ''}`}
                onClick={() => setActiveView('table')}
              >
                <Table size={18} />
                Data View
              </button>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              <button className={styles.actionButton} onClick={handleExportBoth}>
                <Download size={16} />
                Export
              </button>
              <button className={styles.actionButton} onClick={handleShare}>
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Indicator */}
      <div className={styles.viewIndicator}>
        <div className={styles.indicatorContent}>
          <div className={styles.indicatorIcon}>
            {activeView === 'gantt' ? <BarChart3 size={20} /> : <Table size={20} />}
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
      </div>

      {/* Content Area */}
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

      {/* Quick Stats Footer */}
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