// ChatInterface.js
import React, { useState, useEffect, useMemo } from 'react';
import ModelConfigForm from './ModelConfigForm';
import modelConfigStyles from './ModelConfigForm.module.css';
import styles from './ChatInterface.module.css';
import ProfileNavBar from './ProfileNavBar';
import { getCurrentUser } from '../utils/getCurrentUser';

/**
 * ChatInterface wired to the LLM Flask blueprint:
 * - Loads enabled models from GET /api/workspaces/:workspaceId/llms
 * - Sends messages to POST /api/workspaces/:workspaceId/chat
 *
 * Props:
 *  - workspaceId: number (required)
 *  - API_BASE_URL: string (required)
 *  - fetchWithAuth: function (input, init) => fetch (required; must add Authorization header)
 */
function ChatArea({
  selectedModel,
  messages,
  onSendMessage,
  isLoading,
  availableModels,
  currentUser,
}) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || !selectedModel) return;
    onSendMessage(prompt);
    setPrompt('');
  };

  const modelInfo = useMemo(
    () => availableModels.find((m) => m.id === selectedModel),
    [availableModels, selectedModel]
  );

  return (
    <div className={styles.chatArea}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.modelInfo}>
          <span className={styles.modelName}>
            {selectedModel || `Select a model from ${currentUser?.display_name || 'your'} models`}
          </span>
          {modelInfo && <span className={styles.modelProvider}>{modelInfo.provider}</span>}
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
            <div key={`${msg.timestamp}-${idx}`} className={styles.message}>
              <div className={styles.messageUser}>
                <strong>You:</strong> {msg.prompt}
              </div>
              <div className={styles.messageBot}>
                <strong>{msg.model}:</strong> {msg.response}
                {msg.metadata && (
                  <div className={styles.messageMetadata}>
                    {typeof msg.metadata.tokens_used === 'number' && (
                      <span>Tokens: {msg.metadata.tokens_used}</span>
                    )}
                    {typeof msg.metadata.cost === 'number' && (
                      <span>Cost: ${msg.metadata.cost.toFixed(4)}</span>
                    )}
                    {typeof msg.metadata.latency_seconds === 'number' && (
                      <span>Latency: {msg.metadata.latency_seconds.toFixed(2)}s</span>
                    )}
                    {msg.metadata.provider && <span>Provider: {msg.metadata.provider}</span>}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && selectedModel && (
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
          placeholder={selectedModel ? 'Enter your prompt here...' : 'Select a model to begin'}
          className={styles.promptInput}
          disabled={isLoading || !selectedModel}
          aria-label="Prompt"
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
}

export default function ChatInterface({
  workspaceId,
  API_BASE_URL,
  fetchWithAuth,
}) {
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Load enabled models from the LLM blueprint
  useEffect(() => {
    const loadModels = async () => {
      if (!workspaceId || !API_BASE_URL || !fetchWithAuth) return;

      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/workspaces/${workspaceId}/llms`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to load models (${res.status})`);
        }

        const raw = await res.json();
        // Normalize and keep only enabled models
        const enabled = (Array.isArray(raw) ? raw : raw.models || [])
          .filter((m) => m.enabled)
          .map((m) => ({
            id: m.modelId,
            provider: m.modelInfo?.provider ?? 'unknown',
            cap: m.modelInfo?.cap ?? 4000,
            isDefault: !!m.isDefault,
            // effectiveConfig already clamps to cap and merges defaults + workspace overrides
            config: m.effectiveConfig ?? {},
          }));

        setAvailableModels(enabled);

        // Auto-select default or first
        if (!selectedModel && enabled.length) {
          setSelectedModel(enabled.find((x) => x.isDefault)?.id ?? enabled[0].id);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        setAvailableModels([]);
      }
    };

    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, API_BASE_URL, fetchWithAuth]);

  // Send chat via the new Flask route
  const handleSendMessage = async (prompt) => {
    setIsLoading(true);
    const selected = availableModels.find((m) => m.id === selectedModel);

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/workspaces/${workspaceId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          // Pass current effective config so the chat call mirrors LLM screen behavior.
          settingsOverride: selected?.config || {},
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.provider_error || data.error || `Chat failed (${res.status})`);
      }

      const totalTokens =
        (data.usage && (data.usage.total_tokens ||
          (data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0))) || undefined;

      setMessages((prev) => [
        ...prev,
        {
          prompt,
          response: data.response,
          model: data.model,
          timestamp: new Date().toISOString(),
          metadata: {
            tokens_used: totalTokens,
            latency_seconds: typeof data.latency_ms === 'number' ? data.latency_ms / 1000 : undefined,
            provider: selected?.provider,
            // cost: (optional) compute on server if you maintain a pricing table
          },
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          prompt,
          response: `Error: ${error.message}`,
          model: selectedModel || 'unknown',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatInterface}>
      <ProfileNavBar onBackToApp={() => {}} userProfile={currentUser} />

      <div className={styles.chatContent}>
        {/* Sidebar with Model selection */}
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
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
