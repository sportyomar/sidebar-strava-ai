// components/Pane.jsx
import React from 'react';
import PanelHeader from './PanelHeader';
import styles from './Pane.module.css';

export default function Pane({
  activePaneType,
  onClose,
  currentThread,
  uploadedFiles = []
}) {
  if (!activePaneType) return null;

  const closeButton = (
    <button
      className={styles.closeButton}
      onClick={onClose}
      aria-label="Close pane"
    >
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
          <ThreadsContent currentThread={currentThread} />
        ) : (
          <FilesContent uploadedFiles={uploadedFiles} />
        )}
      </div>
    </div>
  );
}

function ThreadsContent({ currentThread }) {
  return (
    <div className={styles.contentSection}>
      <div className={styles.sectionHeader}>Current Thread</div>
      {currentThread ? (
        <div className={styles.threadInfo}>
          <div className={styles.threadTitle}>{currentThread.title}</div>
          <div className={styles.threadMeta}>
            {currentThread.messageCount || 0} messages
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>No thread selected</div>
      )}
    </div>
  );
}

function FilesContent({ uploadedFiles }) {
  return (
    <div className={styles.contentSection}>
      <div className={styles.sectionHeader}>Uploaded Files</div>
      {uploadedFiles.length > 0 ? (
        <div className={styles.fileList}>
          {uploadedFiles.map(file => (
            <div key={file.id} className={styles.fileItem}>
              <div className={styles.fileName}>{file.name}</div>
              <div className={styles.fileMeta}>{file.size}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>No files uploaded</div>
      )}
    </div>
  );
}