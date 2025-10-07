import React, { useState, useRef, useEffect } from 'react';
import styles from './AnalysisPage.module.css';
import { BarChart3, Table, FileText, Image, MoreHorizontal } from 'lucide-react';
import PlatformMenu from "./PlatformMenu";
import ExecutiveGanttChart from "./ExecutiveGanttChart";
import ExecutiveDataTable from "./ExecutiveDataTable";
import { useAggregateHeight } from '../utils/useAggregateHeight';

const EnhancedAnalysisPage = () => {
  const [activeView, setActiveView] = useState('gantt');
  const [contextBannerVisible, setContextBannerVisible] = useState(true);
  const [leftMetadataOpen, setLeftMetadataOpen] = useState(false);
  const [rightMetadataOpen, setRightMetadataOpen] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false);

  const headerRef = useRef(null);
  const menuRef = useRef(null);
  const pageRef = useRef(null);

  const topOffset = useAggregateHeight(menuRef, headerRef);

  const handleExportBoth = () => {
    console.log('Exporting both Gantt chart and table data...');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Executive Timeline Analysis',
        text: 'Project timeline comparison: Traditional consulting vs. Enhanced intelligence methodology',
        url: window.location.href,
      });
    } else {
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
      <div className={styles.rootWrapper}>
        <div
            ref={pageRef}
            className={styles.container}
            style={{'--top-offset': `${topOffset}px`}}
        >
          <PlatformMenu ref={menuRef} onExport={handleExportBoth} onShare={handleShare}/>

          {/* Wide Header - PowerPoint Master Slide Style */}
          <div ref={headerRef} className={`${styles.header} ${headerCollapsed ? styles.headerCollapsed : ''}`}>
            <div className={styles.headerContent}>
              <div className={styles.titleSection}>
                <h1 className={styles.meta}>Executive Project Analysis</h1>
                <p className={styles.pageTitle}>Current State Analysis Timeline Comparison</p>
                <p className={styles.pageSubtitle}>
                  3-Week delivery framework: Traditional consulting vs. enhanced intelligence methodology
                </p>
              </div>

              {/* Header Options Dropdown */}
              <div className={styles.headerDropdown}>
                <button
                    onClick={() => setHeaderDropdownOpen(!headerDropdownOpen)}
                    className={styles.ellipsisButton}
                >
                  <MoreHorizontal size={20}/>
                </button>

                {headerDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <button
                          onClick={() => {
                            setHeaderCollapsed(true);
                            setHeaderDropdownOpen(false);
                          }}
                          className={styles.dropdownItem}
                      >
                        Hide Header
                      </button>
                      <button
                          onClick={() => {
                            setContextBannerVisible(!contextBannerVisible);
                            setHeaderDropdownOpen(false);
                          }}
                          className={styles.dropdownItem}
                      >
                        {contextBannerVisible ? 'Hide Controls' : 'Show Controls'}
                      </button>
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* Header Peek Indicator - When Collapsed */}
          {headerCollapsed && (
              <button
                  onClick={() => setHeaderCollapsed(false)}
                  className={styles.headerPeekIndicator}
              >
                ↓ Show Header
              </button>
          )}

          {/* Context Banner - Document Section Selector */}
          {contextBannerVisible && (
              <div className={styles.viewIndicator}>
                <div className={styles.indicatorContent}>
                  <div className={styles.indicatorLeft}>
                    <div className={styles.indicatorIcon}>
                      {activeView === 'gantt' ? <BarChart3 size={16}/> : <Table size={16}/>}
                    </div>
                    <div className={styles.indicatorText}>
                <span className={styles.indicatorTitle}>
                  {activeView === 'gantt' ? 'Timeline Visualization' : 'Detailed Analysis'}
                </span>
                      <span className={styles.indicatorDescription}>
                  {activeView === 'gantt'
                      ? 'Executive Gantt chart showing project timelines and resource allocation'
                      : 'Comprehensive data table with task breakdowns and dependencies'}
                </span>
                    </div>
                  </div>

                  {/* View Selector - Document Section Style */}
                  <div className={styles.contextViewSelector}>
                    <button
                        className={`${styles.contextToggleButton} ${activeView === 'gantt' ? styles.active : ''}`}
                        onClick={() => setActiveView('gantt')}
                    >
                      <BarChart3 size={14}/>
                      Timeline View
                    </button>
                    <button
                        className={`${styles.contextToggleButton} ${activeView === 'table' ? styles.active : ''}`}
                        onClick={() => setActiveView('table')}
                    >
                      <Table size={14}/>
                      Data View
                    </button>
                  </div>
                </div>
              </div>
          )}

          {/* Platform Canvas with Sliding Architecture */}
          <div className={styles.platformCanvas}>
            {/* Left Metadata Zone */}
            <div className={`${styles.leftMetadata} ${leftMetadataOpen ? styles.metadataOpen : ''}`}>
              <div className={styles.metadataContent}>
                <h3 className={styles.metadataTitle}>Project Metadata</h3>

                <div className={styles.metadataSection}>
                  <h4 className={styles.metadataHeading}>Timeline Details</h4>
                  <div className={styles.metadataList}>
                    <p><span className={styles.metadataLabel}>Project Duration:</span> 21 business days</p>
                    <p><span className={styles.metadataLabel}>Start Date:</span> Monday, Week 1</p>
                    <p><span className={styles.metadataLabel}>Critical Path:</span> Data collection → Analysis</p>
                    <p><span className={styles.metadataLabel}>Resource Allocation:</span> 8 FTE traditional, 3 FTE
                      enhanced</p>
                  </div>
                </div>

                <div className={styles.metadataSection}>
                  <h4 className={styles.metadataHeading}>Validation Sources</h4>
                  <div className={styles.metadataList}>
                    <p>• McKinsey Global Institute methodology</p>
                    <p>• BCG strategic consulting framework</p>
                    <p>• Bain rapid diagnostic approach</p>
                    <p>• Internal consulting database (500+ projects)</p>
                  </div>
                </div>

                <div className={styles.metadataSection}>
                  <h4 className={styles.metadataHeading}>Change Log</h4>
                  <div className={styles.metadataList}>
                    <p><span className={styles.metadataLabel}>v2.1:</span> Enhanced methodology validation</p>
                    <p><span className={styles.metadataLabel}>v2.0:</span> Comparative timeline analysis</p>
                    <p><span className={styles.metadataLabel}>v1.3:</span> Initial executive framework</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Metadata Zone */}
            <div className={`${styles.rightMetadata} ${rightMetadataOpen ? styles.metadataOpen : ''}`}>
              <div className={styles.metadataContent}>
                <h3 className={styles.metadataTitle}>Analysis Notes</h3>

                <div className={styles.metadataSection}>
                  <h4 className={styles.metadataHeading}>Strategic Implications</h4>
                  <div className={styles.metadataList}>
                    <p>Enhanced intelligence methodology reduces manual data processing time by 65%, enabling sustained
                      strategic focus.</p>
                    <p>Traditional consulting front-loads administrative tasks, constraining analytical bandwidth during
                      critical decision windows.</p>
                  </div>
                </div>

                <div className={styles.metadataSection}>
                  <h4 className={styles.metadataHeading}>Risk Factors</h4>
                  <div className={styles.metadataList}>
                    <p>• Executive adoption curve for enhanced methodology</p>
                    <p>• Integration with existing consulting workflows</p>
                    <p>• Stakeholder socialization requirements</p>
                  </div>
                </div>

                <div className={styles.metadataSection}>
                  <h4 className={styles.metadataHeading}>Next Actions</h4>
                  <div className={styles.metadataList}>
                    <p>1. Present findings to executive committee</p>
                    <p>2. Pilot enhanced methodology on Q4 initiative</p>
                    <p>3. Develop implementation roadmap</p>
                    <p>4. Schedule stakeholder alignment sessions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Peek Indicator */}
            {!leftMetadataOpen && (
                <button
                    onClick={() => setLeftMetadataOpen(true)}
                    className={styles.leftPeekIndicator}
                >
                  <div className={styles.peekBar}></div>
                </button>
            )}

            {/* Right Peek Indicator */}
            {!rightMetadataOpen && (
                <button
                    onClick={() => setRightMetadataOpen(true)}
                    className={styles.rightPeekIndicator}
                >
                  <div className={styles.peekBar}></div>
                </button>
            )}

            {/* Close Metadata Buttons */}
            {leftMetadataOpen && (
                <button
                    onClick={() => setLeftMetadataOpen(false)}
                    className={styles.leftCloseButton}
                >
                  ←
                </button>
            )}

            {rightMetadataOpen && (
                <button
                    onClick={() => setRightMetadataOpen(false)}
                    className={styles.rightCloseButton}
                >
                  →
                </button>
            )}

            {/* Main Slide Canvas */}
            <div className={`${styles.slideCanvas} ${
                headerCollapsed ? styles.headerHidden : styles.headerVisible
            } ${
                leftMetadataOpen ? styles.slideShiftRight : ''
            } ${
                rightMetadataOpen ? styles.slideShiftLeft : ''
            } ${
                leftMetadataOpen && rightMetadataOpen ? styles.slideCenter : ''
            }`}>

              {/* Content Grid - Chart + Context */}
              <div className={styles.contentGrid}>
                {/* Main Content Area - Chart/Table */}
                <div className={styles.mainContentArea}>
                  {activeView === 'gantt' ? (
                      <div className={styles.ganttContainer}>
                        <ExecutiveGanttChart/>
                      </div>
                  ) : (
                      <div className={styles.tableContainer}>
                        <ExecutiveDataTable/>
                      </div>
                  )}
                </div>

                {/* Context Sidebar - PowerPoint Text Box Style */}
                <div className={styles.contextSidebar}>
                  {/* Key Insights Box */}
                  <div className={styles.insightsBox}>
                    <div className={styles.insightsHeader}>
                      <FileText size={20} className={styles.insightsIcon}/>
                      <h4 className={styles.insightsTitle}>Key Insights</h4>
                    </div>
                    <div className={styles.insightsList}>
                      <p>• Resource allocation analysis</p>
                      <p>• Timeline optimization opportunities</p>
                      <p>• Strategic decision acceleration</p>
                      <p>• Methodology validation metrics</p>
                    </div>
                  </div>

                  {/* Supporting Visual */}
                  <div className={styles.supportingVisual}>
                    <Image size={32} className={styles.supportingIcon}/>
                    <h4 className={styles.supportingTitle}>Supporting Visual</h4>
                    <p className={styles.supportingDescription}>
                      Additional chart, diagram, or infographic
                    </p>
                  </div>
                </div>
              </div>

              {/* Executive Summary - Below Main Content */}
              <div className={styles.executiveSummarySection}>
                <div className={styles.executiveSummary}>
                  <h4 className={styles.summaryTitle}>
                    Executive Analysis
                  </h4>
                  <p className={styles.summaryText}>
                    The Gantt chart demonstrates a fundamental shift in resource allocation. Traditional consulting
                    concentrates effort on manual data gathering and validation (Days 2-12), constraining strategic
                    analysis time. Enhanced intelligence methodology front-loads comprehensive market analysis (Days
                    1-4), enabling sustained strategic focus throughout the remaining timeline and accelerating
                    executive decision-making.
                  </p>
                </div>
              </div>

              {/* Document Footer - PowerPoint Style */}
              <div className={styles.documentFooter}>
                <div className={styles.footerMethodology}>
                  Timeline analysis based on 500+ executive consulting engagements • Enhanced intelligence methodology
                  validated through comparative analysis
                </div>

                <div className={styles.footerBranding}>
                  {/* Effora Logomark */}
                  <div className={styles.logomark}>
                    <div className={styles.logoIcon}>
                      <span className={styles.logoText}>E</span>
                    </div>
                    <span className={styles.logoName}>EFFORA</span>
                  </div>

                  {/* Page Number */}
                  <div className={styles.pageNumber}>
                    Page 1
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default EnhancedAnalysisPage;