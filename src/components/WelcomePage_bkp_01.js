import React, { useState, useEffect } from 'react';
import styles from './WelcomePage.module.css';
import AnimatedTitle from "./AnimatedTitle";
import ContentSection from "./ContentSection";

const WelcomePage = () => {
  const [currentUseCase, setCurrentUseCase] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempOrgName, setTempOrgName] = useState('');

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

  // const handleModalOpen = () => {
  //   setTempOrgName(orgName);
  //   setIsModalOpen(true);
  // };

  // const handleModalClose = () => {
  //   setIsModalOpen(false);
  //   setTempOrgName('');
  // };

  // const handleSave = () => {
  //   setOrgName(tempOrgName);
  //   setIsModalOpen(false);
  // };

  return (
    <div className={styles.container}>
      <AnimatedTitle
        audienceSegment="business"
        orgName="Acme Corp"
        // onOrgNameClick={() => setModalOpen(true)}
      />
      <p className={styles.subtitle}>
        AI amplifies what you already do well. Let's make sure you're building on your strengths, not scaling broken processes.
      </p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>From boardroom to plant floor</h2>
        <p className={styles.sectionText}>
          Whether you're a CEO analyzing market trends, a manager streamlining team workflows, or a front-line worker reducing manual tasks - AI should amplify your expertise, not replace your judgment.
        </p>
      </div>

      <div className={styles.processSection}>
        <h2 className={styles.processTitle}>Identify → Test → Measure → Scale</h2>
        <div className={styles.processGrid}>
          <div className={styles.processStep}>
            <span className={styles.stepTitle}>Spot Opportunities:</span>
            <span className={styles.stepDescription}>Find tasks where AI can save you time or improve outcomes</span>
          </div>
          <div className={styles.processStep}>
            <span className={styles.stepTitle}>Test with Real Work:</span>
            <span className={styles.stepDescription}>Try AI on actual problems you face, not hypothetical scenarios</span>
          </div>
          <div className={styles.processStep}>
            <span className={styles.stepTitle}>Measure What Matters:</span>
            <span className={styles.stepDescription}>Track improvements that connect to your daily work and business goals</span>
          </div>
          <div className={styles.processStep}>
            <span className={styles.stepTitle}>Scale Your Wins:</span>
            <span className={styles.stepDescription}>Expand what works across your team and organization</span>
          </div>
        </div>
      </div>

      <div className={styles.valueSection}>
        <h2 className={styles.sectionTitle}>You drive the AI, not the other way around</h2>
        <p className={styles.sectionText}>
          Like Excel or smartphones, AI becomes powerful when business people can directly shape how it works. You understand your processes, your customers, your challenges - you should be leading the AI initiatives, not waiting for someone else to build them for you.
        </p>
      </div>

      <div className={styles.finalSection}>
        <h2 className={styles.sectionTitle}>Ready to take the lead?</h2>
        <p className={styles.sectionText}>
          Whether you're exploring your first AI use case or looking to expand what's already working, we help you validate ideas and measure real business impact - with you in the driver's seat.
        </p>
      </div>

      <div className={styles.navigation}>
        <a href="/product" className={styles.navLink}>See How It Works</a>
        <span className={styles.navSeparator}>|</span>
        <a href="/login" className={styles.navLink}>Login</a>
        <span className={styles.navSeparator}>|</span>
        <a href="/signup" className={styles.navLink}>Start Your AI Journey</a>
      </div>

      {/* Modal */}
      {/*{isModalOpen && (*/}
      {/*  <div className={styles.modalOverlay} onClick={handleModalClose}>*/}
      {/*    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>*/}
      {/*      <h3 className={styles.modalTitle}>Enter Your Organization Name</h3>*/}
      {/*      <input*/}
      {/*        type="text"*/}
      {/*        value={tempOrgName}*/}
      {/*        onChange={(e) => setTempOrgName(e.target.value)}*/}
      {/*        placeholder="Organization name"*/}
      {/*        className={styles.modalInput}*/}
      {/*        autoFocus*/}
      {/*      />*/}
      {/*      <div className={styles.modalActions}>*/}
      {/*        <button onClick={handleModalClose} className={styles.modalCancelButton}>*/}
      {/*          Cancel*/}
      {/*        </button>*/}
      {/*        <button onClick={handleSave} className={styles.modalSaveButton}>*/}
      {/*          Save*/}
      {/*        </button>*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*)}*/}
    </div>
  );
};

export default WelcomePage;