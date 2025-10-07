// ChatInterface.js
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ModelConfigForm from './ModelConfigForm';
import ThreadSelector from './ThreadSelector';
import PromptInput from './PromptInput'; // Add this import
import modelConfigStyles from './ModelConfigForm.module.css';
import styles from './ChatInterface.module.css';
import ProfileNavBar from './ProfileNavBar';
import { getCurrentUser } from '../utils/getCurrentUser';
import PanelHeader from './PanelHeader';
import PanelFooter from './PanelFooter'

function ChatArea({
  selectedModel,
  messages,
  onSendMessage,
  isLoading,
  availableModels,
  currentUser,
  currentThread,
  onThreadSelect,
  fetchWithAuth,
  API_BASE_URL,
}) {
  const modelInfo = useMemo(
    () => availableModels.find((m) => m.id === selectedModel),
    [availableModels, selectedModel]
  );

  const placeholder = !selectedModel
    ? 'Select a model to begin'
    : !currentThread
      ? 'Create or select a thread to chat'
      : 'Enter your prompt here...';

  return (
    <div className={styles.chatArea}>
      <PanelHeader
        title={
          <div className={styles.headerWithThread}>
            <ThreadSelector
              currentThread={currentThread}
              onThreadSelect={onThreadSelect}
              modelId={selectedModel}
              className={styles.threadSelectorInHeader}
              fetchWithAuth={fetchWithAuth}
              API_BASE_URL={API_BASE_URL}
            />
            {modelInfo && <span className={styles.modelProvider}>{modelInfo.id} ({modelInfo.provider})</span>}
          </div>
        }
      />

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {currentThread
                ? 'Start a conversation in this thread'
                : 'Create or select a thread to get started'
              }
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={`${msg.timestamp}-${idx}`} className={styles.message}>
              <div className={styles.messageUser}>
                <strong>You:</strong> {msg.prompt}
              </div>
              <div className={styles.messageBot}>
                <strong>{msg.model}:</strong>
                <div className={styles.messageContent}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Convert all headings to simple bold text
                      h1: ({children}) => <strong className={styles.messageBold}>{children}</strong>,
                      h2: ({children}) => <strong className={styles.messageBold}>{children}</strong>,
                      h3: ({children}) => <strong className={styles.messageBold}>{children}</strong>,
                      h4: ({children}) => <strong className={styles.messageBold}>{children}</strong>,
                      h5: ({children}) => <strong className={styles.messageBold}>{children}</strong>,
                      h6: ({children}) => <strong className={styles.messageBold}>{children}</strong>,
                      // Standard formatting
                      p: ({children}) => <p className={styles.messageParagraph}>{children}</p>,
                      strong: ({children}) => <strong className={styles.messageBold}>{children}</strong>,
                      ul: ({children}) => <ul className={styles.messageList}>{children}</ul>,
                      ol: ({children}) => <ol className={styles.messageList}>{children}</ol>,
                      li: ({children}) => <li className={styles.messageListItem}>{children}</li>,
                      // Tables
                      table: ({children}) => <table className={styles.messageTable}>{children}</table>,
                      thead: ({children}) => <thead className={styles.messageTableHead}>{children}</thead>,
                      tbody: ({children}) => <tbody className={styles.messageTableBody}>{children}</tbody>,
                      tr: ({children}) => <tr className={styles.messageTableRow}>{children}</tr>,
                      th: ({children}) => <th className={styles.messageTableHeader}>{children}</th>,
                      td: ({children}) => <td className={styles.messageTableCell}>{children}</td>,
                      // Remove blockquotes - render as regular paragraphs
                      blockquote: ({children}) => <div className={styles.messageParagraph}>{children}</div>,
                      // Code blocks and inline code
                      code: ({children, className}) => {
                        const isInline = !className;
                        return isInline ?
                          <code className={styles.messageInlineCode}>{children}</code> :
                          <pre className={styles.messageCodeBlock}><code>{children}</code></pre>;
                      },
                      pre: ({children}) => <div className={styles.messageCodeBlock}>{children}</div>,
                    }}
                  >
                    {msg.response}
                  </ReactMarkdown>
                </div>
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

      {/* Input using new PromptInput component */}
      <PromptInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        selectedModel={selectedModel}
        currentThread={currentThread}
        placeholder={placeholder}
        availableModels={availableModels}
      />
    </div>
  );
}

