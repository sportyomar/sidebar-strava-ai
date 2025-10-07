import React from 'react';
import styles from './ProjectSelectorModal.module.css'; // Reuse same modal styles

const ModuleSelectorModal = ({ modules, selectedModule, onSelect, onClose }) => {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Select a Module</h2>
        </div>

        <div className={styles.projectTable}>
          <div className={styles.tableHeader}>
            <span>Module</span>
            <span>Access</span>
          </div>

          <div className={styles.tableBody}>
            {modules.map(({ key, label, isAccessible }) => (
              <div
                key={key}
                className={styles.tableRow}
                onClick={() => onSelect(key)}
                style={{
                  color: isAccessible ? undefined : '#9ca3af',
                  cursor: isAccessible ? 'pointer' : 'not-allowed'
                }}
              >
                <span>{label}</span>
                <span>{isAccessible ? '✔ Access' : '🚫 No Access'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ModuleSelectorModal;
