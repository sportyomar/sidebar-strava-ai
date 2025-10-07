// PromptInput.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './ChatInterface.module.css';

function PromptInput({
  onSendMessage,
  isLoading,
  selectedModel,
  currentThread,
  placeholder,
  availableModels,
  onNavigationModeChange,
  uploadedDocuments = [], // Documents available in current chat
  chatHistory = [] // Previous messages for context
}) {
  const [prompt, setPrompt] = useState('');
  const [secondOpinionModel, setSecondOpinionModel] = useState(null);
  const [isSecondOpinionActive, setIsSecondOpinionActive] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Progressive input states
  const [inputSize, setInputSize] = useState('compact'); // 'compact' | 'medium' | 'expanded'
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  // Advanced features state
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [contextMode, setContextMode] = useState('recent'); // 'recent' | 'relevant' | 'all'
  const [includeHistory, setIncludeHistory] = useState(true);
  const [messageIntent, setMessageIntent] = useState('chat'); // 'chat' | 'analyze' | 'summarize' | 'create'

  // Navigation mode state
  const [navigationMode, setNavigationMode] = useState('OFF');
  const [autoModeSwitch, setAutoModeSwitch] = useState(true);

  const textareaRef = useRef(null);

  // Calculate input size based on content and manual expansion
  const calculateInputSize = useCallback((content) => {
    const lineCount = content.split('\n').length;
    const charCount = content.length;

    if (isManuallyExpanded) return 'expanded';
    if (lineCount > 3 || charCount > 200) return 'expanded';
    if (lineCount > 1 || charCount > 50) return 'medium';
    return 'compact';
  }, [isManuallyExpanded]);

  // Get height based on input size
  const getInputHeight = (size) => {
    switch (size) {
      case 'compact': return 44; // Single line
      case 'medium': return 88;  // ~3 lines
      case 'expanded': return 180; // ~8 lines
      default: return 44;
    }
  };

  // Auto-resize textarea function
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const newSize = calculateInputSize(prompt);
    const targetHeight = getInputHeight(newSize);

    // Update size state if changed
    if (newSize !== inputSize) {
      setInputSize(newSize);
    }

    // Apply height
    textarea.style.height = 'auto';
    const naturalHeight = Math.min(textarea.scrollHeight, targetHeight);
    textarea.style.height = `${naturalHeight}px`;
  }, [prompt, inputSize, calculateInputSize]);

  // Toggle manual expansion
  const toggleExpansion = () => {
    setIsManuallyExpanded(!isManuallyExpanded);
  };

  // Handle document selection
  const toggleDocument = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  // Handle intent change
  const handleIntentChange = (intent) => {
    setMessageIntent(intent);

    // Auto-suggest based on intent
    if (intent === 'analyze' && selectedDocuments.length === 0 && uploadedDocuments.length > 0) {
      // Suggest including recent documents for analysis
      setSelectedDocuments([uploadedDocuments[0]?.id].filter(Boolean));
    }
  };

  // Navigation mode functions (existing)
  const cycleNavigationMode = () => {
    const modes = ['OFF', 'CURRENT', 'TIMELINE'];
    const currentIndex = modes.indexOf(navigationMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    setNavigationMode(newMode);
    onNavigationModeChange?.(newMode);
  };

  const toggleAutoModeSwitch = () => {
    setAutoModeSwitch(!autoModeSwitch);
  };

  const getModeDisplay = () => {
    switch (navigationMode) {
      case 'CURRENT': return 'Current ↕';
      case 'TIMELINE': return 'Timeline ←→';
      case 'OFF':
      default: return 'Navigate OFF';
    }
  };

  // Calculate send button state
  const getSendButtonConfig = () => {
    const hasContext = selectedDocuments.length > 0 || messageIntent !== 'chat';
    const modelCount = (isSecondOpinionActive && secondOpinionModel) ? 2 : 1;

    let text = 'Send';
    let icon = '↑';

    if (hasContext) {
      text = messageIntent === 'analyze' ? 'Analyze' :
             messageIntent === 'summarize' ? 'Summarize' :
             messageIntent === 'create' ? 'Create' : 'Send';
    }

    if (modelCount > 1) {
      text = `${text} to 2 Models`;
      icon = '←→';
    }

    return { text, icon, modelCount, hasContext };
  };

  const sendConfig = getSendButtonConfig();

  // Handle model selection (existing logic)
  const handleAskOtherModels = () => setShowModelSelector(true);
  const handleModelSelect = (modelId) => {
    setSecondOpinionModel(availableModels.find(m => m.id === modelId));
    setIsSecondOpinionActive(true);
    setShowModelSelector(false);
  };
  const handleToggleSecondOpinion = () => setIsSecondOpinionActive(!isSecondOpinionActive);
  const handleForgetSecondModel = () => {
    setSecondOpinionModel(null);
    setIsSecondOpinionActive(false);
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || !selectedModel) return;

    const sendConfig = {
      prompt: prompt.trim(),
      primaryModel: selectedModel,
      secondOpinion: isSecondOpinionActive && secondOpinionModel ? {
        model: secondOpinionModel.id,
        active: true
      } : null,
      context: {
        documents: selectedDocuments,
        intent: messageIntent,
        includeHistory,
        contextMode
      }
    };

    onSendMessage(sendConfig);
    setPrompt('');
    setSelectedDocuments([]);
    setMessageIntent('chat');
    setIsManuallyExpanded(false);

    setTimeout(() => {
      adjustTextareaHeight();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    setPrompt(e.target.value);
    setTimeout(adjustTextareaHeight, 0);
  };

  // Handle key events
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Effects
  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt, adjustTextareaHeight]);

  useEffect(() => {
    if (autoModeSwitch && isSecondOpinionActive && secondOpinionModel) {
      if (navigationMode === 'OFF') {
        const newMode = 'CURRENT';
        setNavigationMode(newMode);
        onNavigationModeChange?.(newMode);
      }
    }
  }, [autoModeSwitch, isSecondOpinionActive, secondOpinionModel, navigationMode, onNavigationModeChange]);

  useEffect(() => {
    if (!isLoading && selectedModel && currentThread && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading, selectedModel, currentThread]);

  const otherModels = availableModels.filter(m => m.id !== selectedModel);

  return (
    <form onSubmit={handleSubmit} className={styles.inputForm}>
      <div className={`${styles.promptContainer} ${styles[inputSize]}`}>

        {/* Advanced Features Panel - Shows for medium+ */}
        {(inputSize === 'medium' || inputSize === 'expanded') && (
          <div className={styles.advancedPanel}>

            {/* Intent Selection */}
            <div className={styles.intentSection}>
              <label className={styles.sectionLabel}>Intent:</label>
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => handleIntentChange('chat')}
                  className={`${styles.groupButton} ${styles.leftButton} ${messageIntent === 'chat' ? styles.active : ''}`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => handleIntentChange('analyze')}
                  className={`${styles.groupButton} ${styles.centerButton} ${messageIntent === 'analyze' ? styles.active : ''}`}
                >
                  Analyze
                </button>
                <button
                  type="button"
                  onClick={() => handleIntentChange('summarize')}
                  className={`${styles.groupButton} ${styles.centerButton} ${messageIntent === 'summarize' ? styles.active : ''}`}
                >
                  Summarize
                </button>
                <button
                  type="button"
                  onClick={() => handleIntentChange('create')}
                  className={`${styles.groupButton} ${styles.rightButton} ${messageIntent === 'create' ? styles.active : ''}`}
                >
                  Create
                </button>
              </div>
            </div>

            {/* Document Selection - Shows if documents available */}
            {uploadedDocuments.length > 0 && (
              <div className={styles.documentsSection}>
                <label className={styles.sectionLabel}>
                  Documents ({selectedDocuments.length} selected):
                </label>
                <div className={styles.documentList}>
                  {uploadedDocuments.slice(0, 5).map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => toggleDocument(doc.id)}
                      className={`${styles.documentChip} ${selectedDocuments.includes(doc.id) ? styles.selected : ''}`}
                    >
                      <span className={styles.docIcon}>📄</span>
                      <span className={styles.docName}>{doc.name}</span>
                      {selectedDocuments.includes(doc.id) && <span className={styles.checkmark}>✓</span>}
                    </button>
                  ))}
                  {uploadedDocuments.length > 5 && (
                    <button type="button" className={styles.moreDocsButton}>
                      +{uploadedDocuments.length - 5} more
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full Features Panel - Shows only for expanded */}
        {inputSize === 'expanded' && (
          <div className={styles.fullFeaturesPanel}>

            {/* Context Options */}
            <div className={styles.contextSection}>
              <label className={styles.sectionLabel}>Context:</label>
              <div className={styles.contextControls}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeHistory}
                    onChange={(e) => setIncludeHistory(e.target.checked)}
                  />
                  Include chat history
                </label>
                <select
                  value={contextMode}
                  onChange={(e) => setContextMode(e.target.value)}
                  className={styles.contextSelect}
                >
                  <option value="recent">Recent messages</option>
                  <option value="relevant">Relevant context</option>
                  <option value="all">Full conversation</option>
                </select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActionsSection}>
              <label className={styles.sectionLabel}>Quick Actions:</label>
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={`${styles.groupButton} ${styles.leftButton}`}
                  onClick={() => setPrompt(prev => prev + '\n\nTL;DR: ')}
                >
                  Add TL;DR
                </button>
                <button
                  type="button"
                  className={`${styles.groupButton} ${styles.centerButton}`}
                  onClick={() => setPrompt(prev => prev + '\n\nFollow-up questions:\n1. ')}
                >
                  Add Follow-ups
                </button>
                <button
                  type="button"
                  className={`${styles.groupButton} ${styles.rightButton}`}
                  onClick={() => setPrompt(prev => prev + '\n\nPlease format as:\n- ')}
                >
                  Request Format
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Controls Section */}
        <div className={styles.controlsSection}>
          <div className={styles.leftControls}>
            <div className={styles.buttonGroup}>
              {!secondOpinionModel ? (
                <button
                  type="button"
                  onClick={handleAskOtherModels}
                  className={`${styles.groupButton} ${styles.leftButton}`}
                  disabled={isLoading || otherModels.length === 0}
                >
                  Ask Other Models
                </button>
              ) : (
                <div className={`${styles.groupButton} ${styles.leftButton} ${styles.secondOpinionGroup}`}>
                  <button
                    type="button"
                    className={`${styles.secondOpinionButton} ${!isSecondOpinionActive ? styles.grayed : ''}`}
                    disabled={isLoading}
                  >
                    Second Opinion {secondOpinionModel.id}
                  </button>
                  <label className={styles.toggleContainer}>
                    <input
                      type="checkbox"
                      checked={isSecondOpinionActive}
                      onChange={handleToggleSecondOpinion}
                      className={styles.toggleInput}
                    />
                    <span className={`${styles.toggleSlider} ${isSecondOpinionActive ? styles.active : ''}`}></span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgetSecondModel}
                    className={styles.forgetButton}
                    title="Remove second opinion model"
                  >
                    ×
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={cycleNavigationMode}
                className={`${styles.groupButton} ${styles.centerButton} ${navigationMode !== 'OFF' ? styles.active : ''}`}
                title="Click to cycle navigation modes"
              >
                Mode: {getModeDisplay()}
              </button>

              <button
                type="button"
                onClick={toggleAutoModeSwitch}
                className={`${styles.groupButton} ${styles.rightButton} ${autoModeSwitch ? styles.active : ''}`}
                title="Auto-switch navigation mode"
              >
                Auto
              </button>
            </div>
          </div>

          <div className={styles.rightControls}>
            {/* Size Toggle Button */}
            <button
              type="button"
              onClick={toggleExpansion}
              className={`${styles.sizeToggle} ${isManuallyExpanded ? styles.expanded : ''}`}
              title="Toggle input size"
            >
              {inputSize === 'compact' ? '⤢' : inputSize === 'medium' ? '⤡' : '⤢'}
            </button>

            <div className={styles.actionButtonGroup}>
              <button
                type="submit"
                disabled={isLoading || !prompt.trim() || !selectedModel || !currentThread}
                className={`${styles.sendButton} ${sendConfig.hasContext ? styles.enhanced : ''}`}
                title={`${sendConfig.text} to ${sendConfig.modelCount} model${sendConfig.modelCount > 1 ? 's' : ''}`}
              >
                <span className={styles.sendIcon}>{sendConfig.icon}</span>
                <span className={styles.sendText}>{sendConfig.text}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Text Input Section */}
        <div className={styles.inputSection}>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              inputSize === 'compact'
                ? (placeholder || "Type your message...")
                : "Compose your message... (Enter to send, Shift+Enter for new line)"
            }
            className={styles.promptInput}
            disabled={isLoading || !selectedModel || !currentThread}
            aria-label="Prompt"
            rows={1}
          />

          {/* Input Size Indicator */}
          <div className={styles.inputIndicator}>
            <span className={styles.sizeIndicator}>{inputSize}</span>
            {selectedDocuments.length > 0 && (
              <span className={styles.contextIndicator}>+{selectedDocuments.length} docs</span>
            )}
          </div>
        </div>
      </div>

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div className={styles.modalOverlay} onClick={() => setShowModelSelector(false)}>
          <div className={styles.modelSelectorModal} onClick={e => e.stopPropagation()}>
            <h3>Select Second Opinion Model</h3>
            <div className={styles.modelList}>
              {otherModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={styles.modelOption}
                >
                  <span className={styles.modelName}>{model.id}</span>
                  <span className={styles.modelProvider}>({model.provider})</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModelSelector(false)}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export default PromptInput;