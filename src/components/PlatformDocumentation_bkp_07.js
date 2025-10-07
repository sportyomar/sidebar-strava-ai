import React, { useState, useEffect, useRef } from 'react';
import { Edit3 } from 'lucide-react';
import AccessBar from './AccessBar';
import ProfileNavBar from "./ProfileNavBar";
import DocumentCreationForm from './DocumentCreationForm';
import DocumentationRibbon from './DocumentationRibbon';
import DocumentMetadata from './DocumentMetadata';
import DocumentMetadataEditor from './DocumentMetadataEditor';
import MarkdownEditor from './MarkdownEditor';
import PlatformDocsSidebar from "./PlatformDocsSidebar";
import PlatformDocsTableOfContents from './PlatformDocsTableOfContents';
import PlatformDocsContent from './PlatformDocsContent';
import Doc from './Doc';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeReference from './CodeReference';
import Comments from './Comments';
import styles from './PlatformDocumentation.module.css';
import ExecutiveLandingHero from './ExecutiveLandingHero';
import ExecutiveDashboard from './ExecutiveDashboard';

function PlatformDocumentation({ user, isAuthenticated }) {
  const [mode, setMode] = useState('consultant');
  const [activeWorkspace, setActiveWorkspace] = useState('memoEditor');
  const [showDocsPanel, setShowDocsPanel] = useState(false);
  const [showLayoutPanel, setShowLayoutPanel] = useState(false);
  const [tutorialMenuOpen, setTutorialMenuOpen] = useState(false);
  const [docsMenuOpen, setDocsMenuOpen] = useState(false);
  const [showTutorialPanel, setShowTutorialPanel] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  const [headlinerArticle, setHeadlinerArticle] = useState(null);
  const [supportingArticles, setSupportingArticles] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [executiveMetrics, setExecutiveMetrics] = useState([]);
  const [marketUpdates, setMarketUpdates] = useState([]);

  const [showCreationForm, setShowCreationForm] = useState(false);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);

  const [docsList, setDocsList] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docBody, setDocBody] = useState('');
  const [docCode, setDocCode] = useState('');
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [expandedToc, setExpandedToc] = useState([]);
  const [documentSections, setDocumentSections] = useState([]);
  const [groupedDocs, setGroupedDocs] = useState([]);

  const [migrationStatus, setMigrationStatus] = useState({ pending: 0, isLoading: false });
  const [migrationResults, setMigrationResults] = useState(null);

  const documentContainerRef = useRef(null);
  const documentHeaderRef = useRef(null);

  const [documentMode, setDocumentMode] = useState('reader');
  const [documentStatus, setDocumentStatus] = useState('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);

  // New markdown editor state
  const [markdownContent, setMarkdownContent] = useState('');
  const [markdownHistory, setMarkdownHistory] = useState([]);
  const [markdownHistoryIndex, setMarkdownHistoryIndex] = useState(-1);
  const markdownTextareaRef = useRef(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialize markdown state when document changes
  useEffect(() => {
    if (docBody !== markdownContent) {
      setMarkdownContent(docBody);
      setMarkdownHistory([docBody]);
      setMarkdownHistoryIndex(0);
    }
  }, [docBody]);

  // Helper function to add content to markdown history
  const addToMarkdownHistory = (newContent) => {
    const newHistory = markdownHistory.slice(0, markdownHistoryIndex + 1);
    newHistory.push(newContent);

    // Limit history to last 50 states to prevent memory issues
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setMarkdownHistoryIndex(markdownHistoryIndex + 1);
    }

    setMarkdownHistory(newHistory);
    if (newHistory.length <= 50) {
      setMarkdownHistoryIndex(newHistory.length - 1);
    }
  };

  // Helper function to get current selection or cursor position
  const getMarkdownTextareaSelection = () => {
    const textarea = markdownTextareaRef.current;
    if (!textarea) return null;

    return {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      selectedText: markdownContent.substring(textarea.selectionStart, textarea.selectionEnd)
    };
  };

  // Helper function to update content with new text and set cursor position
  const updateMarkdownContentAndCursor = (newContent, cursorPosition) => {
    // Add current content to history before making changes
    addToMarkdownHistory(markdownContent);

    setMarkdownContent(newContent);
    setDocBody(newContent);
    setHasUnsavedChanges(true);
    setDocumentStatus('draft');

    // Set cursor position after React updates
    setTimeout(() => {
      if (markdownTextareaRef.current) {
        markdownTextareaRef.current.selectionStart = cursorPosition;
        markdownTextareaRef.current.selectionEnd = cursorPosition;
        markdownTextareaRef.current.focus();
      }
    }, 0);
  };

  // Generic formatting function
  const handleMarkdownFormat = (beforeText, afterText = '', placeholder = '') => {
    const selection = getMarkdownTextareaSelection();
    if (!selection) return;

    const { start, end, selectedText } = selection;
    const textToWrap = selectedText || placeholder;
    const replacement = beforeText + textToWrap + afterText;

    const newContent = markdownContent.substring(0, start) + replacement + markdownContent.substring(end);
    const newCursorPos = selectedText
      ? start + replacement.length
      : start + beforeText.length;

    updateMarkdownContentAndCursor(newContent, newCursorPos);
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  // Markdown undo function
  const handleMarkdownUndo = () => {
    if (markdownHistoryIndex > 0) {
      const newIndex = markdownHistoryIndex - 1;
      setMarkdownHistoryIndex(newIndex);
      const previousContent = markdownHistory[newIndex];
      setMarkdownContent(previousContent);
      setDocBody(previousContent);
      setHasUnsavedChanges(true);
      setDocumentStatus('draft');

      // Focus textarea after undo
      setTimeout(() => {
        if (markdownTextareaRef.current) {
          markdownTextareaRef.current.focus();
        }
      }, 0);
    }
  };

  // Markdown redo function
  const handleMarkdownRedo = () => {
    if (markdownHistoryIndex < markdownHistory.length - 1) {
      const newIndex = markdownHistoryIndex + 1;
      setMarkdownHistoryIndex(newIndex);
      const nextContent = markdownHistory[newIndex];
      setMarkdownContent(nextContent);
      setDocBody(nextContent);
      setHasUnsavedChanges(true);
      setDocumentStatus('draft');

      // Focus textarea after redo
      setTimeout(() => {
        if (markdownTextareaRef.current) {
          markdownTextareaRef.current.focus();
        }
      }, 0);
    }
  };

  // Handle markdown content changes
  const handleMarkdownContentChange = (newContent) => {
    setMarkdownContent(newContent);
    setDocBody(newContent);
    setHasUnsavedChanges(true);
    setDocumentStatus('draft');

    // Add to history on significant changes (debounced)
    if (Math.abs(newContent.length - markdownContent.length) > 10 ||
        newContent.includes('\n') !== markdownContent.includes('\n')) {
      addToMarkdownHistory(newContent);
    }
  };

  // Enhanced document selection handler that fetches complete document data
  const handleDocumentSelect = async (docFromSidebar) => {
    try {
      // Fetch complete document data including created_by
      const response = await fetch(`http://localhost:5002/api/docs/${docFromSidebar.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const completeDocData = await response.json();
        console.log('Complete document data fetched:', completeDocData);
        setSelectedDoc(completeDocData);
      } else {
        console.warn('Failed to fetch complete document data, using sidebar data');
        setSelectedDoc(docFromSidebar);
      }
    } catch (error) {
      console.error('Error fetching complete document data:', error);
      setSelectedDoc(docFromSidebar);
    }
  };

  const handleHomeClick = () => {
    setSelectedDoc(null);
  };

  // Migration status check function
  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/docs/migration-status');
      const data = await response.json();

      if (response.ok) {
        setMigrationStatus({
          pending: data.pending_migration,
          isLoading: false,
          migrationNeeded: data.migration_needed
        });
      }
    } catch (error) {
      console.error('Failed to check migration status:', error);
    }
  };

  // Migration handler function
  const handleMigrateContent = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to perform migration');
      return;
    }

    const confirmMigration = window.confirm(
      `This will migrate ${migrationStatus.pending} file-based documents to the database. Continue?`
    );

    if (!confirmMigration) return;

    setMigrationStatus(prev => ({ ...prev, isLoading: true }));
    setMigrationResults(null);

    try {
      // Debug: Check multiple possible token storage locations
      const possibleTokens = {
        auth_token: localStorage.getItem('auth_token'),
        token: localStorage.getItem('token'),
        access_token: localStorage.getItem('access_token'),
        jwt_token: localStorage.getItem('jwt_token'),
        session_auth_token: sessionStorage.getItem('auth_token'),
        session_token: sessionStorage.getItem('token')
      };

      console.log('=== AUTH TOKEN DEBUG ===');
      console.log('User authenticated:', isAuthenticated);
      console.log('User object:', user);
      console.log('Possible tokens:', possibleTokens);

      // Find the first non-null token
      const token = localStorage.getItem('authToken') ||
              possibleTokens.auth_token ||
              possibleTokens.token ||
              possibleTokens.access_token ||
              possibleTokens.jwt_token ||
              possibleTokens.session_auth_token ||
              possibleTokens.session_token;

      console.log('Selected token:', token ? `${token.substring(0, 20)}...` : 'MISSING');

      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      console.log('Making migration request...');

      const response = await fetch('http://localhost:5002/api/docs/migrate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setMigrationResults(data);

        // Show success/partial success message
        if (data.failed.length === 0) {
          alert(`Success! Migrated ${data.migrated.length} documents to database.`);
        } else {
          alert(`Migration completed with ${data.migrated.length} successes and ${data.failed.length} failures. Check console for details.`);
          console.log('Migration failures:', data.failed);
        }

        // Refresh the document list to reflect changes
        window.location.reload(); // Simple refresh - you could make this more elegant

      } else {
        console.error('Migration failed with status:', response.status);
        throw new Error(data.error || data.message || 'Migration failed');
      }

    } catch (error) {
      console.error('Migration error details:', error);

      // More specific error messages
      if (error.message.includes('No authentication token')) {
        alert('Authentication token not found. Please log out and log back in.');
      } else if (error.message.includes('fetch')) {
        alert('Network error. Check your connection and try again.');
      } else {
        alert(`Migration failed: ${error.message}`);
      }
    } finally {
      setMigrationStatus(prev => ({ ...prev, isLoading: false }));
      console.log('=== MIGRATION ATTEMPT COMPLETE ===');
    }
  };

  // Load docs from database API instead of docs.json
  useEffect(() => {
    // Use the new API endpoint
    fetch('http://localhost:5002/api/docs/groups')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGroupedDocs(data);

          // Also create a flat list for backward compatibility
          const flatDocs = [];
          data.forEach(group => {
            if (group.id) {
              flatDocs.push({
                id: group.id,
                title: group.title,
                description: group.description,
                type: 'toc',
                tocId: group.toc_id,
                bodyPath: group.bodyPath,
                codeSnippetPath: group.codeSnippetPath
              });
            }
            if (group.articles) {
              flatDocs.push(...group.articles);
            }
          });
          setDocsList(flatDocs);
        } else {
          console.error('Invalid API response structure');
        }
      })
      .catch(err => {
        console.error('Failed to load docs from API:', err);
      });
  }, []);

  // Check migration status on component mount
  useEffect(() => {
    checkMigrationStatus();
  }, []);

  // Group documents by TOC structure (now used as fallback)
  const groupDocumentsByToc = (docs) => {
    const tocDocs = docs.filter(doc => doc.type === 'toc');
    const articleDocs = docs.filter(doc => doc.type === 'article');

    return tocDocs.map(toc => ({
      ...toc,
      articles: articleDocs.filter(article => article.tocId === toc.tocId)
    }));
  };

  // Load content and code snippet when a doc is selected
  useEffect(() => {
    if (!selectedDoc) {
      setDocBody('');
      setDocCode('');
      setDocumentSections([]);
      setExpandedToc(null);
      setDocumentStatus('saved');
      setHasUnsavedChanges(false);
      return;
    }

    // First try to get content from database
    fetch(`http://localhost:5002/api/docs/${selectedDoc.id}/content`)
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          // Use database content
          setDocBody(data.content);
          setDocumentStatus(data.status || 'saved');
        } else {
          throw new Error('No database content found');
        }
      })
      .catch(err => {
        console.warn('Database content not found, falling back to file:', err);

        // Fallback to file-based content
        if (selectedDoc.bodyPath) {
          fetch(selectedDoc.bodyPath)
            .then(res => res.text())
            .then(text => {
              setDocBody(text);
              setDocumentStatus('saved');
            })
            .catch(fileErr => {
              console.error('Failed to load doc body from file:', fileErr);
              setDocBody('# Error loading document.');
              setDocumentSections([]);
            });
        } else {
          setDocBody('# No content available.');
        }
      });

    // First try to get sections from database
    fetch(`http://localhost:5002/api/docs/${selectedDoc.id}/sections`)
      .then(res => res.json())
      .then(sections => {
        if (Array.isArray(sections) && sections.length > 0) {
          // Use database sections
          setDocumentSections(sections.map(section => ({
            id: `section-${section.id}`,
            title: section.title,
            level: section.level,
            anchor: section.anchor
          })));
        } else {
          // Extract sections from markdown if no database sections
          if (docBody) {
            const sections = extractSectionsFromMarkdown(docBody);
            setDocumentSections(sections);
          }
        }
      })
      .catch(err => {
        console.warn('Could not load sections from database, will extract from markdown:', err);
        // Will extract from markdown once docBody is set
      });

    // Auto-expand TOC for selected document
    if (selectedDoc.type === 'toc') {
      setExpandedToc(selectedDoc.tocId);
    } else if (selectedDoc.type === 'article') {
      const expandedItems = [selectedDoc.tocId];
      if (documentSections.length > 0) {
        expandedItems.push(`${selectedDoc.id}-sections`);
      }
      setExpandedToc(expandedItems);
    }

    // Load optional code snippet
    if (selectedDoc.codeSnippetPath) {
      fetch(selectedDoc.codeSnippetPath)
        .then(res => res.text())
        .then(setDocCode)
        .catch(err => {
          console.warn('No code snippet found:', err);
          setDocCode('');
        });
    } else {
      setDocCode('');
    }
  }, [selectedDoc]);

  // Extract sections when docBody changes (for fallback scenarios)
  useEffect(() => {
    if (docBody && documentSections.length === 0) {
      const sections = extractSectionsFromMarkdown(docBody);
      setDocumentSections(sections);
    }
  }, [docBody, documentSections.length]);

  // Extract sections from markdown content
  const extractSectionsFromMarkdown = (markdown) => {
    const lines = markdown.split('\n');
    const sections = [];

    lines.forEach((line, index) => {
      // Match h2 and h3 headings
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);

      if (h2Match) {
        sections.push({
          id: `section-${index}`,
          title: h2Match[1],
          level: 2,
          anchor: h2Match[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
        });
      } else if (h3Match) {
        sections.push({
          id: `section-${index}`,
          title: h3Match[1],
          level: 3,
          anchor: h3Match[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
        });
      }
    });

    return sections;
  };

  // Handle section navigation
  const scrollToSection = (anchor) => {
    const container = documentContainerRef.current;
    if (!container) return;

    // Find element with the anchor
    const targetElement = container.querySelector(`[data-anchor="${anchor}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Toggle TOC expansion
  const toggleTocGroup = (tocId) => {
    setExpandedToc(prev => {
      const currentExpanded = Array.isArray(prev) ? prev : [];
      if (currentExpanded.includes(tocId)) {
        return currentExpanded.filter(id => id !== tocId);
      } else {
        return [...currentExpanded, tocId];
      }
    });
  };

  // Check if an item is expanded
  const isExpanded = (id) => {
    if (!expandedToc || !Array.isArray(expandedToc)) return false;
    return expandedToc.includes(id);
  };

  // Ribbon handler functions
  const handleModeChange = (newMode) => {
    setDocumentMode(newMode);
  };

  const handleNewDocument = () => {
    setShowCreationForm(true);
  };

  const handleCreateDocument = async (documentData) => {
    setIsCreatingDocument(true);

    try {
      const token = localStorage.getItem('authToken');

      // Log the data being sent for debugging
      console.log('Creating document with data:', documentData);

      const response = await fetch('http://localhost:5002/api/docs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(documentData)
      });

      const data = await response.json();
      console.log('API response:', data);

      if (response.ok) {
        // Refresh document list and select new document
        window.location.reload(); // Simple refresh for now
      } else {
        console.error('API error details:', data);
        throw new Error(data.error || data.message || 'Failed to create document');
      }
    } catch (error) {
      console.error('Document creation error:', error);
      alert(`Failed to create document: ${error.message}`);
    } finally {
      setIsCreatingDocument(false);
      setShowCreationForm(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDoc) return;

    setDocumentStatus('saving');

    try {
      const response = await fetch(`http://localhost:5002/api/docs/${selectedDoc.id}/content`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: docBody })
      });

      if (response.ok) {
        setDocumentStatus('saved');
        setHasUnsavedChanges(false);
        console.log('Document saved successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save document');
      }
    } catch (error) {
      console.error('Save error:', error);
      setDocumentStatus('draft');
      alert(`Failed to save document: ${error.message}`);
    }
  };

  const handlePublish = async () => {
    if (!selectedDoc) return;

    setDocumentStatus('saving');

    try {
      const response = await fetch(`http://localhost:5002/api/docs/${selectedDoc.id}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentStatus(data.status);
        setHasUnsavedChanges(false);
        console.log(data.message);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish document');
      }
    } catch (error) {
      console.error('Publish error:', error);
      setDocumentStatus('draft');
      alert(`Failed to publish document: ${error.message}`);
    }
  };

  const handleToggleToc = () => {
    setShowToc(!showToc);
  };

  // Handler for content changes from the editor
  const handleContentChange = (newContent) => {
    setDocBody(newContent);
    setHasUnsavedChanges(true);
    setDocumentStatus('draft');
  };

  // Handler for successful save from editor
  const handleEditorSave = (savedContent) => {
    setDocBody(savedContent);
    setHasUnsavedChanges(false);
    setDocumentStatus('saved');
  };

  // Handler for metadata updates
  const handleMetadataSave = (updatedDocument) => {
    setSelectedDoc(updatedDocument);
    setShowMetadataEditor(false);
  };

  // Handle sticky header visibility - disabled in editor mode
  useEffect(() => {
    const container = documentContainerRef.current;
    const header = documentHeaderRef.current;

    if (!container || !header || !selectedDoc || documentMode === 'editor') return;

    const handleScroll = () => {
      const headerRect = header.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Show sticky header when original header is scrolled past
      const shouldShow = headerRect.bottom <= containerRect.top;
      setShowStickyHeader(shouldShow);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedDoc, documentMode]);

  // Migration Results Display Component
  const MigrationResults = ({ results, onClose }) => {
    if (!results) return null;

    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        maxWidth: '500px',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        <h3>Migration Results</h3>
        <p>{results.message}</p>

        {results.migrated.length > 0 && (
          <div>
            <h4>Successfully Migrated ({results.migrated.length}):</h4>
            <ul>
              {results.migrated.map(doc => (
                <li key={doc.id}>{doc.title}</li>
              ))}
            </ul>
          </div>
        )}

        {results.failed.length > 0 && (
          <div>
            <h4>Failed ({results.failed.length}):</h4>
            <ul>
              {results.failed.map(doc => (
                <li key={doc.id}>
                  {doc.title}: {doc.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={onClose} style={{ marginTop: '15px' }}>
          Close
        </button>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <ProfileNavBar />

      <DocumentationRibbon
        mode={documentMode}
        onModeChange={handleModeChange}
        activeDocument={selectedDoc}
        documentStatus={documentStatus}
        hasUnsavedChanges={hasUnsavedChanges}
        onNewDocument={handleNewDocument}
        onSave={handleSave}
        onPublish={handlePublish}
        onMigrateContent={handleMigrateContent}
        migrationStatus={migrationStatus}
        showToc={showToc}
        onToggleToc={handleToggleToc}
        isAuthenticated={isAuthenticated}
        user={JSON.parse(localStorage.getItem('user'))}
        // New markdown props
        markdownContent={markdownContent}
        onMarkdownContentChange={handleMarkdownContentChange}
        markdownHistory={markdownHistory}
        markdownHistoryIndex={markdownHistoryIndex}
        onMarkdownUndo={handleMarkdownUndo}
        onMarkdownRedo={handleMarkdownRedo}
        onMarkdownFormat={handleMarkdownFormat}
      />

      <div className={styles.layout}>
        <PlatformDocsSidebar
            groupedDocs={groupedDocs}
            selectedDoc={selectedDoc}
            onDocumentSelect={handleDocumentSelect}
            expandedGroups={expandedToc}
            onToggleGroup={toggleTocGroup}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
        />
        <main className={styles.documentContainer} ref={documentContainerRef}>
          <div className={styles.document}>
            {!selectedDoc && !showCreationForm ? (
              <ExecutiveDashboard
                groupedDocs={groupedDocs}
                onArticleSelect={handleDocumentSelect}
              />
            ) : showCreationForm ? (
              <DocumentCreationForm
                groupedDocs={groupedDocs}
                onCreateDocument={handleCreateDocument}
                onCancel={() => setShowCreationForm(false)}
                isCreating={isCreatingDocument}
                user={user}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <PlatformDocsContent
                selectedDoc={selectedDoc}
                documentMode={documentMode}
                docBody={docBody}
                docCode={docCode}
                showStickyHeader={showStickyHeader}
                documentHeaderRef={documentHeaderRef}
                user={user}
                isAuthenticated={isAuthenticated}
                onContentChange={handleContentChange}
                onMetadataEdit={() => setShowMetadataEditor(true)}
                docsList={docsList}
                onDocumentSelect={handleDocumentSelect}
                // Markdown editor props
                markdownContent={markdownContent}
                onMarkdownContentChange={handleMarkdownContentChange}
                markdownHistory={markdownHistory}
                markdownHistoryIndex={markdownHistoryIndex}
                onMarkdownUndo={handleMarkdownUndo}
                onMarkdownRedo={handleMarkdownRedo}
                onMarkdownFormat={handleMarkdownFormat}
                textareaRef={markdownTextareaRef}
                groupedDocs={groupedDocs}
                onHomeClick={handleHomeClick}
              />
            )}
          </div>
        </main>
        <PlatformDocsTableOfContents
          documentSections={documentSections}
          onSectionClick={scrollToSection}
          showToc={showToc && selectedDoc}
        />
      </div>

      {/* Migration Results Modal */}
      <MigrationResults
        results={migrationResults}
        onClose={() => setMigrationResults(null)}
      />

      {/* Comments Component - sticky at bottom */}
      <Comments
        documentId={selectedDoc?.id}
        user={user}
        isAuthenticated={isAuthenticated}
      />

      {/* Document Metadata Editor Modal */}
      <DocumentMetadataEditor
        document={selectedDoc}
        isOpen={showMetadataEditor}
        onClose={() => setShowMetadataEditor(false)}
        onSave={handleMetadataSave}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}

export default PlatformDocumentation;