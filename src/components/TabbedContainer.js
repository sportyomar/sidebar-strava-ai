import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import renderBlock from '../orchestration/renderBlock';
import styles from './TabbedContainer.module.css'; // CSS Module

export default function TabbedContainer({
  tabs = [],
  defaultTab,
  orientation = 'horizontal',
  lazy = true,
  onTabChange,
  onContextReport,
  columnAliases,
  filters,
  onFiltersChange
}) {
  const [statusExpanded, setStatusExpanded] = useState({});
  const [selectedCuisine, setSelectedCuisine] = useState(defaultTab || tabs[0]?.id);
  const [customerFilterSelections, setCustomerFilterSelections] = useState({});
  const previousCuisineRef = useRef(null);

  const activeCuisineData = tabs.find(tab => tab.id === selectedCuisine);

  const cuisineRequirements = useMemo(() => (
    activeCuisineData?.content?.[0]?.settings?.filter || {}
  ), [activeCuisineData, selectedCuisine]);

  const allAvailableDishes = useMemo(() => {
    if (!activeCuisineData?.content) return [];
    return activeCuisineData.content
      .map(block => block.settings?.data)
      .filter(Array.isArray)
      .flat();
  }, [activeCuisineData, selectedCuisine]);

  const regionalDishes = useMemo(() => {
    if (!cuisineRequirements || Object.keys(cuisineRequirements).length === 0) return allAvailableDishes;
    return allAvailableDishes.filter(dish =>
      Object.entries(cuisineRequirements).every(([req, val]) => dish[req] === val)
    );
  }, [allAvailableDishes, cuisineRequirements, selectedCuisine]);

  const toggleStatus = (cuisineId) => {
    setStatusExpanded(prev => ({
      ...prev,
      [cuisineId]: !prev[cuisineId]
    }));
  };


  useEffect(() => {
    setCustomerFilterSelections({});
    previousCuisineRef.current = selectedCuisine;
  }, [selectedCuisine]);

  useEffect(() => {
    if (onContextReport && activeCuisineData) {
      onContextReport({
        type: 'cuisine_status',
        label: activeCuisineData.label,
        tabId: selectedCuisine,
        cuisineId: selectedCuisine,
        tabData: [...regionalDishes],
        cuisineRequirements: { ...cuisineRequirements },
        customerSelections: { ...customerFilterSelections },
        timestamp: new Date().toISOString()
      });
    }
  }, [customerFilterSelections, activeCuisineData, selectedCuisine, regionalDishes, cuisineRequirements, onContextReport]);

  const handleCuisineChange = useCallback((newCuisineId) => {
    if (newCuisineId === selectedCuisine) return;
    onTabChange?.({
      type: 'cuisine_change',
      oldCuisine: selectedCuisine,
      newCuisine: newCuisineId,
      timestamp: new Date().toISOString()
    });
    setSelectedCuisine(newCuisineId);
  }, [selectedCuisine, onTabChange]);

  const handleFilterChange = useCallback((newSelections) => {
    // 1. Update local context (for DynamicFilterPanel to know current tab scope)
    setCustomerFilterSelections(newSelections);

    // 2. Update global filters (actual filter state that affects all components)
    onFiltersChange?.(newSelections);

    // 3. Continue with context reporting...
    if (onContextReport && activeCuisineData) {
      onContextReport({
        type: 'cuisine_status',
        label: activeCuisineData.label,
        tabId: selectedCuisine,
        cuisineId: selectedCuisine,
        tabData: [...regionalDishes],
        cuisineRequirements: { ...cuisineRequirements },
        customerSelections: { ...newSelections },
        timestamp: new Date().toISOString()
      });
    }
  }, [onContextReport, activeCuisineData, selectedCuisine, regionalDishes, cuisineRequirements, onFiltersChange]);

  const renderCuisineMenu = (cuisine) => {
    const isExpanded = statusExpanded[cuisine.id] ?? false;

    return (
      <div>
        {/*<div className={styles.cuisineSummary}>*/}
        {/*  <div className={styles.statusHeader} onClick={() => toggleStatus(cuisine.id)}>*/}
        {/*    <strong>STATUS</strong>*/}
        {/*    <button*/}
        {/*      className={styles.toggleButton}*/}
        {/*      aria-label="Toggle status section"*/}
        {/*      type="button"*/}
        {/*    >*/}
        {/*      {isExpanded ? '▲' : '▼'}*/}
        {/*    </button>*/}
        {/*  </div>*/}

        {/*  {isExpanded && (*/}
        {/*    <div className={styles.statusContent}>*/}
        {/*      Selected: {cuisine.label}<br />*/}
        {/*      Regional Available: {regionalDishes.length}<br />*/}
        {/*      Customer Filter Selections: {JSON.stringify(filters)}<br />*/}
        {/*      {regionalDishes.length > 0 && <>Sample: {JSON.stringify(regionalDishes[0])}</>}*/}
        {/*      Column Aliases:*/}
        {/*      <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', marginTop: '4px' }}>*/}
        {/*        {JSON.stringify(columnAliases, null, 2)}*/}
        {/*      </pre>*/}
        {/*    </div>*/}
        {/*  )}*/}
        {/*</div>*/}

        {cuisine.content?.map((block, index) => {
          const props = {
            tabId: cuisine.id,
            regionalDishes,
            cuisineType: cuisine.label,
            activeFilters: filters,
            onFiltersChange: handleFilterChange,
            columnAliases,
            filters: cuisineRequirements
          };
          return (
            <div key={index} className={styles.blockWrapper}>
              {renderBlock(block, props)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabHeader}>
        {tabs.map(cuisine => (
          <button
            key={cuisine.id}
            onClick={() => handleCuisineChange(cuisine.id)}
            className={`${styles.tabButton} ${selectedCuisine === cuisine.id ? styles.tabButtonActive : ''}`}
          >
            {cuisine.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {lazy ? (
          activeCuisineData ? renderCuisineMenu(activeCuisineData) : (
            <div className={styles.message}>
              ⚠️ Cuisine not available
            </div>
          )
        ) : (
          tabs.map(cuisine => (
            <div
              key={cuisine.id}
              className={selectedCuisine === cuisine.id ? '' : styles.hidden}
            >
              {renderCuisineMenu(cuisine)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
