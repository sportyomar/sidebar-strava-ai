import React from 'react';
import styles from './KeyTakeawaysWidget.module.css';

const KeyTakeawaysWidget = () => {
  return (
    <div className={styles.keyTakeawaysSection}>
      <div className={styles.keyTakeaways}>
        <h4 className={styles.title}>Key Takeaways</h4>
        <p className={styles.text}>
          The Gantt chart demonstrates a fundamental shift in resource allocation. Traditional consulting
          concentrates effort on manual data gathering and validation (Days 2–12), constraining strategic
          analysis time. Enhanced intelligence methodology front-loads comprehensive market analysis (Days
          1–4), enabling sustained strategic focus throughout the remaining timeline and accelerating
          executive decision-making.
        </p>
      </div>
    </div>
  );
};

export default KeyTakeawaysWidget;