export default function ChatInterface({
  workspaceId,
  API_BASE_URL,
  fetchWithAuth,
}) {
  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState(workspaceId ?? null);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  // Thread management state
  const [currentThread, setCurrentThread] = useState(null);

  // Keep internal workspaceId synced with prop (if parent changes it)
  useEffect(() => {
    if (workspaceId && workspaceId !== resolvedWorkspaceId) {
      setResolvedWorkspaceId(workspaceId);
      // reset model list when workspace changes
      setAvailableModels([]);
      setSelectedModel('');
      setMessages([]);
      setCurrentThread(null);
    }
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // If no workspaceId provided, bootstrap from server (active → list default → first)
  useEffect(() => {
    if (resolvedWorkspaceId || !API_BASE_URL || !fetchWithAuth) return;

    let cancelled = false;
    setBootstrapping(true);

    const pickWorkspaceFromList = (list) => {
      const arr = Array.isArray(list) ? list : (list?.workspaces || []);
      if (!arr.length) return null;
      const byDefault = arr.find(w => w.is_default || w.isDefault);
      return (byDefault?.id ?? arr[0].id) ?? null;
    };

    const bootstrap = async () => {
      try {
        const activeRes = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces/active`);
        if (!cancelled && activeRes.ok) {
          const active = await activeRes.json().catch(() => ({}));
          const id = active?.id ?? active?.workspace_id ?? null;
          if (id != null) {
            setResolvedWorkspaceId(id);
            localStorage.setItem('selectedWorkspaceId', String(id));
            return;
          }
        }

        const listRes = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces`);
        if (!cancelled && listRes.ok) {
          const list = await listRes.json().catch(() => ([]));
          const id = pickWorkspaceFromList(list);
          if (id != null) {
            setResolvedWorkspaceId(id);
            localStorage.setItem('selectedWorkspaceId', String(id));
          }
        }
      } catch {
        // ignore; UI shows "select a workspace" state
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    bootstrap();
    return () => { cancelled = true; };
  }, [resolvedWorkspaceId, API_BASE_URL, fetchWithAuth]);

  // Load enabled models from the LLM blueprint
  useEffect(() => {
    const loadModels = async () => {
      if (!resolvedWorkspaceId || !API_BASE_URL || !fetchWithAuth) return;

      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/workspaces/${resolvedWorkspaceId}/llms`);
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
  }, [resolvedWorkspaceId, API_BASE_URL, fetchWithAuth]);

  // Load thread messages when thread changes
  useEffect(() => {
    const loadThreadMessages = async () => {
      if (!currentThread) {
        setMessages([]);
        return;
      }

      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/threads/${currentThread.id}/messages`);
        if (response.ok) {
          const threadMessages = await response.json();
          setMessages(threadMessages);
        }
      } catch (error) {
        console.error('Failed to load thread messages:', error);
        setMessages([]);
      }
    };

    loadThreadMessages();
  }, [currentThread, API_BASE_URL, fetchWithAuth]);

  // Handle thread selection
  const handleThreadSelect = (thread) => {
    setCurrentThread(thread);
    // Messages will be loaded by the useEffect above
  };

  // Send chat via the Flask route and save to thread
  const handleSendMessage = async (prompt) => {
    if (!currentThread) {
      console.error('No thread selected');
      return;
    }

    setIsLoading(true);
    const selected = availableModels.find((m) => m.id === selectedModel);

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/threads/${resolvedWorkspaceId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          threadId: currentThread.id, // Include thread ID
          // Pass current effective config so the chat call mirrors LLM screen behavior.
          settingsOverride: {
            ...selected?.config,
            temperature: typeof selected?.config?.temperature === 'string'
              ? parseFloat(selected.config.temperature)
              : selected?.config?.temperature,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.provider_error || data.error || `Chat failed (${res.status})`);
      }

      const totalTokens =
        (data.usage && (data.usage.total_tokens ||
          (data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0))) || undefined;

      const newMessage = {
        prompt,
        response: data.response,
        model: data.model,
        timestamp: new Date().toISOString(),
        metadata: {
          tokens_used: totalTokens,
          latency_seconds: typeof data.latency_ms === 'number' ? data.latency_ms / 1000 : undefined,
          provider: selected?.provider,
        },
      };

      setMessages((prev) => [...prev, newMessage]);

      // Update thread's updated timestamp
      try {
        const tRes = await fetchWithAuth(`${API_BASE_URL}/api/threads/${currentThread.id}`);
        if (tRes.ok) {
          const fresh = await tRes.json();
          setCurrentThread(fresh);
        }
      } catch (e) {
        console.error('Failed to refresh thread', e);
        // Fallback: just update timestamp
        setCurrentThread(prev => ({
          ...prev,
          updatedAt: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        prompt,
        response: `Error: ${error.message}`,
        model: selectedModel || 'unknown',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Graceful state while waiting for server default
  if (!resolvedWorkspaceId) {
    return (
      <div className={styles.chatInterface}>
        <ProfileNavBar onBackToApp={() => {}} userProfile={currentUser} />
        <div className={styles.chatContent}>
          <div style={{ padding: 24, color: '#6b7280' }}>
            {bootstrapping
              ? 'Loading your workspace…'
              : <>Select a workspace in <strong>Account → Workspaces</strong> (or wait for the server default) to begin.</>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatInterface} style={{ '--header-height': '64px' }}>
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

        {/* Main Chat Area with Thread Support */}
        <ChatArea
          selectedModel={selectedModel}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          availableModels={availableModels}
          currentUser={currentUser}
          currentThread={currentThread}
          onThreadSelect={handleThreadSelect}
          fetchWithAuth={fetchWithAuth}
          API_BASE_URL={API_BASE_URL}
        />
      </div>
    </div>
  );
}