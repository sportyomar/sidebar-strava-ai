import React, { useState, useEffect } from 'react';
import ModelConfigForm from './ModelConfigForm';
import modelConfigStyles from './ModelConfigForm.module.css';
import styles from './ChatInterface.module.css';
import ProfileNavBar from './ProfileNavBar';

// Main Chat Area
const ChatArea = ({ selectedModel, messages, onSendMessage, isLoading, availableModels }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSendMessage(prompt);
    setPrompt('');
  };

  const modelInfo = availableModels.find(m => m.id === selectedModel);

  return (
    <div className={styles.chatArea}>
      {/* Model Header */}
      <div className={styles.chatHeader}>
        <div className={styles.modelInfo}>
          <span className={styles.modelName}>{selectedModel || 'Select a model'}</span>
          {modelInfo && (
            <span className={styles.modelProvider}>{modelInfo.provider}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Enter a prompt to get started</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={styles.message}>
              <div className={styles.messageUser}>
                <strong>You:</strong> {msg.prompt}
              </div>
              <div className={styles.messageBot}>
                <strong>{msg.model}:</strong> {msg.response}
                {msg.metadata && (
                  <div className={styles.messageMetadata}>
                    <span>Tokens: {msg.metadata.tokens_used}</span>
                    <span>Cost: ${msg.metadata.cost?.toFixed(4)}</span>
                    <span>Latency: {msg.metadata.latency_seconds?.toFixed(2)}s</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className={styles.message}>
            <div className={styles.messageBot}>
              <strong>{selectedModel}:</strong> <em>Generating response...</em>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className={styles.promptInput}
          disabled={isLoading || !selectedModel}
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim() || !selectedModel}
          className={styles.sendButton}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default function ChatInterface() {
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [showProfile, setShowProfile] = useState(false);

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('http://localhost:5002/models');
        if (response.ok) {
          const models = await response.json();
          setAvailableModels(models);
          if (models.length > 0 && !selectedModel) {
            setSelectedModel(models[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();
  }, [selectedModel]);

  const handleShowProfile = () => {
    setShowProfile(true);
  };

  const handleBackToChat = () => {
    setShowProfile(false);
  };
  const handleSendMessage = async (prompt) => {
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5002/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server Error: ${response.status}`);
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        prompt: data.prompt,
        response: data.response,
        model: data.model,
        timestamp: new Date().toISOString(),
        metadata: {
          tokens_used: data.tokens_used,
          cost: data.cost,
          latency_seconds: data.latency_seconds,
          provider: data.provider
        }
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        prompt,
        response: `Error: ${error.message}`,
        model: selectedModel,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatInterface}>
       {/* Profile Navigation Bar */}
      <ProfileNavBar onBackToApp={handleBackToChat} />

      {/* Main Chat Content */}
      <div className={styles.chatContent}>
        {/* Sidebar with ModelConfig */}
        <div className={modelConfigStyles.layoutTools}>
          <ModelConfigForm
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
            availableModels={availableModels}
          />
        </div>

        {/* Main Chat Area */}
        <ChatArea
          selectedModel={selectedModel}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          availableModels={availableModels}
        />
      </div>
    </div>
  );
}