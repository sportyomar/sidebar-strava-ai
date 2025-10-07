import React, { useState } from "react";
import { ChevronDown, ChevronRight, Package, Building2, Database, Settings, Shield } from "lucide-react";
import styles from './LayoutToolsPanel.module.css';

function LayoutNode({ node, depth = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const kind = node.layoutKind || "Unknown";
  const children = node.settings?.children || [];
  const title = node.settings?.title || "";
  const childCount = children.length;

  const handleToggle = () => {
    if (childCount > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  const getNodeLabel = () => {
    if (title) {
      return `${kind} [${title}]`;
    } else {
      return kind;
    }
  };

  return (
    <div className={styles.nodeContainer}>
      <div
        className={`${styles.nodeHeader} ${styles[`depth${Math.min(depth, 3)}`]} ${childCount > 0 ? styles.clickable : ''}`}
        onClick={handleToggle}
      >
        <span className={styles.nodeLabel}>
          {childCount > 0 && (
            <span className={styles.expandIndicator}>
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
          )}
          {getNodeLabel()}
        </span>
        {childCount > 0 && (
          <span className={styles.nodeCount}>{childCount}</span>
        )}
      </div>

      {isExpanded && Array.isArray(children) && children.map((child, index) => {
        if (typeof child === "string") {
          return (
            <div
              key={index}
              className={`${styles.widgetNode} ${styles[`depth${Math.min(depth + 1, 3)}`]}`}
            >
              <span className={styles.widgetLabel}>{child}</span>
            </div>
          );
        } else {
          return (
            <LayoutNode key={index} node={child} depth={depth + 1} />
          );
        }
      })}
    </div>
  );
}

export default function LayoutToolsPanel({ layoutManifest, setLayoutManifest, project }) {
  const [activeTab, setActiveTab] = useState('Architecture');

  const tabs = [
    { id: 'Assets', label: 'Assets', icon: Package },
    { id: 'Architecture', label: 'Architecture', icon: Building2 },
    { id: 'Sources', label: 'Sources', icon: Database },
    { id: 'Operations', label: 'Operations', icon: Settings },
    { id: 'Governance', label: 'Governance', icon: Shield }
  ];

  const sections = layoutManifest?.layoutSections;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Architecture':
        if (!sections || sections.length === 0) {
          return <p className={styles.emptyMessage}>No layout manifest loaded.</p>;
        }
        return (
          <div className={styles.tree}>
            {sections.map((section, i) => (
              <LayoutNode key={i} node={section} />
            ))}
          </div>
        );
      case 'Assets':
        return <p className={styles.emptyMessage}>Assets view - Coming soon</p>;
      case 'Sources':
        return <p className={styles.emptyMessage}>Sources view - Coming soon</p>;
      case 'Operations':
        return <p className={styles.emptyMessage}>Operations view - Coming soon</p>;
      case 'Governance':
        return <p className={styles.emptyMessage}>Governance view - Coming soon</p>;
      default:
        return null;
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Layout Tools</h3>
        <p className={styles.subtitle}>Project: {project}</p>
      </div>

      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <tab.icon size={16} />
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {renderTabContent()}
      </div>
    </div>
  );
}