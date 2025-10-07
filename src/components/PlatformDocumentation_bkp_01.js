import React, { useState, useEffect, useRef } from 'react';
import AccessBar from './AccessBar';
import Doc from './Doc';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeReference from './CodeReference';
import styles from './PlatformDocumentation.module.css';
import ExecutiveLandingHero from './ExecutiveLandingHero';
import ExecutiveDashboard from './ExecutiveDashboard';

function PlatformDocumentation() {
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

  const [docsList, setDocsList] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docBody, setDocBody] = useState('');
  const [docCode, setDocCode] = useState('');
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [expandedToc, setExpandedToc] = useState([]);
  const [documentSections, setDocumentSections] = useState([]);
  const [groupedDocs, setGroupedDocs] = useState([]);

  const documentContainerRef = useRef(null);
  const documentHeaderRef = useRef(null);

  // Load docs index on mount
  useEffect(() => {
    fetch('/docs/docs.json')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDocsList(data);

          // Group documents by TOC structure
          const grouped = groupDocumentsByToc(data);
          setGroupedDocs(grouped);
        } else {
          console.error('Invalid docs.json structure');
        }
      })
      .catch(err => {
        console.error('Failed to load docs.json:', err);
      });
  }, []);

  // Group documents by TOC structure
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
      return;
    }

    // Load markdown body
    fetch(selectedDoc.bodyPath)
      .then(res => res.text())
      .then(text => {
        setDocBody(text);

        // Extract sections from markdown
        const sections = extractSectionsFromMarkdown(text);
        setDocumentSections(sections);

        // Auto-expand TOC for selected document
        if (selectedDoc.type === 'toc') {
          setExpandedToc(selectedDoc.tocId);
        } else if (selectedDoc.type === 'article') {
          // Keep the parent TOC group expanded and also expand article sections
          const expandedItems = [selectedDoc.tocId];
          if (sections.length > 0) {
            expandedItems.push(`${selectedDoc.id}-sections`);
          }
          setExpandedToc(expandedItems);
        }
      })
      .catch(err => {
        console.error('Failed to load doc body:', err);
        setDocBody('# Error loading document.');
        setDocumentSections([]);
      });

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

  // Handle sticky header visibility
  useEffect(() => {
    const container = documentContainerRef.current;
    const header = documentHeaderRef.current;

    if (!container || !header || !selectedDoc) return;

    const handleScroll = () => {
      const headerRect = header.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Show sticky header when original header is scrolled past
      const shouldShow = headerRect.bottom <= containerRect.top;
      setShowStickyHeader(shouldShow);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedDoc]);

  return (
    <div className={styles.container}>
      <AccessBar
        mode={mode}
        setMode={setMode}
        activeWorkspace={activeWorkspace}
        setActiveWorkspace={setActiveWorkspace}
        showDocsPanel={showDocsPanel}
        setShowDocsPanel={setShowDocsPanel}
        showLayoutPanel={showLayoutPanel}
        setShowLayoutPanel={setShowLayoutPanel}
        docsMenuOpen={docsMenuOpen}
        setDocsMenuOpen={setDocsMenuOpen}
        tutorialMenuOpen={tutorialMenuOpen}
        setTutorialMenuOpen={setTutorialMenuOpen}
        showTutorialPanel={showTutorialPanel}
        setShowTutorialPanel={setShowTutorialPanel}
        showProjectSelector={showProjectSelector}
        setShowProjectSelector={setShowProjectSelector}
        selectedProject={null}
      />

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3>Documentation</h3>
          </div>
          <nav className={styles.docNav}>
            {groupedDocs.map(tocGroup => (
              <div key={tocGroup.tocId} className={styles.tocGroup}>
                {/* TOC Header */}
                <div className={styles.tocHeader}>
                  <a
                    className={`${styles.tocNavItem} ${selectedDoc?.id === tocGroup.id ? styles.selected : ''}`}
                    onClick={() => setSelectedDoc(tocGroup)}
                  >
                    <span className={styles.tocTitle}>{tocGroup.title}</span>
                    {/*<span className={styles.tocDescription}>{tocGroup.description}</span>*/}
                  </a>

                  {tocGroup.articles.length > 0 && (
                    <button
                      className={styles.tocToggle}
                      onClick={() => toggleTocGroup(tocGroup.tocId)}
                      title={isExpanded(tocGroup.tocId) ? "Hide articles" : "Show articles"}
                    >
                      <span className={`${styles.tocArrow} ${isExpanded(tocGroup.tocId) ? styles.expanded : ''}`}>›</span>
                    </button>
                  )}
                </div>

                {/* Articles under this TOC */}
                {isExpanded(tocGroup.tocId) && tocGroup.articles.length > 0 && (
                  <div className={styles.articlesContainer}>
                    <div className={styles.articlesDivider}></div>
                    {tocGroup.articles.map(article => (
                      <div key={article.id} className={styles.articleGroup}>
                        <div className={styles.articleNavItemContainer}>
                          <a
                            className={`${styles.articleNavItem} ${selectedDoc?.id === article.id ? styles.selected : ''}`}
                            onClick={() => setSelectedDoc(article)}
                          >
                            <span className={styles.articleTitle}>{article.title}</span>
                          </a>

                          {selectedDoc?.id === article.id && documentSections.length > 0 && (
                            <button
                              className={styles.sectionToggle}
                              onClick={() => toggleTocGroup(`${article.id}-sections`)}
                              title={isExpanded(`${article.id}-sections`) ? "Hide sections" : "Show sections"}
                            >
                              <span className={`${styles.tocArrow} ${isExpanded(`${article.id}-sections`) ? styles.expanded : ''}`}>›</span>
                            </button>
                          )}
                        </div>

                        {/* Article sections */}
                        {isExpanded(`${article.id}-sections`) && selectedDoc?.id === article.id && (
                          <div className={styles.sectionsContainer}>
                            <div className={styles.sectionsDivider}></div>
                            {documentSections.map((section, index) => (
                              <a
                                key={section.id}
                                className={`${styles.sectionItem} ${styles[`sectionLevel${section.level}`]}`}
                                onClick={() => scrollToSection(section.anchor)}
                              >
                                <span className={styles.sectionText}>{section.title}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <main className={styles.documentContainer} ref={documentContainerRef}>
          <div className={styles.document}>
            {!selectedDoc ? (
              <ExecutiveDashboard
                groupedDocs={groupedDocs}
                onArticleSelect={setSelectedDoc}
              />
            ) : (
              <div className={styles.documentContent}>
                {/* Sticky Header */}
                <div className={`${styles.stickyHeader} ${showStickyHeader ? styles.visible : ''}`}>
                  <h1 className={styles.stickyTitle}>{selectedDoc.title}</h1>
                  {selectedDoc.description && (
                    <p className={styles.stickySubtitle}>{selectedDoc.description}</p>
                  )}
                </div>

                {/* Original Header */}
                <header className={styles.documentHeader} ref={documentHeaderRef}>
                  <h1 className={styles.documentTitle}>{selectedDoc.title}</h1>
                  {selectedDoc.description && (
                    <p className={styles.documentSubtitle}>{selectedDoc.description}</p>
                  )}
                </header>

                <div className={styles.documentBody}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({children}) => <h1 className={styles.heading1}>{children}</h1>,
                      h2: ({children}) => {
                        const anchor = children.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
                        return <h2 className={styles.heading2} data-anchor={anchor}>{children}</h2>;
                      },
                      h3: ({children}) => {
                        const anchor = children.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
                        return <h3 className={styles.heading3} data-anchor={anchor}>{children}</h3>;
                      },
                      p: ({children}) => <p className={styles.paragraph}>{children}</p>,
                      ul: ({children}) => <ul className={styles.bulletList}>{children}</ul>,
                      li: ({children}) => <li className={styles.listItem}>{children}</li>,
                      strong: ({children}) => <strong className={styles.emphasis}>{children}</strong>,
                      hr: () => <hr className={styles.sectionBreak} />,
                      blockquote: ({children}) => <blockquote className={styles.pullQuote}>{children}</blockquote>,
                      table: ({children}) => <table className={styles.table}>{children}</table>,
                      thead: ({children}) => <thead className={styles.tableHead}>{children}</thead>,
                      tbody: ({children}) => <tbody className={styles.tableBody}>{children}</tbody>,
                      tr: ({children}) => <tr className={styles.tableRow}>{children}</tr>,
                      th: ({children}) => <th className={styles.tableHeader}>{children}</th>,
                      td: ({children}) => <td className={styles.tableCell}>{children}</td>,
                      a: ({href, children}) => {
                        // Check if it's an internal article link
                        const targetDoc = docsList.find(doc => doc.id === href);
                        if (targetDoc) {
                          return (
                            <a
                              className={styles.internalLink}
                              onClick={() => setSelectedDoc(targetDoc)}
                              style={{cursor: 'pointer', color: '#6366f1', textDecoration: 'underline'}}
                            >
                              {children}
                            </a>
                          );
                        }
                        // External link
                        return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                      }
                    }}
                  >
                    {docBody}
                  </ReactMarkdown>

                  {docCode && (
                    <CodeReference
                      title="Implementation Configuration"
                      code={docCode}
                      language="javascript"
                      description="Core module structure and configuration used in the legacy platform architecture."
                      exhibitLabel="A"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PlatformDocumentation;