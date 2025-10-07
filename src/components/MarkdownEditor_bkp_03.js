import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Link,
  Image,
  Minus,
  Undo,
  Redo
} from 'lucide-react';
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
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [splitRatio, setSplitRatio] = useState(50); // Percentage for left pane
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const containerRef = useRef(null);

  // Load content when component mounts or documentId changes
  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
      setHistory([initialContent]);
      setHistoryIndex(0);
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
        const loadedContent = data.content || '';
        setContent(loadedContent);
        setHistory([loadedContent]);
        setHistoryIndex(0);
      } else {
        throw new Error('Failed to load document content');
      }
    } catch (err) {
      console.error('Error loading content:', err);
      setError('Failed to load document content');
      setContent('');
      setHistory(['']);
      setHistoryIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Resize handle functionality
  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain between 20% and 80% to prevent panes from becoming too small
    const constrainedRatio = Math.min(Math.max(newRatio, 20), 80);
    setSplitRatio(constrainedRatio);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, splitRatio]);

  // Auto-resize textarea to make the pane scroll instead of textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const resize = () => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    };

    resize(); // initial resize
    ta.addEventListener('input', resize);
    return () => ta.removeEventListener('input', resize);
  }, [content]);

  // Helper function to add content to history
  const addToHistory = (newContent) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);

    // Limit history to last 50 states to prevent memory issues
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }

    setHistory(newHistory);
    if (newHistory.length <= 50) {
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Add to history on significant changes (debounced)
    if (Math.abs(newContent.length - content.length) > 10 ||
        newContent.includes('\n') !== content.includes('\n')) {
      addToHistory(newContent);
    }

    // Notify parent component of content changes
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  // Helper function to get current selection or cursor position
  const getTextareaSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    return {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      selectedText: content.substring(textarea.selectionStart, textarea.selectionEnd)
    };
  };

  // Helper function to update content with new text and set cursor position
  const updateContentAndCursor = (newContent, cursorPosition) => {
    // Add current content to history before making changes
    addToHistory(content);

    setContent(newContent);
    if (onContentChange) {
      onContentChange(newContent);
    }

    // Set cursor position after React updates
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = cursorPosition;
        textareaRef.current.selectionEnd = cursorPosition;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Formatting functions
  const insertFormatting = (beforeText, afterText = '', placeholder = '') => {
    const selection = getTextareaSelection();
    if (!selection) return;

    const { start, end, selectedText } = selection;
    const textToWrap = selectedText || placeholder;
    const replacement = beforeText + textToWrap + afterText;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    const newCursorPos = selectedText
      ? start + replacement.length
      : start + beforeText.length;

    updateContentAndCursor(newContent, newCursorPos);
  };

  const insertAtCursor = (text) => {
    const selection = getTextareaSelection();
    if (!selection) return;

    const { start, end } = selection;
    const newContent = content.substring(0, start) + text + content.substring(end);
    const newCursorPos = start + text.length;

    updateContentAndCursor(newContent, newCursorPos);
  };

  // Specific formatting handlers
  const handleBold = () => insertFormatting('**', '**', 'bold text');
  const handleItalic = () => insertFormatting('*', '*', 'italic text');
  const handleHeading1 = () => insertAtCursor('# ');
  const handleHeading2 = () => insertAtCursor('## ');
  const handleHeading3 = () => insertAtCursor('### ');
  const handleBulletList = () => insertAtCursor('- ');
  const handleNumberedList = () => insertAtCursor('1. ');
  const handleQuote = () => insertAtCursor('> ');
  const handleInlineCode = () => insertFormatting('`', '`', 'code');
  const handleCodeBlock = () => insertFormatting('```\n', '\n```', 'code block');
  const handleLink = () => insertFormatting('[', '](url)', 'link text');
  const handleImage = () => insertFormatting('![', '](url)', 'alt text');
  const handleHorizontalRule = () => insertAtCursor('\n---\n');

  // Undo/Redo functionality
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousContent = history[newIndex];
      setContent(previousContent);

      if (onContentChange) {
        onContentChange(previousContent);
      }

      // Focus textarea after undo
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextContent = history[newIndex];
      setContent(nextContent);

      if (onContentChange) {
        onContentChange(nextContent);
      }

      // Focus textarea after redo
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
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
      <div className={styles.splitPane} ref={containerRef}>
        {/* Editor pane */}
        <div
          className={styles.editorPane}
          style={{ width: `${splitRatio}%` }}
        >
          <div className={styles.editorHeader}>
            <h3>Markdown Editor</h3>
            <div className={styles.editorStats}>
              <span>{content.length} characters</span>
              <span>{content.split('\n').length} lines</span>
            </div>
          </div>

          {/* Formatting Ribbon */}
          <div className={styles.formattingRibbon}>
            <div className={styles.ribbonGroup}>
              <button
                className={styles.ribbonButton}
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
              >
                <Undo size={16} />
              </button>
              <button
                className={styles.ribbonButton}
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Y)"
              >
                <Redo size={16} />
              </button>
            </div>

            <div className={styles.ribbonSeparator}></div>

            <div className={styles.ribbonGroup}>
              <button
                className={styles.ribbonButton}
                onClick={handleBold}
                title="Bold (Ctrl+B)"
              >
                <Bold size={16} />
              </button>
              <button
                className={styles.ribbonButton}
                onClick={handleItalic}
                title="Italic (Ctrl+I)"
              >
                <Italic size={16} />
              </button>
            </div>

            <div className={styles.ribbonSeparator}></div>

            <div className={styles.ribbonGroup}>
              <button
                className={styles.ribbonButton}
                onClick={handleHeading1}
                title="Heading 1"
              >
                <Heading1 size={16} />
              </button>
              <button
                className={styles.ribbonButton}
                onClick={handleHeading2}
                title="Heading 2"
              >
                <Heading2 size={16} />
              </button>
              <button
                className={styles.ribbonButton}
                onClick={handleHeading3}
                title="Heading 3"
              >
                <Heading3 size={16} />
              </button>
            </div>

            <div className={styles.ribbonSeparator}></div>

            <div className={styles.ribbonGroup}>
              <button
                className={styles.ribbonButton}
                onClick={handleBulletList}
                title="Bullet List"
              >
                <List size={16} />
              </button>
              <button
                className={styles.ribbonButton}
                onClick={handleNumberedList}
                title="Numbered List"
              >
                <ListOrdered size={16} />
              </button>
              <button
                className={styles.ribbonButton}
                onClick={handleQuote}
                title="Quote"
              >
                <Quote size={16} />
              </button>
            </div>

            <div className={styles.ribbonSeparator}></div>

            <div className={styles.ribbonGroup}>
              <button
                className={styles.ribbonButton}
                onClick={handleInlineCode}
                title="Inline Code"
              >
                <Code size={16} />
              </button>
              <button
                className={styles.ribbonButton}
                onClick={handleCodeBlock}
                title="Code Block"
              >
                <Code2 size={16} />
              </button>
            </div>

            <div className={styles.ribbonSeparator}></div>

            <div className={styles.ribbonGroup}>
              <button
                className={styles.ribbonButton}
                onClick={handleLink}
                title="Link"
              >
                <Link size={16} />
              </button>
              <button
                className={styles.ribbonButton}
                onClick={handleImage}
                title="Image"
              >
                <Image size={16} />
              </button>
              <button
                className={styles.ribbonButton}
                onClick={handleHorizontalRule}
                title="Horizontal Rule"
              >
                <Minus size={16} />
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            className={styles.markdownTextarea}
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing your markdown content here..."
            spellCheck={true}
          />
        </div>

        {/* Resize handle */}
        <div
          className={styles.resizeHandle}
          onMouseDown={handleMouseDown}
        />

        {/* Preview pane */}
        <div
          className={styles.previewPane}
          style={{ width: `${100 - splitRatio}%` }}
        >
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

      {/* Quick action buttons */}
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