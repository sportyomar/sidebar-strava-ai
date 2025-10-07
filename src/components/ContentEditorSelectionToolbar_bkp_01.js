import React from 'react';
import styles from './ContentEditorSelectionToolbar.module.css';

const ContentEditorSelectionToolbar = ({
  selectedRange,
  selectedLanguage,
  setSelectedLanguage,
  customLabel,
  setCustomLabel,
  languages,
  onApplyFormatting
}) => {
  if (!selectedRange) return null;

  return (
    <div className={styles.selectionToolbar}>
      <div className={styles.selectionInfo}>
        Selected: "{selectedRange.text.substring(0, 50)}{selectedRange.text.length > 50 ? '...' : ''}"
      </div>

      <div className={styles.formatControls}>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className={styles.languageSelect}
        >
          {languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Tag (e.g., system-prompt, example)"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          className={styles.labelInput}
        />

        <button
          onClick={onApplyFormatting}
          className={styles.applyButton}
        >
          Mark as Code
        </button>
      </div>
    </div>
  );
};

export default ContentEditorSelectionToolbar;