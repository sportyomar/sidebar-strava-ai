import React, { useState, useEffect } from 'react';
import LayoutRenderer from './LayoutRenderer';
import renderBlock from '../orchestration/renderBlock';
import styles from './DynamicDashboard.module.css';

export default function DynamicDashboard({ project }) {
  const [sections, setSections] = useState([]);
  const [layoutManifest, setLayoutManifest] = useState(null);
  // Change #1. Replace global filters state with tab-aware version
  // const [filters, setFilters] = useState({}); /*replacing global version*/
  // 🔑 Store filters per tab
  const [tabFilters, setTabFilters] = useState({});
  const [currentTabId, setCurrentTabId] = useState(null);
  // 🎯 Current tab's filters
  const currentFilters = currentTabId ? (tabFilters[currentTabId] || {}) : {};

  const [enableFilters, setEnableFilters] = useState(false);
  const [error, setError] = useState(null);
  const [columnAliases, setColumnAliases] = useState({});

  const dataPath = `/data/${project}-injected.json`;
  const layoutPath = `/layouts/${project}_layout.json`;
  const aliasUrl = `/data/column_aliases/${project}.json`;

  useEffect(() => {
    if (!project) {
      setError("No project specified");
      return;
    }

    // Load dashboard data
    fetch(dataPath)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${dataPath}`);
        return res.json();
      })
      .then(manifest => {
        console.log(`✅ Loaded dashboard data for ${project}`);
        setSections(manifest.dashboardSections || []);
        const hasFilterPanel = (manifest.dashboardSections || [])
          .some(section => section.blockKind === "DynamicFilterPanel");
        setEnableFilters(hasFilterPanel);
      })
      .catch(err => {
        console.error(`🚨 Error loading data for ${project}:`, err);
        setError(`Failed to load dashboard: ${err.message}`);
      });

    // Load optional layout file
    fetch(layoutPath)
      .then(response => {
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`⚠️ No layout found for ${project}, will render default vertical stack.`);
            return null;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        setLayoutManifest(data);
      })
      .catch(err => {
        console.error(`🚨 Layout load failed for ${project}:`, err);
      });

  }, [dataPath, layoutPath, project]);

  useEffect(() => {
      if (!project) return;

      fetch(aliasUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load alias file for ${project}`);
          return res.json();
        })
        .then(setColumnAliases)
        .catch((err) => {
          console.warn(`⚠️ No alias file found for ${project}. Using defaults.`);
          setColumnAliases({});
        });
    }, [aliasUrl, project]);


  // # 3 Update Logs Variables with new local filter state variables
  useEffect(() => {
    if (enableFilters) {
      console.log("🔍 Tab filter state changed:", tabFilters); /* This needs to be more generic*/
      console.log("Current tab: ", currentTabId, "Current filters: ", currentFilters)
    }
  }, [tabFilters, currentTabId, enableFilters]);

  useEffect(() => {
    console.log('🧩 Loaded aliases:', columnAliases);
  }, [columnAliases]);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!sections.length || Object.keys(columnAliases).length === 0) {
    return <div className={styles.loading}>Loading data...</div>;
  }

  // #4 Add new functions

  // 4.1
  // In DynamicDashboard.js - Updated handleFiltersChange
  const handleFiltersChange = (newFilters, tabId = currentTabId, options = {}) => {
    console.log(`🔄 DynamicDashboard: Updating filters for ${tabId || 'default/global'} tab:`, newFilters);
    console.log(`🔄 Options:`, options);

    if (tabId) {
      setTabFilters(prev => {
        const updated = {
          ...prev,
          [tabId]: newFilters // 🔑 REPLACE, don't merge
        };

        if (options.isRestore) {
          console.log(`🔄 RESTORING filters for tab ${tabId}:`, newFilters);
        } else {
          console.log(`💾 SAVING new filters for tab ${tabId}:`, newFilters);
        }

        console.log(`📊 All tab filters:`, updated);
        return updated;
      });
    }
  };


  // 4.2  🔑 Handle tab changes from TabbedContainer
  const handleTabChange = (tabChangeReport) => {
    if (tabChangeReport.type === 'cuisine_change') {
      console.log(`🔄 Tab change detected: ${tabChangeReport.oldCuisine} → ${tabChangeReport.newCuisine}`);
      setCurrentTabId(tabChangeReport.newCuisine);
    }
  };

  // 4.3 🔑 Handle context reports to track current tab
  const handleContextReport = (context) => {
    if (context.type === 'cuisine_status' && context.tabId) {
      if (currentTabId !== context.tabId) {
        console.log(`🎯 Context report received: switching to tab ${context.tabId}`);
        setCurrentTabId(context.tabId);
      }
    }
  };

  // #2 Replace onFiltersChange usage in JSX
  return (
    <div>
      <LayoutRenderer
        layoutManifest={layoutManifest}
        dashboardSections={sections}
        enableFilters={enableFilters}
        // filters={filters} // Replacing filters with currentFilters
        filters={currentFilters}
        // onFiltersChange={setFilters} // Replacing setFilters with local handle function
        onFiltersChange={handleFiltersChange}
        onTabChange={handleTabChange} // This will need to be renamed to be more generic
        onContextReport={handleContextReport} // This seems to be okay
        columnAliases={columnAliases}
      />

      {/*/!* 🐛 DEBUG: Show dashboard-level persistence *!/*/}
      {/*<div style={{*/}
      {/*  margin: '20px',*/}
      {/*  padding: '15px',*/}
      {/*  backgroundColor: '#fef3c7',*/}
      {/*  border: '2px solid #f59e0b',*/}
      {/*  borderRadius: '8px',*/}
      {/*  fontSize: '12px'*/}
      {/*}}>*/}
      {/*  <strong>📊 DynamicDashboard Filter State:</strong><br/>*/}
      {/*  Current Tab: {currentTabId || 'None'}<br/>*/}
      {/*  Current Tab Filters: {JSON.stringify(currentFilters)}<br/>*/}
      {/*  All Tab Filters: {JSON.stringify(tabFilters)}*/}
      {/*</div>*/}
    </div>
  );
}