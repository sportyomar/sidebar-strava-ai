import React from 'react';
import styles from './DocumentationRibbon.module.css';

function DocumentationRibbon({
  mode,
  onModeChange,
  activeDocument,
  documentStatus,
  hasUnsavedChanges,
  onNewDocument,
  onSave,
  onPublish,
  showSidebar,
  onToggleSidebar,
  showToc,
  onToggleToc,
  user,
  isAuthenticated,
  onMigrateContent
}) {
  // Debug: Log all incoming props
  console.log('=== DocumentationRibbon Render Debug ===');
  console.log('Props received:', {
    mode,
    activeDocument: activeDocument ? {
      id: activeDocument.id,
      title: activeDocument.title,
      created_by: activeDocument.created_by
    } : null,
    documentStatus,
    hasUnsavedChanges,
    user: user ? {
      id: user.id,
      username: user.username,
      display_name: user.display_name
    } : null,
    isAuthenticated
  });

  // Debug: Permission calculation step by step
  console.log('Permission calculation steps:');
  console.log('1. isAuthenticated:', isAuthenticated);
  console.log('2. user object:', user);
  console.log('3. user?.id:', user?.id);
  console.log('4. activeDocument:', activeDocument);
  console.log('5. activeDocument?.created_by:', activeDocument?.created_by);
  console.log('6. IDs match:', user?.id === activeDocument?.created_by);

  const canEdit = isAuthenticated && user?.id === activeDocument?.created_by;

  console.log('7. Final canEdit result:', canEdit);
  console.log('=== End Debug ===');

  const isPublished = documentStatus === 'published';
  const isDraft = documentStatus === 'draft';
  const isSaving = documentStatus === 'saving';

  const handleModeToggle = () => {
    console.log('handleModeToggle called, canEdit:', canEdit);
    if (canEdit) {
      onModeChange(mode === 'reader' ? 'editor' : 'reader');
    } else {
      console.log('Mode toggle blocked - no edit permissions');
    }
  };

  const getStatusText = () => {
    if (isSaving) return 'Saving...';
    if (hasUnsavedChanges) return 'Unsaved changes';
    if (isDraft) return 'Draft';
    if (isPublished) return 'Published';
    return 'Saved';
  };

  const getStatusIcon = () => {
    if (isSaving) return '⟳';
    if (hasUnsavedChanges) return '●';
    if (isDraft) return '📝';
    if (isPublished) return '✓';
    return '✓';
  };

  return (
    <div className={styles.ribbon}>
      {/*/!* Debug Info Display *!/*/}
      {/*<div style={{*/}
      {/*  position: 'absolute',*/}
      {/*  top: '100%',*/}
      {/*  left: 0,*/}
      {/*  background: '#f0f0f0',*/}
      {/*  padding: '10px',*/}
      {/*  fontSize: '12px',*/}
      {/*  border: '1px solid #ccc',*/}
      {/*  zIndex: 1000,*/}
      {/*  whiteSpace: 'pre'*/}
      {/*}}>*/}
      {/*  DEBUG: canEdit={canEdit ? 'TRUE' : 'FALSE'} |*/}
      {/*  auth={isAuthenticated ? 'TRUE' : 'FALSE'} |*/}
      {/*  userID={user?.id || 'MISSING'} |*/}
      {/*  docCreator={activeDocument?.created_by || 'MISSING'}*/}
      {/*</div>*/}

      {/* Left Section - Mode & Document Actions */}
      <div className={styles.leftSection}>
        {/* Mode Toggle */}
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeButton} ${mode === 'reader' ? styles.active : ''}`}
            onClick={() => {
              console.log('Reader button clicked, current mode:', mode);
              if (mode !== 'reader') handleModeToggle();
            }}
            disabled={!canEdit && mode === 'editor'}
            title="Reader mode"
          >
            <span className={styles.modeIcon}>👁</span>
            Reader
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'editor' ? styles.active : ''}`}
            onClick={() => {
              console.log('Editor button clicked, canEdit:', canEdit, 'current mode:', mode);
              if (mode !== 'editor') handleModeToggle();
            }}
            disabled={!canEdit}
            title={canEdit ? "Editor mode" : `No edit permissions - User: ${user?.id}, Creator: ${activeDocument?.created_by}`}
          >
            <span className={styles.modeIcon}>✏️</span>
            Editor {canEdit ? '(ENABLED)' : '(DISABLED)'}
          </button>
        </div>

        {/* Document Actions */}
        <div className={styles.documentActions}>
          <button
            className={styles.actionButton}
            onClick={onNewDocument}
            disabled={!isAuthenticated}
            title="Create new document"
          >
            <span className={styles.actionIcon}>+</span>
            New
          </button>

          <button
            className={styles.actionButton}
            onClick={onMigrateContent}
            disabled={!isAuthenticated}
            title="Migrate file-based content to database"
          >
            <span className={styles.actionIcon}>⬆</span>
            Migrate
          </button>

          {mode === 'editor' && activeDocument && (
            <>
              <button
                className={`${styles.actionButton} ${styles.saveButton}`}
                onClick={onSave}
                disabled={!hasUnsavedChanges || isSaving}
                title="Save changes"
              >
                <span className={styles.actionIcon}>💾</span>
                Save
              </button>

              <button
                className={`${styles.actionButton} ${styles.publishButton}`}
                onClick={onPublish}
                disabled={isSaving}
                title={isPublished ? "Unpublish document" : "Publish document"}
              >
                <span className={styles.actionIcon}>{isPublished ? '📤' : '🚀'}</span>
                {isPublished ? 'Unpublish' : 'Publish'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Center Section - Document Status */}
      <div className={styles.centerSection}>
        {activeDocument && (
          <div className={styles.documentStatus}>
            <div className={styles.statusIndicator}>
              <span className={`${styles.statusIcon} ${hasUnsavedChanges ? styles.unsaved : ''} ${isSaving ? styles.saving : ''}`}>
                {getStatusIcon()}
              </span>
              <span className={styles.statusText}>{getStatusText()}</span>
            </div>

            {activeDocument.title && (
              <div className={styles.documentTitle}>
                <span className={styles.titleText}>{activeDocument.title}</span>
                {activeDocument.type && (
                  <span className={styles.documentType}>{activeDocument.type}</span>
                )}
              </div>
            )}
          </div>
        )}

        {!activeDocument && (
          <div className={styles.noDocument}>
            <span className={styles.noDocText}>No document selected</span>
          </div>
        )}
      </div>

      {/* Right Section - View Controls */}
      <div className={styles.rightSection}>
        <div className={styles.viewControls}>
          <button
            className={`${styles.viewButton} ${showSidebar ? styles.active : ''}`}
            onClick={onToggleSidebar}
            title="Toggle sidebar"
          >
            <span className={styles.viewIcon}>📋</span>
            Sidebar
          </button>

          <button
            className={`${styles.viewButton} ${showToc ? styles.active : ''}`}
            onClick={onToggleToc}
            title="Toggle table of contents"
            disabled={!activeDocument}
          >
            <span className={styles.viewIcon}>📑</span>
            TOC
          </button>
        </div>

        {/* User Info */}
        {isAuthenticated && user && (
          <div className={styles.userInfo}>
            {(user.avatar_url || user.avatar) && (
              <img
                src={user.avatar_url || user.avatar}
                alt={user.display_name || user.username}
                className={styles.userAvatar}
              />
            )}
            <span className={styles.userName}>
              {user.display_name || user.username}
            </span>
          </div>
        )}

        {!isAuthenticated && (
          <div className={styles.authPrompt}>
            <span className={styles.authText}>Sign in to edit</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentationRibbon;