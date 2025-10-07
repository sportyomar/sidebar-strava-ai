import React, {useState, useEffect} from 'react';
import styles from './UserPrompt.module.css';
import TextAnalyzer from './TextAnalyzer';
import ContentEditor from './ContentEditor';

const analyzer = new TextAnalyzer();
// Expose for console testing
window.analyzer = analyzer;

const UserPrompt = ({ prompt, attachmentCount = 0 }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [intent, setIntent] = useState('other');
  const [confidence, setConfidence] = useState(0);
  const [isClassifying, setIsClassifying] = useState(false);

  const analysis = analyzer.analyze(prompt);
  console.log('TextAnalyzer results:', analysis);
  console.log('Detected regions:', analyzer.findPotentialCodeBlocks(prompt));

  // Classify intent when prompt changes
  useEffect(() => {
    if (!prompt || prompt.trim().length === 0) {
      setIntent('other');
      setConfidence(0);
      return;
    }

    const classifyIntent = async () => {
      setIsClassifying(true);
      try {
        const response = await fetch('http://localhost:5002/api/interactions/intents/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt.trim()
          })
        });

        if (response.ok) {
          const data = await response.json();
          setIntent(data.predictedIntent || 'other');
          setConfidence(data.confidence || 0);
          console.log('Intent classification:', data);
        } else {
          console.error('Intent classification failed:', response.statusText);
          setIntent('other');
          setConfidence(0);
        }
      } catch (error) {
        console.error('Error classifying intent:', error);
        setIntent('other');
        setConfidence(0);
      } finally {
        setIsClassifying(false);
      }
    };

    // Debounce the classification to avoid too many API calls
    const timeoutId = setTimeout(classifyIntent, 300);
    return () => clearTimeout(timeoutId);
  }, [prompt]);

  // Format intent for display
  const getIntentDisplay = () => {
    if (isClassifying) return 'Analyzing...';

    // Capitalize first letter
    const displayIntent = intent.charAt(0).toUpperCase() + intent.slice(1);

    // Add confidence indicator if confidence is decent
    if (confidence > 0.6) {
      return `${displayIntent} (${Math.round(confidence * 100)}%)`;
    }

    return displayIntent;
  };

  // Get button style based on confidence
  const getIntentButtonClass = () => {
    let baseClass = styles.intentButton;

    if (isClassifying) {
      return `${baseClass} ${styles.classifying}`;
    }

    if (confidence > 0.8) {
      return `${baseClass} ${styles.highConfidence}`;
    } else if (confidence > 0.6) {
      return `${baseClass} ${styles.mediumConfidence}`;
    } else {
      return `${baseClass} ${styles.lowConfidence}`;
    }
  };

  return (
    <div className={styles.messageUser}>
      {/* Header row */}
      <div className={styles.headerRow}>
        <div className={styles.userAvatar}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div className={styles.buttonGroup}>
          <button
            className={getIntentButtonClass()}
            title={`Intent: ${intent} | Confidence: ${Math.round(confidence * 100)}%`}
          >
            <span className={styles.buttonLabel}>
              {getIntentDisplay()}
            </span>
          </button>
          <button className={styles.reviewButton} onClick={() => setIsEditorOpen(true)}>
            <span className={styles.buttonLabel}>Review</span>
          </button>
        </div>
      </div>

      {/* Divider line */}
      <div className={styles.dividerLine}></div>

      {/* Attachments row */}
      {attachmentCount > 0 && (
        <div className={styles.attachmentsRow}>
          <span className={styles.attachmentCount}>
            📎 {attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Content row */}
      <div className={styles.contentRow}>
        <div className={styles.promptText}>
          {prompt}
        </div>
      </div>

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