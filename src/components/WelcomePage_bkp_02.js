import React, { useState, useEffect } from 'react';
import styles from './WelcomePage.module.css';
import NonAnimatedTitle from "./NonAnimatedTitle";
import ProblemHierarchyBuilder from "../../api/ProblemHierarchyBuilder";
import ContentSection from "./ContentSection";
import ViewToggle from "./ViewToggle";
import GlobalNav from './GlobalNav';

const WelcomePage = () => {
  const [currentUseCase, setCurrentUseCase] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [orgName, setOrgName] = useState('Acme Corp');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempOrgName, setTempOrgName] = useState('');
  const [currentIndustryId, setCurrentIndustryId] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState(null);

  const useCases = [
    "reduce manual invoice processing",
    "speed up quote generation",
    "eliminate repetitive data entry",
    "improve customer response times",
    "streamline approval workflows",
    "enhance team collaboration",
    "automate report generation",
    "simplify vendor onboarding",
    "accelerate project planning",
    "optimize resource allocation"
  ];

  useEffect(() => {
    let timeout;
    const currentText = useCases[currentUseCase];

    if (isTyping) {
      if (displayText.length < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        }, 100);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 50);
      } else {
        setCurrentUseCase((prev) => (prev + 1) % useCases.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isTyping, currentUseCase, useCases]);

  const handleIndustryChange = async (industryId) => {

    setCurrentIndustryId(industryId);

    // Fetch industry details when selection changes
    try {
      const url = `http://localhost:5002/api/playbook/industries/${industryId}/teams`;
      console.log('Fetching from URL:', url);

      const response = await fetch(url);
      const data = await response.json();


      if (data.industry) {
      }

      if (data.teams) {
      }

      if (data.success) {
        setSelectedIndustry(data.industry);
      } else {
      }
    } catch (error) {
      console.error('Error fetching industry details:', error);
    }
  };

  const handleOrgNameClick = () => {
    setTempOrgName(orgName);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTempOrgName('');
  };

  const handleSave = () => {
    setOrgName(tempOrgName);
    setIsModalOpen(false);
  };

  // Debug what we're passing to NonAnimatedTitle

  return (
    <div className={styles.container}>
      <GlobalNav />
      <ViewToggle
        currentIndustryId={currentIndustryId}
        onIndustryChange={handleIndustryChange}
      />

      <NonAnimatedTitle
        industryId={currentIndustryId}
        selectedIndustry={selectedIndustry}
        orgName={orgName}
        onOrgNameClick={handleOrgNameClick}
      />

      <p className={styles.subtitle}>
        AI observability turns black box systems into transparent, measurable business assets.
      </p>

      <ContentSection
        title="From C-suite to operations floor"
        text="Whether you're a CEO tracking AI ROI, a manager measuring process improvements, or an operator ensuring quality outcomes - AI observability gives you the visibility to make informed decisions about your AI investments."
      />

      <div className={styles.processSection}>
        <h2 className={styles.processTitle}>Deploy → Monitor → Analyze → Optimize</h2>
        <div className={styles.processGrid}>
          <div className={styles.processStep}>
            <span className={styles.stepTitle}>Deploy with Visibility:</span>
            <span className={styles.stepDescription}>Launch AI systems with comprehensive tracking of business metrics and outcomes</span>
          </div>
          <div className={styles.processStep}>
            <span className={styles.stepTitle}>Monitor Real Impact:</span>
            <span className={styles.stepDescription}>See how AI affects your KPIs, customer experience, and operational efficiency</span>
          </div>
          <div className={styles.processStep}>
            <span className={styles.stepTitle}>Analyze Performance Trends:</span>
            <span className={styles.stepDescription}>Understand when AI is helping, hurting, or needs adjustment in your processes</span>
          </div>
          <div className={styles.processStep}>
            <span className={styles.stepTitle}>Optimize for Results:</span>
            <span className={styles.stepDescription}>Make data-driven decisions to improve AI performance and business outcomes</span>
          </div>
        </div>
      </div>

      <ContentSection
        title="You control the AI, with full visibility into how"
        text="Like financial dashboards or performance analytics, AI observability becomes powerful when business leaders can directly see and understand AI impact. You know your success metrics, your customer needs, your operational goals - you should have clear visibility into whether AI is helping you achieve them."
        variant="highlighted"
      />

      <ContentSection
        title="Ready to see inside your AI?"
        text="Whether you're deploying your first AI system or scaling existing solutions, we provide the observability tools you need to measure real impact and optimize for business success - with complete transparency into what's happening under the hood."
      />

      <div className={styles.navigation}>
        <a href="/demo" className={styles.navLink}>See Observability Demo</a>
        <span className={styles.navSeparator}>|</span>
        <a href="/login" className={styles.navLink}>Login</a>
        <span className={styles.navSeparator}>|</span>
        <a href="/signup" className={styles.navLink}>Start Monitoring AI</a>
      </div>

      {/* Modal for editing organization name */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={handleModalClose}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Enter Your Organization Name</h3>
            <input
              type="text"
              value={tempOrgName}
              onChange={(e) => setTempOrgName(e.target.value)}
              placeholder="Organization name"
              className={styles.modalInput}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button onClick={handleModalClose} className={styles.modalCancelButton}>
                Cancel
              </button>
              <button onClick={handleSave} className={styles.modalSaveButton}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomePage;