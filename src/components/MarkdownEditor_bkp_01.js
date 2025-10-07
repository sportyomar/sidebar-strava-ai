import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownEditor.module.css';

function MarkdownEditor({
  documentId,
  initialContent,
  onContentChange,
  onSave,
  isAuthenticated
}) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load content when component mounts or documentId changes
  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
      setIsLoading(false);
    } else if (documentId) {
      loadDocumentContent();
    }
  }, [documentId, initialContent]);

  const loadDocumentContent = async () => {
    if (!documentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5002/api/docs/${documentId}/content`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data.content || '');
      } else {
        throw new Error('Failed to load document content');
      }
    } catch (err) {
      console.error('Error loading content:', err);
      setError('Failed to load document content');
      setContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Notify parent component of content changes
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  const handleSave = async () => {
    if (!documentId || !isAuthenticated) return;

    try {
      const response = await fetch(`http://localhost:5002/api/docs/${documentId}/content`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Content saved successfully:', data);

        // Notify parent component
        if (onSave) {
          onSave(content);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save content');
      }
    } catch (err) {
      console.error('Error saving content:', err);
      setError(`Failed to save: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading document content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Error: {error}</p>
        <button onClick={loadDocumentContent} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.editorContainer}>
      {/* Split pane layout */}
      <div className={styles.splitPane}>
        {/* Editor pane */}
        <div className={styles.editorPane}>
          <div className={styles.editorHeader}>
            <h3>Markdown Editor</h3>
            <div className={styles.editorStats}>
              <span>{content.length} characters</span>
              <span>{content.split('\n').length} lines</span>
            </div>
          </div>

          <textarea
            className={styles.markdownTextarea}
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing your markdown content here..."
            spellCheck={true}
          />
        </div>

        {/* Preview pane */}
        <div className={styles.previewPane}>
          <div className={styles.previewHeader}>
            <h3>Live Preview</h3>
          </div>

          <div className={styles.previewContent}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => <h1 className={styles.previewH1}>{children}</h1>,
                h2: ({children}) => <h2 className={styles.previewH2}>{children}</h2>,
                h3: ({children}) => <h3 className={styles.previewH3}>{children}</h3>,
                p: ({children}) => <p className={styles.previewP}>{children}</p>,
                ul: ({children}) => <ul className={styles.previewUl}>{children}</ul>,
                ol: ({children}) => <ol className={styles.previewOl}>{children}</ol>,
                li: ({children}) => <li className={styles.previewLi}>{children}</li>,
                strong: ({children}) => <strong className={styles.previewStrong}>{children}</strong>,
                em: ({children}) => <em className={styles.previewEm}>{children}</em>,
                code: ({children}) => <code className={styles.previewCode}>{children}</code>,
                pre: ({children}) => <pre className={styles.previewPre}>{children}</pre>,
                blockquote: ({children}) => <blockquote className={styles.previewBlockquote}>{children}</blockquote>,
                hr: () => <hr className={styles.previewHr} />,
                table: ({children}) => <table className={styles.previewTable}>{children}</table>,
                thead: ({children}) => <thead className={styles.previewThead}>{children}</thead>,
                tbody: ({children}) => <tbody className={styles.previewTbody}>{children}</tbody>,
                tr: ({children}) => <tr className={styles.previewTr}>{children}</tr>,
                th: ({children}) => <th className={styles.previewTh}>{children}</th>,
                td: ({children}) => <td className={styles.previewTd}>{children}</td>,
                a: ({href, children}) => (
                  <a href={href} className={styles.previewLink} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                )
              }}
            >
              {content || '*No content to preview*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Quick action buttons (optional, since ribbon has main actions) */}
      <div className={styles.quickActions}>
        <button
          onClick={handleSave}
          className={styles.quickSaveButton}
          disabled={!isAuthenticated}
          title="Quick save (Ctrl+S)"
        >
          Quick Save
        </button>
      </div>
    </div>
  );
}

export default MarkdownEditor;