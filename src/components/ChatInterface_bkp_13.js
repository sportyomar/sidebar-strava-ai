// ChatInterface.js
import React, { useState, useEffect, useMemo } from 'react';
import ModelConfigForm from './ModelConfigForm';
import ThreadSelector from './ThreadSelector';
import PromptInput from './PromptInput';
import ChatMessage from './ChatMessage'; // Import our new component
import modelConfigStyles from './ModelConfigForm.module.css';
import styles from './ChatInterface.module.css';
import ProfileNavBar from './ProfileNavBar';
import { getCurrentUser } from '../utils/getCurrentUser';
import PanelHeader from './PanelHeader';
import ModelDropdown from './ModelDropdown';
import HeaderButtonGroup from './HeaderButtonGroup';
import ReaderHub from "./ReaderHub";
import ThreadTools from './ThreadTools';
import PanelFooter from './PanelFooter'
import FileUploader from './FileUploader';
import Pane from './Pane';
import { useChatMessage } from './useChatMessage';

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
  navigationMode,
  setNavigationMode,
  onModelSelect,
  selectedWorkspace,
  uploadedDocuments,
  setUploadedDocuments,
  activePaneType,
  onPaneToggle,
  resolvedWorkspaceId
}) {
  const [focusedResponseIndex, setFocusedResponseIndex] = useState(0);

  const modelInfo = useMemo(
    () => availableModels.find((m) => m.id === selectedModel),
    [availableModels, selectedModel]
  );

  // Find the most recent response group (responses with same timestamp/prompt)
  const getMostRecentResponseGroup = () => {
    if (messages.length === 0) return [];

    // Find the last user prompt (most recent unique prompt)
    const uniquePrompts = [...new Set(messages.map(msg => msg.prompt))];
    const lastPrompt = uniquePrompts[uniquePrompts.length - 1];

    // Get all responses to that prompt
    const responsesToLastPrompt = messages.filter(msg => msg.prompt === lastPrompt);
    return responsesToLastPrompt;
  };

  const [activeReader, setActiveReader] = useState(null);
  const [showReader, setShowReader] = useState(false);

  const recentResponseGroup = getMostRecentResponseGroup();
  const hasMultipleRecentResponses = recentResponseGroup.length > 1;

  const handlePreviewAttachment = (item) => {
    setActiveReader(item);
    setShowReader(true);
  };

  // Keyboard navigation for Current Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log('[DEBUG] Key pressed:', e.key);
      // Only handle navigation when in Current Mode and input is not focused
      console.log('[DEBUG] KeyDown handler active check:', {
        navigationMode,
        hasMultipleRecentResponses,
        activeTag: document.activeElement?.tagName
      });
      if (navigationMode !== 'CURRENT' || !hasMultipleRecentResponses) return;
      if (document.activeElement?.tagName === 'INPUT') {
        console.log('[DEBUG] Ignoring key because input is focused');
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedResponseIndex(prev =>
            prev > 0 ? prev - 1 : recentResponseGroup.length - 1
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedResponseIndex(prev =>
            prev < recentResponseGroup.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Enter':
          e.preventDefault();
          // TODO: Handle response selection
          console.log('Selected response:', recentResponseGroup[focusedResponseIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          // Return focus to input
          const input = document.querySelector('input[aria-label="Prompt"]');
          if (input) input.focus();
          break;
      }
    };

    if (navigationMode === 'CURRENT') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [navigationMode, hasMultipleRecentResponses, recentResponseGroup, focusedResponseIndex]);

  // Reset focus when navigation mode changes or new messages arrive
  useEffect(() => {
    setFocusedResponseIndex(0);
  }, [navigationMode, messages.length]);

  const placeholder = !selectedModel
    ? 'Select a model to begin'
    : !currentThread
      ? 'Create or select a thread to chat'
      : 'Enter your prompt here...';

  return (
    <div className={styles.chatArea}>
      <PanelHeader
        // title={currentThread ? `Thread: ${currentThread.title}` : "No Thread Selected"}
        // title={selectedWorkspace ? `Workspace: ${selectedWorkspace.name}` : "No Workspace Selected"}
        rightSlot={
          <ThreadTools
            currentThread={currentThread}
            onThreadSelect={onThreadSelect}
            modelId={selectedModel}
            fetchWithAuth={fetchWithAuth}
            API_BASE_URL={API_BASE_URL}
            onFilesUploaded={(newFiles) => {
              setUploadedDocuments(prev => [...prev, ...newFiles]);
            }}
            uploadedFiles={uploadedDocuments}
            onRemoveFile={(fileId) => {
              setUploadedDocuments(prev => prev.filter(f => f.id !== fileId));
            }}
            activePaneType={activePaneType}
            onPaneToggle={onPaneToggle}
          />
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
          messages.map((msg, idx) => {
            // Check if this message is part of the recent response group and should be highlighted
            const isInRecentGroup = recentResponseGroup.some(recentMsg =>
              recentMsg.timestamp === msg.timestamp && recentMsg.model === msg.model
            );
            const recentGroupIndex = recentResponseGroup.findIndex(recentMsg =>
              recentMsg.timestamp === msg.timestamp && recentMsg.model === msg.model
            );
            const isFocused = navigationMode === 'CURRENT' &&
                            isInRecentGroup &&
                            recentGroupIndex === focusedResponseIndex;

            return (
              <ChatMessage
                key={`${msg.timestamp}-${idx}`}
                message={msg}
                isFocused={isFocused}
                navigationMode={navigationMode}
                resolvedWorkspaceId={resolvedWorkspaceId}
              />
            );
          })
        )}
        {isLoading && selectedModel && (
          <div className={styles.message}>
            <div className={styles.messageBot}>
              <strong>{selectedModel}:</strong> <em>Generating response...</em>
            </div>
          </div>
        )}
        {showReader && activeReader && (
          <ReaderHub item={activeReader} onClose={() => setShowReader(false)} />
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
        onNavigationModeChange={setNavigationMode}
        onPreviewAttachment={handlePreviewAttachment}
        uploadedDocuments={uploadedDocuments}
      />
    </div>
  );
}

export default function ChatInterface({
  workspaceId,
  API_BASE_URL,
  fetchWithAuth,
  selectedWorkspace,
}) {
  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState(workspaceId ?? null);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [navigationMode, setNavigationMode] = useState('OFF');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [activePaneType, setActivePaneType] = useState(null); // 'threads', 'files', or null
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
          input_cap: m.input_cap,
          output_cap: m.output_cap,
          isDefault: !!m.isDefault,
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

          // ADD DEBUG LOGGING HERE
          console.log('=== FRONTEND API RESPONSE DEBUG ===');
          console.log('Raw API response:', threadMessages);

          // Check the specific message
          const systemMessage = threadMessages.find(msg => msg.response?.includes('Basic Components'));
          if (systemMessage) {
            console.log('System message content:', systemMessage.response.substring(0, 300));

            // Check for numbering patterns
            if (systemMessage.response.includes('1. Basic Components')) {
              console.log('✓ Frontend received: 1. Basic Components');
            }
            if (systemMessage.response.includes('2. Types of Systems')) {
              console.log('✓ Frontend received: 2. Types of Systems');
            }
            if (systemMessage.response.includes('8. Types of Systems')) {
              console.log('❌ Frontend received: 8. Types of Systems');
            }
          }
          console.log('=== END FRONTEND DEBUG ===');

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
  const { sendMessage } = useChatMessage(
    currentThread,
    availableModels,
    fetchWithAuth,
    API_BASE_URL,
    resolvedWorkspaceId,
    setMessages,
    setCurrentThread,
    setIsLoading
  );

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
            selectedWorkspace={selectedWorkspace}
          />
        </div>

        {/* Main Chat Area with Thread Support */}
        <ChatArea
          selectedModel={selectedModel}
          messages={messages}
          // onSendMessage={handleSendMessage}
          onSendMessage={sendMessage}
          isLoading={isLoading}
          availableModels={availableModels}
          currentUser={currentUser}
          currentThread={currentThread}
          onThreadSelect={handleThreadSelect}
          fetchWithAuth={fetchWithAuth}
          API_BASE_URL={API_BASE_URL}
          navigationMode={navigationMode}
          setNavigationMode={(mode) => {
            console.log('[DEBUG] Navigation mode set to:', mode);
            setNavigationMode(mode);
          }}
          onModelSelect={setSelectedModel}
          selectedWorkspace={selectedWorkspace}
          uploadedDocuments={uploadedDocuments}
          setUploadedDocuments={setUploadedDocuments}
          activePaneType={activePaneType}
          onPaneToggle={(paneType) => {
            setActivePaneType(paneType);
          }}
          resolvedWorkspaceId={resolvedWorkspaceId}
        />
        <Pane
          activePaneType={activePaneType}
          onClose={() => setActivePaneType(null)}
          currentThread={currentThread}
          onThreadSelect={handleThreadSelect}
          modelId={selectedModel}
          fetchWithAuth={fetchWithAuth}
          API_BASE_URL={API_BASE_URL}
          uploadedFiles={uploadedDocuments}
          onFilesUploaded={(newFiles) => {
            setUploadedDocuments(prev => [...prev, ...newFiles]);
          }}
          onRemoveFile={(fileId) => {
            setUploadedDocuments(prev => prev.filter(f => f.id !== fileId));
          }}
        />
      </div>
    </div>
  );
}