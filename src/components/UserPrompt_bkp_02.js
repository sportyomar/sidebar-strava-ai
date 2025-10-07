import React, {useState} from 'react';
import styles from './UserPrompt.module.css';
import TextAnalyzer from './TextAnalyzer';
import ContentEditor from './ContentEditor';

const analyzer = new TextAnalyzer();
// Expose for console testing
window.analyzer = analyzer;

const UserPrompt = ({ prompt, attachmentCount = 0 }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
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
      <div className={styles.promptContainer}>
        <div className={styles.promptText}>
          {prompt}
        </div>
        <button className={styles.maximizeButton} onClick={() => setIsEditorOpen(true)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={styles.maximizeIcon}>
            <path d="M3 3v6h2V5h4V3H3zm2 12H3v6h6v-2H5v-4zm14 4h-4v2h6v-6h-2v4zm0-16h-4v2h4v4h2V3h-6z"/>
          </svg>
        </button>
      </div>

      {/* Show attachments if they exist */}
      {attachmentCount > 0 && (
        <div className={styles.messageAttachments}>
          <span className={styles.attachmentCount}>
            📎 {attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}
          </span>
        </div>
      )}

      <ContentEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        content={prompt}
        textAnalyzer={analyzer}
        onApplyFormatting={(formattedData) => {
          console.log('Formatted data:', formattedData);
          setIsEditorOpen(false);
        }}
      />

    </div>
  );
};

export default UserPrompt;