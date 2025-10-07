// PromptInput.js
import React, { useState, useRef, useEffect } from 'react';
import styles from './ChatInterface.module.css';

function PromptInput({
  onSendMessage,
  isLoading,
  selectedModel,
  currentThread,
  placeholder
}) {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || !selectedModel) return;
    onSendMessage(prompt);
    setPrompt('');

    // Refocus the input after sending
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Auto-focus when component becomes enabled
  useEffect(() => {
    if (!isLoading && selectedModel && currentThread && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, selectedModel, currentThread]);

  return (
    <form onSubmit={handleSubmit} className={styles.inputForm}>
      <input
        ref={inputRef}
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        className={styles.promptInput}
        disabled={isLoading || !selectedModel || !currentThread}
        aria-label="Prompt"
      />
      <button
        type="submit"
        disabled={isLoading || !prompt.trim() || !selectedModel || !currentThread}
        className={styles.sendButton}
      >
        Send
      </button>
    </form>
  );
}

export default PromptInput;