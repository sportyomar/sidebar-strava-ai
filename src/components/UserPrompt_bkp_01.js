import React from 'react';
import styles from './UserPrompt.module.css';
import TextAnalyzer from './TextAnalyzer';

const analyzer = new TextAnalyzer();
// Expose for console testing
window.analyzer = analyzer;

const UserPrompt = ({ prompt, attachmentCount = 0 }) => {
  // Test analysis and log results
  const analysis = analyzer.analyze(prompt);
  console.log('TextAnalyzer results:', analysis);
  console.log('Detected regions:', analyzer.findPotentialCodeBlocks(prompt));

  return (
    <div className={styles.messageUser}>
      <div className={styles.userAvatar}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <div className={styles.promptText}>
        {prompt}
      </div>

      {/* Show attachments if they exist */}
      {attachmentCount > 0 && (
        <div className={styles.messageAttachments}>
          <span className={styles.attachmentCount}>
            📎 {attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default UserPrompt;