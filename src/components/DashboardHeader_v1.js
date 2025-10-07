import React from 'react';
import PropTypes from 'prop-types';
import styles from './DashboardHeader.module.css';

export default function DashboardHeader({ dashboardInfo, onClearFilters }) {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>{dashboardInfo.title}</h1>
        <p className={styles.description}>{dashboardInfo.description}</p>

        <div className={styles.useCasesSection}>
          <ul className={styles.useCasesList}>
            {dashboardInfo.use_cases.map((useCase, index) => (
              <li key={index} className={styles.useCase}>
                {useCase}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.audienceTag}>
          Target: {dashboardInfo.target_audience}
        </div>
      </div>

      <div className={styles.headerActions}>
        <button onClick={onClearFilters} className={styles.clearFiltersButton}>
          Clear All Filters
        </button>
      </div>
    </div>
  );
}

DashboardHeader.propTypes = {
  dashboardInfo: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    use_cases: PropTypes.arrayOf(PropTypes.string).isRequired,
    target_audience: PropTypes.string.isRequired
  }).isRequired,
  onClearFilters: PropTypes.func.isRequired
};