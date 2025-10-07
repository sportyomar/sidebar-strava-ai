import React from 'react';
import PropTypes from 'prop-types';
import styles from './MetricCard.module.css';

export default function MetricCard({ title, amount, subLabel, lines, trend, onDrillDown }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h4 className={styles.title}>{title}</h4>
        {/*{trend && (*/}
        {/*  <span className={`${styles.trend} ${trend.type === 'up' ? styles.trendUp : styles.trendDown}`}>*/}
        {/*    {trend.type === 'up' ? '↗' : '↘'} {trend.text}*/}
        {/*  </span>*/}
        {/*)}*/}
      </div>
      <div className={styles.amount}>{amount}</div>
      {subLabel && <div className={styles.subLabel}>{subLabel}</div>}
      <div className={styles.contentArea}>
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`${styles.line} ${styles[line.type] || ''}`}
          >
            {line.text}
          </div>
        ))}
      </div>
      {/*{onDrillDown && (*/}
      {/*  <button className={styles.drillButton} onClick={onDrillDown}>*/}
      {/*    Drill down*/}
      {/*  </button>*/}
      {/*)}*/}
    </div>
  );
}

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  amount: PropTypes.string.isRequired,
  subLabel: PropTypes.string,  // <--- add this
  lines: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['positive', 'negative', 'neutral'])
  })).isRequired,
  trend: PropTypes.shape({
    type: PropTypes.oneOf(['up', 'down']).isRequired,
    text: PropTypes.string.isRequired
  }),
  onDrillDown: PropTypes.func
};
