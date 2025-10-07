// ToggleTabsDesign.js
import React, { useState } from 'react';
import styles from './ToggleTabsDesign.module.css';

const ToggleTabsDesign = () => {
  const [activeTab, setActiveTab] = useState('forYou');

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsWrapper}>
        <button
          className={`${styles.tab} ${activeTab === 'forYou' ? styles.active : ''}`}
          onClick={() => setActiveTab('forYou')}
        >
          For You
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <div
          className={styles.activeIndicator}
          style={{
            transform: activeTab === 'history' ? 'translateX(100%)' : 'translateX(0)'
          }}
        />
      </div>
    </div>
  );
};

export default ToggleTabsDesign;