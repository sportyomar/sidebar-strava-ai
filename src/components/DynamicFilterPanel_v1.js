import React, { useState, useMemo, useEffect } from 'react';
import { buildFiltersFromDataDynamic } from '../utils/buildFiltersFromDataDynamic';
import styles from './DynamicFilterPanel.module.css';

export default function DynamicFilterPanel({
  regionalDishes = [],
  cuisineType = 'Unknown',
  filters = [],
  onFiltersChange,
  activeFilters,
  columnAliases
}) {
  console.log('🔧 FILTER PANEL: Analyzing', cuisineType, 'cuisine');
  console.log('- Regional dishes to analyze:', regionalDishes?.length || 0);
  console.log('- Active filters received:', activeFilters);

  // Your manual ordering of filter types
  const filterOrder = [
    'company_name',
    'sector',
    'planned_revenue',
    'actual_revenue',
    'plan_variance_percent',
    'cash_flow_status',
  ];

  // 🔑 NEW: Tab-scoped filter storage
  const [tabScopedSelections, setTabScopedSelections] = useState({});

  const availableFilters = useMemo(() => {
    const dishesToAnalyze = regionalDishes && regionalDishes.length > 0 ? regionalDishes : [];
    if (dishesToAnalyze.length === 0) return [];
    const filters = buildFiltersFromDataDynamic(dishesToAnalyze);
    console.log('🔧 FILTERS BUILT for', cuisineType, ':', filters);
    return filters;
  }, [regionalDishes, cuisineType]);

  const filtersToShow = Array.isArray(availableFilters) && availableFilters.length > 0
    ? availableFilters
    : Array.isArray(filters) ? filters : [];

  const orderedFilters = useMemo(() => {
    // ensure we follow your manual order
    const filtersByType = Object.fromEntries(filtersToShow.map(f => [f.type, f]));
    return filterOrder
      .map(type => filtersByType[type])
      .filter(Boolean);
  }, [filtersToShow, filterOrder]);

  const initialSelections = useMemo(() => {
    const selections = {};
    orderedFilters.forEach(filter => selections[filter.type] = []);
    return selections;
  }, [orderedFilters]);

  // 🔑 NEW: Get current tab's filter selections
  const currentTabSelections = tabScopedSelections[cuisineType] || initialSelections;

  // 🔑 NEW: Use activeFilters from global state if available, otherwise use tab-scoped selections
  const customerSelections = activeFilters && Object.keys(activeFilters).length > 0
    ? activeFilters
    : currentTabSelections;

  // 🔑 NEW: Initialize tab-scoped selections when tab changes
  useEffect(() => {
    if (!tabScopedSelections[cuisineType]) {
      console.log('🔄 INITIALIZING tab-scoped filters for:', cuisineType);
      setTabScopedSelections(prev => ({
        ...prev,
        [cuisineType]: initialSelections
      }));
    }
  }, [cuisineType, initialSelections]);

  const handleFilterSelection = (filterType, option) => {
    const current = customerSelections[filterType] || [];
    const updated = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option];
    const newSelections = { ...customerSelections, [filterType]: updated };

    console.log('✨ NEW SELECTIONS for', cuisineType, ':', newSelections);

    // 🔑 NEW: Update tab-scoped selections
    setTabScopedSelections(prev => ({
      ...prev,
      [cuisineType]: newSelections
    }));

    // Still call global handler for persistence
    onFiltersChange?.(newSelections);
  };

  const handleClearAll = () => {
    console.log('🗑️ CLEARING ALL FILTERS for', cuisineType);
    const emptySelections = initialSelections;

    // 🔑 NEW: Clear only current tab's selections
    setTabScopedSelections(prev => ({
      ...prev,
      [cuisineType]: emptySelections
    }));

    onFiltersChange?.(emptySelections);
  };

  const handleClearFilter = (filterType) => {
    const newSelections = { ...customerSelections, [filterType]: [] };

    // 🔑 NEW: Update only current tab's selections
    setTabScopedSelections(prev => ({
      ...prev,
      [cuisineType]: newSelections
    }));

    onFiltersChange?.(newSelections);
  };

  const hasSelections = useMemo(() => {
    return Object.values(customerSelections).some(arr => arr && arr.length > 0);
  }, [customerSelections]);

  if (!orderedFilters.length) {
    return (
      <div className={styles.panel}>
        <div style={{ padding: '12px', color: '#6b7280', textAlign: 'center' }}>
          🔧 No filters available for {cuisineType}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelContent}>
        {/*<div style={{*/}
        {/*  display: 'flex', justifyContent: 'space-between', alignItems: 'center',*/}
        {/*  marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb'*/}
        {/*}}>*/}
        {/*  <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>*/}
        {/*    🔧 Filters for {cuisineType}*/}
        {/*  </div>*/}
        {/*  {hasSelections && (*/}
        {/*    <button onClick={handleClearAll} style={{*/}
        {/*      fontSize: '12px', color: '#6b7280', background: 'none',*/}
        {/*      border: 'none', cursor: 'pointer', textDecoration: 'underline'*/}
        {/*    }}>*/}
        {/*      Clear all*/}
        {/*    </button>*/}
        {/*  )}*/}
        {/*</div>*/}

        {orderedFilters.map((filter) => {
          const selectedCount = customerSelections[filter.type]?.length || 0;
          const sortedOptions = [...filter.options].sort((a, b) => {
            if (typeof a === 'string' && typeof b === 'string') {
              return a.localeCompare(b);
            }
            return String(a).localeCompare(String(b)); // fallback: convert to string
          });

          const formatOption = (type, value) => {
            const numericValue = Number(value);
            if (isNaN(numericValue)) return value;

            if (type === 'planned_revenue' || type === 'actual_revenue') {
              return `$${(numericValue / 1_000_000).toFixed(0)}M`;
            }

            if (type === 'plan_variance_percent') {
              return `${numericValue}%`;
            }

            return value;
          };

          return (
              <div key={filter.type} className={styles.filterGroup}>
                <div className={styles.filterTitle}
                     style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <span>{columnAliases?.[filter.type] || filter.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    {selectedCount > 0 && (
                        <span style={{
                          fontSize: '12px', color: '#0070f3',
                          fontWeight: 'normal', marginLeft: '8px'
                        }}>
                    ({selectedCount} selected)
                  </span>
                    )}
                  </div>
                  {selectedCount > 0 && (
                      <button
                          onClick={() => handleClearFilter(filter.type)}
                          style={{
                            fontSize: '11px',
                            background: 'none',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0
                          }}
                      >
                        Clear
                      </button>
                  )}
                </div>
                <div className={styles.options}>
                  {sortedOptions.map((option, i) => (
                      <label key={i} className={styles.option}>
                        <input
                            className={styles.checkboxStyle}
                            type="checkbox"
                            checked={customerSelections[filter.type]?.includes(option) || false}
                            onChange={() => handleFilterSelection(filter.type, option)}
                        />
                        <span>{formatOption(filter.type, option)}</span>
                      </label>
                  ))}
                </div>
              </div>
          );
        })}

        {hasSelections && (
            <div style={{
              marginTop: '20px', padding: '12px', backgroundColor: '#f3f4f6',
              borderRadius: '6px', fontSize: '12px', color: '#6b7280'
            }}>
              <strong style={{color: '#374151'}}>Current Selections for {cuisineType}:</strong>
              <div style={{marginTop: '8px'}}>
                {Object.entries(customerSelections)
                    .filter(([_, v]) => v && v.length > 0)
                    .map(([type, v]) => (
                        <div key={type} style={{marginBottom: '4px'}}>
                          {type.replace(/_/g, ' ')}: {v.join(', ')}
                        </div>
                    ))}
              </div>
            </div>
        )}
      </div>
    </div>
  );
}