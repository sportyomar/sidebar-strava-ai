import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import styles from './PlatformDocsSidebar.module.css';

function PlatformDocsSidebar({
  groupedDocs,
  selectedDoc,
  onDocumentSelect,
  expandedGroups,
  onToggleGroup,
  isCollapsed,
  onToggleCollapse
}) {
  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.headerTop}>
          <button
            className={styles.collapseButton}
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
          {!isCollapsed && <h3>Documentation</h3>}
        </div>
      </div>

      {!isCollapsed && (
        <nav className={styles.docNav}>
        {groupedDocs.map(tocGroup => (
          <div key={tocGroup.tocId} className={styles.navGroup}>
            {/* Group Header */}
            <div className={styles.groupHeader}>
              <button
                className={styles.groupToggle}
                onClick={() => onToggleGroup(tocGroup.tocId)}
                aria-expanded={expandedGroups?.includes(tocGroup.tocId) || false}
              >
                <span className={`${styles.groupArrow} ${(expandedGroups?.includes(tocGroup.tocId)) ? styles.expanded : ''}`}>
                  ›
                </span>
                <span className={styles.groupTitle}>{tocGroup.title}</span>
              </button>
            </div>

            {/* Expanded Group Content */}
            {(expandedGroups?.includes(tocGroup.tocId)) && (
              <div className={styles.groupContent}>
                {/* Overview/TOC item if it exists */}
                {tocGroup.id && (
                  <button
                    className={`${styles.navItem} ${selectedDoc?.id === tocGroup.id ? styles.selected : ''}`}
                    onClick={() => onDocumentSelect(tocGroup)}
                  >
                    Overview
                  </button>
                )}

                {/* Articles in this group */}
                {tocGroup.articles && tocGroup.articles.map(article => (
                  <button
                    key={article.id}
                    className={`${styles.navItem} ${selectedDoc?.id === article.id ? styles.selected : ''}`}
                    onClick={() => onDocumentSelect(article)}
                  >
                    {article.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      )}
    </aside>
  );
}

export default PlatformDocsSidebar;