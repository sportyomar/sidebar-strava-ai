// components/Pane.jsx
import React, { useState, useEffect } from 'react';
import PanelHeader from './PanelHeader';
import PanelFooter from './PanelFooter';
import styles from './Pane.module.css';

export default function Pane({
  activePaneType,
  onClose,
  currentThread,
  onThreadSelect,
  modelId,
  fetchWithAuth,
  API_BASE_URL,
  uploadedFiles = [],
  onFilesUploaded,
  onRemoveFile
}) {
  // ✅ Hooks must be called at the top level, before any return
  const [showNewThreadInput, setShowNewThreadInput] = useState(false);
  const [triggerDeleteSelected, setTriggerDeleteSelected] = useState(false);

  // ❌ This must come AFTER hook calls
  if (!activePaneType) return null;

  const closeButton = (
    <button className={styles.closeButton} onClick={onClose} aria-label="Close pane">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <circle cx="12" cy="12" r="10" fill="#6b7280" stroke="#4b5563" strokeWidth="1"/>
        <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
  );

  return (
    <div className={styles.pane}>
      <PanelHeader
        title={activePaneType === 'threads' ? 'Threads' : 'Files'}
        rightSlot={closeButton}
        background="light"
      />

      <div className={styles.paneContent}>
        {activePaneType === 'threads' ? (
          <ThreadsContent
            currentThread={currentThread}
            onThreadSelect={onThreadSelect}
            modelId={modelId}
            fetchWithAuth={fetchWithAuth}
            API_BASE_URL={API_BASE_URL}
            showNewThreadInput={showNewThreadInput}
            setShowNewThreadInput={setShowNewThreadInput}
            triggerDeleteSelected={triggerDeleteSelected}
            setTriggerDeleteSelected={setTriggerDeleteSelected}
          />
        ) : (
          <FilesContent
            uploadedFiles={uploadedFiles}
            onFilesUploaded={onFilesUploaded}
            onRemoveFile={onRemoveFile}
          />
        )}
      </div>

      {activePaneType === 'threads' && (
          <PanelFooter
            leftSlot={
              <div className={styles.buttonGroup}>
                <button
                  className={`${styles.groupedBtn} ${styles.groupedLeft}`}
                  onClick={() => setShowNewThreadInput(true)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M2 12h20"/>
                  </svg>
                  New Thread
                </button>

                <button
                  className={`${styles.groupedBtn} ${styles.groupedRight}`}
                  onClick={() => setTriggerDeleteSelected(true)}
                  disabled={!currentThread}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                  </svg>
                  Delete Selected
                </button>
              </div>
            }
          />
      )}
    </div>
  );
}

function ThreadsContent({
  currentThread,
  onThreadSelect,
  modelId,
  fetchWithAuth,
  API_BASE_URL,
  showNewThreadInput,
  setShowNewThreadInput,
  triggerDeleteSelected,
  setTriggerDeleteSelected
}) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  // NEW: Edit state
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (triggerDeleteSelected && currentThread) {
      setDeleteConfirm(currentThread.id);
      setTriggerDeleteSelected(false);
    }
  }, [triggerDeleteSelected, currentThread]);

  const fetchThreads = async () => {
    if (!fetchWithAuth || !API_BASE_URL) return;
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_BASE_URL}/api/threads`);
      if (response.ok) {
        const data = await response.json();
        setThreads(data);
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newThreadTitle.trim() || !fetchWithAuth || !API_BASE_URL) return;
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newThreadTitle.trim(), modelId })
      });
      if (response.ok) {
        const newThread = await response.json();
        setThreads(prev => [newThread, ...prev]);
        onThreadSelect(newThread);
        setNewThreadTitle('');
        setShowNewThreadInput(false);
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleDeleteThread = async (threadId) => {
    if (!fetchWithAuth || !API_BASE_URL) return;
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/threads/${threadId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setThreads(prev => prev.filter(t => t.id !== threadId));
        if (currentThread?.id === threadId) onThreadSelect(null);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
    setDeleteConfirm(null);
  };

  // NEW: Handle thread edit
  const handleStartEdit = (thread) => {
    setEditingThreadId(thread.id);
    setEditTitle(thread.title);
  };

  const handleCancelEdit = () => {
    setEditingThreadId(null);
    setEditTitle('');
  };

  const handleSaveEdit = async (threadId) => {
    if (!editTitle.trim() || !fetchWithAuth || !API_BASE_URL) return;

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() })
      });

      if (response.ok) {
        const updatedThread = await response.json();
        setThreads(prev => prev.map(t => t.id === threadId ? updatedThread : t));
        // Update current thread if it's the one being edited
        if (currentThread?.id === threadId) {
          onThreadSelect(updatedThread);
        }
        setEditingThreadId(null);
        setEditTitle('');
      }
    } catch (error) {
      console.error('Failed to update thread:', error);
    }
  };

  // NEW: Handle escape key to cancel edit
  const handleEditKeyDown = (e, threadId) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(threadId);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.contentSection}>
      {showNewThreadInput && (
        <form onSubmit={handleCreateThread} className={styles.newThreadForm}>
          <input
            type="text"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            placeholder="Enter thread title..."
            className={styles.newThreadInput}
            autoFocus
          />
          <div className={styles.newThreadActions}>
            <button type="submit" className={styles.createBtn}>Create</button>
            <button
              type="button"
              onClick={() => {
                setShowNewThreadInput(false);
                setNewThreadTitle('');
              }}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={styles.threadList}>
        {loading ? (
          <div className={styles.loading}>Loading threads...</div>
        ) : threads.length === 0 ? (
          <div className={styles.empty}>No threads yet</div>
        ) : (
          threads.map(thread => (
            <div key={thread.id}>
              <div className={`${styles.threadItem} ${currentThread?.id === thread.id ? styles.activeThread : ''}`}>
                <div className={styles.threadItemContent}>
                  {editingThreadId === thread.id ? (
                    // Edit mode
                    <div className={styles.editThreadForm}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, thread.id)}
                        className={styles.editThreadInput}
                        autoFocus
                      />
                      <div className={styles.editThreadActions}>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(thread.id)}
                          className={styles.saveBtn}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className={styles.cancelBtn}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className={styles.threadDisplay} onClick={() => onThreadSelect(thread)}>
                      <div className={styles.threadItemTitleRow}>
                        <div className={styles.threadItemTitle}>{thread.title}</div>
                        <button
                          className={styles.editBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(thread);
                          }}
                          title="Edit thread title"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </div>
                      <div className={styles.threadItemMeta}>
                        {typeof thread.messageCount === 'number' && (
                          <span className={styles.numberBadge}>
                            {thread.messageCount}
                          </span>
                        )}
                        <span className={styles.threadDate}>• {formatDate(thread.updatedAt)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {deleteConfirm === thread.id && (
                <div className={styles.confirmDialog}>
                  <div className={styles.confirmContent}>
                    <p>Delete "{thread.title}"?</p>
                    <div className={styles.confirmActions}>
                      <button
                        className={styles.confirmDelete}
                        onClick={() => handleDeleteThread(thread.id)}
                      >
                        Delete
                      </button>
                      <button
                        className={styles.confirmCancel}
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FilesContent({ uploadedFiles, onFilesUploaded, onRemoveFile }) {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileType = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html'].includes(ext)) return 'code';
    if (['txt', 'md', 'json', 'csv', 'xml'].includes(ext)) return 'document';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'file';
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onFilesUploaded) {
      const uploadedFileObjects = files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: formatFileSize(file.size),
        type: getFileType(file.name),
        file
      }));
      onFilesUploaded(uploadedFileObjects);
    }
    e.target.value = '';
  };

  return (
    <div className={styles.contentSection}>
      <div className={styles.actionSection}>
        <label className={styles.uploadBtn}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14,2 L14,8 L20,8"/>
          </svg>
          Upload Files
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className={styles.hiddenFileInput}
            accept=".txt,.md,.json,.csv,.js,.ts,.jsx,.tsx,.html,.css,.py,.java,.cpp,.c,.xml,.pdf,.jpg,.jpeg,.png,.gif,.svg"
          />
        </label>
      </div>

      <div className={styles.fileList}>
        {uploadedFiles.length === 0 ? (
          <div className={styles.empty}>No files uploaded</div>
        ) : (
          uploadedFiles.map(file => (
            <div key={file.id} className={styles.fileItem}>
              <div className={styles.fileItemContent}>
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileMeta}>
                  {file.size} • {file.type}
                </div>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={() => onRemoveFile && onRemoveFile(file.id)}
                title="Remove file"
              >
                <svg viewBox="0 0 24 24" width="12" height="12">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}