import React, { useState, useEffect } from 'react';
import LayoutRenderer from './LayoutRenderer';
import renderBlock from '../orchestration/renderBlock';
import styles from './DynamicDashboard.module.css';

export default function DynamicDashboard({ project }) {
  const [sections, setSections] = useState([]);
  const [layoutManifest, setLayoutManifest] = useState(null);
  const [filters, setFilters] = useState({});
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

  useEffect(() => {
    if (enableFilters) {
      console.log("🔍 Filter state changed:", filters);
    }
  }, [filters, enableFilters]);

  useEffect(() => {
    console.log('🧩 Loaded aliases:', columnAliases);
  }, [columnAliases]);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!sections.length || Object.keys(columnAliases).length === 0) {
    return <div className={styles.loading}>Loading data...</div>;
  }

  return (
    <LayoutRenderer
      layoutManifest={layoutManifest}
      dashboardSections={sections}
      enableFilters={enableFilters}
      filters={filters}
      onFiltersChange={setFilters}
      columnAliases={columnAliases}
    />
  );
}