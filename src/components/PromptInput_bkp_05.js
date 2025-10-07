// PromptInput.js
import React, { useState, useRef, useEffect } from 'react';
import styles from './ChatInterface.module.css';

function PromptInput({
  onSendMessage,
  isLoading,
  selectedModel,
  currentThread,
  placeholder,
  availableModels,
  onNavigationModeChange // Add callback prop
}) {
  const [prompt, setPrompt] = useState('');
  const [secondOpinionModel, setSecondOpinionModel] = useState(null);
  const [isSecondOpinionActive, setIsSecondOpinionActive] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Navigation mode state
  const [navigationMode, setNavigationMode] = useState('OFF'); // 'OFF' | 'CURRENT' | 'TIMELINE'
  const [autoModeSwitch, setAutoModeSwitch] = useState(true);

  const inputRef = useRef(null);

  // Navigation mode functions
  const cycleNavigationMode = () => {
    const modes = ['OFF', 'CURRENT', 'TIMELINE'];
    const currentIndex = modes.indexOf(navigationMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    setNavigationMode(newMode);
    onNavigationModeChange?.(newMode); // Notify parent
  };

  const toggleAutoModeSwitch = () => {
    setAutoModeSwitch(!autoModeSwitch);
  };

  const getModeDisplay = () => {
    switch (navigationMode) {
      case 'CURRENT':
        return 'Current ↕';
      case 'TIMELINE':
        return 'Timeline ←→';
      case 'OFF':
      default:
        return 'Navigate OFF';
    }
  };

  // Calculate send button state based on configuration
  const getSendButtonConfig = () => {
    if (!isSecondOpinionActive || !secondOpinionModel) {
      // Single model
      return {
        text: 'Send',
        icon: '↑',
        modelCount: 1
      };
    } else {
      // Two models (primary + second opinion)
      return {
        text: 'Send to 2 Models',
        icon: '←→',
        modelCount: 2
      };
    }
  };

  const sendConfig = getSendButtonConfig();

  const handleAskOtherModels = () => {
    setShowModelSelector(true);
  };

  const handleModelSelect = (modelId) => {
    setSecondOpinionModel(availableModels.find(m => m.id === modelId));
    setIsSecondOpinionActive(true);
    setShowModelSelector(false);
  };

  const handleToggleSecondOpinion = () => {
    setIsSecondOpinionActive(!isSecondOpinionActive);
  };

  const handleForgetSecondModel = () => {
    setSecondOpinionModel(null);
    setIsSecondOpinionActive(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || !selectedModel) return;

    // Prepare sending configuration
    const sendConfig = {
      prompt: prompt.trim(),
      primaryModel: selectedModel,
      secondOpinion: isSecondOpinionActive && secondOpinionModel ? {
        model: secondOpinionModel.id,
        active: true
      } : null
    };

    onSendMessage(sendConfig);
    setPrompt('');

    // Refocus the input after sending
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Auto-mode switching effect
  useEffect(() => {
    if (autoModeSwitch && isSecondOpinionActive && secondOpinionModel) {
      // Auto-switch to CURRENT mode when dual responses are active
      if (navigationMode === 'OFF') {
        const newMode = 'CURRENT';
        setNavigationMode(newMode);
        onNavigationModeChange?.(newMode); // Notify parent
      }
    }
  }, [autoModeSwitch, isSecondOpinionActive, secondOpinionModel, navigationMode, onNavigationModeChange]);

  // Auto-focus when component becomes enabled
  useEffect(() => {
    if (!isLoading && selectedModel && currentThread && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, selectedModel, currentThread]);

  // Filter available models to exclude the currently selected one
  const otherModels = availableModels.filter(m => m.id !== selectedModel);

  return (
    <form onSubmit={handleSubmit} className={styles.inputForm}>
      <div className={styles.promptContainer}>
        {/* Dashboard-style Controls Section */}
        <div className={styles.controlsSection}>
          <div className={styles.leftControls}>
            {/* Button Group for Configuration & Navigation */}
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

              {/* Mode Button */}
              <button
                type="button"
                onClick={cycleNavigationMode}
                className={`${styles.groupButton} ${styles.centerButton} ${navigationMode !== 'OFF' ? styles.active : ''}`}
                title="Click to cycle navigation modes"
              >
                Mode: {getModeDisplay()}
              </button>

              {/* Auto Button */}
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
            {/* Action Button Group */}
            <div className={styles.actionButtonGroup}>
              <button
                type="submit"
                disabled={isLoading || !prompt.trim() || !selectedModel || !currentThread}
                className={`${styles.sendButton} ${styles.primary}`}
                title={`Send to ${sendConfig.modelCount} model${sendConfig.modelCount > 1 ? 's' : ''}`}
              >
                <span className={styles.sendIcon}>{sendConfig.icon}</span>
                <span className={styles.sendText}>{sendConfig.text}</span>
              </button>

              {/* Future action buttons will go here */}
              {/* <button className={styles.actionButton}>Save Draft</button> */}
              {/* <button className={styles.actionButton}>Schedule</button> */}
            </div>
          </div>
        </div>

        {/* Text Input Section (below controls) */}
        <div className={styles.inputSection}>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className={styles.promptInput}
            disabled={isLoading || !selectedModel || !currentThread}
            aria-label="Prompt"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
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