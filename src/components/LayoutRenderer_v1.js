import React, { useEffect, useState, useCallback } from 'react';
import renderBlock from '../orchestration/renderBlock';
import { buildFiltersFromDataDynamic } from '../utils/buildFiltersFromDataDynamic';
import styles from './LayoutRenderer.module.css';

export default function LayoutRenderer(
    {
      layoutUrl,
      layoutManifest: initialManifest,
      dashboardSections,
      enableFilters,
      filters,
      onFiltersChange,
      onTabChange, // 🔑 NEW: Handle tab changes from DynamicDashboard
      onContextReport, // 🔑 NEW: Handle context reports from DynamicDashboard
      columnAliases
    }) {
  const [layoutManifest, setLayoutManifest] = useState(initialManifest || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [momUpdates, setMomUpdates] = useState([]);
  const [lastReport, setLastReport] = useState(null);

  const [tabFilterContext, setTabFilterContext] = useState(null);

  // 🎯 CRITICAL: Build dynamic filters from active tab's data
  const tabScopedFilters = tabFilterContext?.tabData
    ? buildFiltersFromDataDynamic(tabFilterContext.tabData)
    : null;

  // 🍽️ RESTAURANT PROPS TRANSLATION HELPER
  const getRestaurantProps = useCallback((block, tabFilterContext, tabScopedFilters) => {
    const restaurantProps = {};

    // For FilterPanel (Utensil & Attribute Selector)
    if (block.blockKind.includes('FilterPanel')) {
      if (tabFilterContext?.tabData) {
        restaurantProps.regionalDishes = tabFilterContext.tabData;
        restaurantProps.cuisineType = tabFilterContext.label || 'Unknown Cuisine';
      }
    }

    // For CompanyPerformanceTable (Regional Menu Display)
    if (block.blockKind.includes('CompanyPerformanceTable')) {
      if (tabFilterContext?.tabData) {
        restaurantProps.regionalDishes = tabFilterContext.tabData;
        restaurantProps.cuisineType = tabFilterContext.label || 'Unknown Cuisine';
        // restaurantProps.customerFilterSelections = tabFilterContext.customerSelections || {}; // ✅ ADD THIS LINE
        restaurantProps.activeFilters = tabFilterContext.customerSelections || {};
      }
    }

    return restaurantProps;
  }, []);

  // Debug: Log filter scope changes
  useEffect(() => {
    if (tabScopedFilters) {
      console.log("🔍 Built tab-scoped filters:", tabScopedFilters.map(f => f.type));
      console.log("📊 Filter options count:",
        tabScopedFilters.map(f =>
          `${f.type}: ${f.options.length}`
        ).join(', ')
      );
    }
  }, [tabScopedFilters]);

  useEffect(() => {
    console.log("📝 tabFilterContext updated:", tabFilterContext?.type || 'null');

    if (tabFilterContext !== null) {
      console.log("✅ LayoutRenderer: Context validated and stored successfully");
      console.log("🏷️ Cuisine label:", tabFilterContext.label || 'Unknown');
      console.log("📦 Regional dishes:", tabFilterContext.tabData?.length || 0, "items");
      console.log("📋 Context type:", tabFilterContext.type);
    }
  }, [tabFilterContext]);

  useEffect(() => {
    // If we have an initial manifest, use it and don't fetch
    if (initialManifest) {
      console.log(`✅ Using provided layout manifest with ${initialManifest.layoutSections?.length || 0} sections`);
      setLayoutManifest(initialManifest);
      setLoading(false);
      return;
    }

    if (!layoutUrl) {
      // No layout URL provided - skip to fallback
      setLayoutManifest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Debug: Log full URL being fetched
    const fullUrl = window.location.origin + layoutUrl;
    console.log(`🔍 Fetching layout from: ${layoutUrl}`);
    console.log(`🔍 Full URL: ${fullUrl}`);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ Layout fetch timeout for ${layoutUrl}`);
      console.warn(`⏰ Full URL was: ${fullUrl}`);
      setLoading(false);
      setLayoutManifest(null);
    }, 5000); // 5 second timeout

    fetch(layoutUrl)
      .then(res => {
        clearTimeout(timeoutId);

        console.log(`📡 Response status: ${res.status} for ${layoutUrl}`);

        if (!res.ok) {
          if (res.status === 404) {
            console.warn(`⚠️ Layout file not found at ${layoutUrl}`);
            console.warn(`⚠️ Check if file exists: ${fullUrl}`);
            setLayoutManifest(null);
            setLoading(false);
            return null;
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          console.log(`✅ Loaded layout with ${data.layoutSections?.length || 0} sections`);
          setLayoutManifest(data);
        }
        setLoading(false);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.error("❌ Layout loading error:", err);
        console.error(`❌ Failed URL: ${fullUrl}`);
        setError(err.message);
        setLayoutManifest(null);
        setLoading(false);
      });
  }, [layoutUrl, initialManifest]);

  // UNIFIED: Handle all child reports - from tables, tabs, any component
  const handleChildReport = useCallback((context) => {
    const timestamp = new Date().toLocaleTimeString();

    // Validate basic report structure
    if (!context || typeof context !== 'object') {
      console.warn("👩 LayoutRenderer: Child sent invalid report:", context);
      return;
    }

    // 🔑 NEW: Forward tab changes to DynamicDashboard
    if (context.type === 'cuisine_change' && onTabChange) {
      console.log("🔄 LayoutRenderer: Forwarding tab change to DynamicDashboard:", context);
      onTabChange(context);
    }

    // 🔑 NEW: Forward context reports to DynamicDashboard
    if (onContextReport) {
      console.log("📝 LayoutRenderer: Forwarding context report to DynamicDashboard:", context.type);
      onContextReport(context);
    }

    // Different validation for different report types
    switch (context.type) {
      case 'tab_change':
      case 'cuisine_change':
      case 'meal_change':
        if (!context.oldTab && !context.oldCuisine && !context.oldMeal) {
          console.warn("👩 Mom: Tab/Cuisine change report missing info:", context);
          return;
        }
        const oldId = context.oldTab || context.oldCuisine || context.oldMeal;
        const newId = context.newTab || context.newCuisine || context.newMeal;
        console.log(`🔄 Mom: Selection changed from ${oldId} to ${newId}`);
        break;

      case 'tab_context':
      case 'cuisine_status':
      case 'restaurant_status':
        if (!context.tabId && !context.cuisineId) {
          console.warn("👩 Mom: Context report missing essential info:", context);
          return;
        }
        console.group("🧺 Mom: Component introduced itself with data");
        console.log("🏷️ Label:", context.label || context.cuisine);
        console.log("📊 Data:", `${context.tabData?.length || context.regionalDishes || 0} items`);
        console.log("🔍 Filter:", context.tabFilter || context.cuisineRequirements);
        console.log("📋 Schema:", context.schema);
        console.groupEnd();
        break;

      case 'variance_table':
      case 'menu_table_status':
      case 'dining_experience':
        if (!context.title && !context.cuisineType) {
          console.warn("👩 Mom: Table report missing essential data:", context);
          return;
        }
        console.group("📊 Mom: Table reported status");
        console.log("📋 Table:", context.title || `${context.cuisineType} Menu`);
        console.log("📊 Items:", `${context.filteredItems || context.dishesCustomerCanEat}/${context.totalItems || context.dishesAvailable}`);
        // console.log("🔍 Filters:", context.filters || context.customerFilterSelections);
        console.groupEnd();
        break;

      default:
        console.log("👩 Mom: Generic child report:", context.type || 'unknown', context);
    }

    // Store the report - this is what triggers restaurant prop updates
    setTabFilterContext(context);
    setLastReport(context);

    // Add to update history (keep last 10)
    setMomUpdates(prev => [...prev, { ...context, receivedAt: timestamp }].slice(-10));
  }, [onTabChange, onContextReport]);

  const renderLayoutSection = (layoutSection, index) => {
    const { layoutKind, settings = {} } = layoutSection;
    const children = settings.children || [];

    // Generate CSS classes from layout configuration
    const classNames = getLayoutClasses(layoutKind, settings);

    // Only use inline styles for truly dynamic values
    const dynamicStyles = getDynamicStyles(layoutKind, settings);

    return (
      <div
        key={index}
        className={classNames}
        style={dynamicStyles}
      >
        {children.map((child, childIndex) => renderChild(child, childIndex, layoutKind))}
      </div>
    );
  };

  const renderChild = (child, index, parentLayoutKind) => {
    // Handle string component references (simple case)
    if (typeof child === 'string') {
      const block = findMatchingBlock(child, dashboardSections);

      if (!block) {
        return (
          <div key={index} className={styles.missingComponent}>
            ⚠️ Component not found: <code>{child}</code>
          </div>
        );
      }

      return (
        <div key={index} className={styles.componentWrapper}>
          {renderBlock(block, enableFilters ? {
            activeFilters: filters,
            filters,
            onFiltersChange,
            columnAliases,
            // Pass tab filter context to ANY FilterPanel variant (legacy)
            ...(block.blockKind.includes('FilterPanel') && tabFilterContext && {
              tabFilterContext: tabFilterContext
            }),
            // 🍽️ RESTAURANT: Pass regional dishes and cuisine type
            ...getRestaurantProps(block, tabFilterContext, tabScopedFilters),
            // Pass unified child report handler
            onContextReport: handleChildReport,
            // Pass tab change handler to TabbedContainer variants
            ...((block.blockKind.includes('TabbedContainer') || block.blockKind.includes('Tabbed')) && {
              onTabChange: handleChildReport
            })
          } : {
            // Even when filters disabled, pass restaurant props and handlers
            ...getRestaurantProps(block, tabFilterContext, tabScopedFilters),
            onContextReport: handleChildReport,
            ...((block.blockKind.includes('TabbedContainer') || block.blockKind.includes('Tabbed')) && {
              onTabChange: handleChildReport
            })
          })}
        </div>
      );
    }

    // Handle component instances (generalized multiplier)
    else if (typeof child === 'object' && child.component && child.instances) {
      return renderComponentInstances(child, index);
    }

    // Handle direct block definitions in layout templates
    else if (typeof child === 'object' && child.blockKind) {
      const layoutContext = {
        parentLayoutKind,
        index,
        layoutSpacing: getLayoutSpacing(parentLayoutKind),
        layoutSize: getLayoutSize(parentLayoutKind)
      };

      return (
        <div key={index} className={styles.componentWrapper}>
          {
            renderBlock({
              ...child,
              settings: {
                ...child.settings,
                layoutContext
              }
            }, {
              ...(enableFilters && {
                activeFilters: filters,
                onFiltersChange
              }),
              // Pass unified child report handler to ANY component
              onContextReport: handleChildReport,
              // Pass tab change handler to TabbedContainer variants
              ...((child.blockKind.includes('TabbedContainer') || child.blockKind.includes('Tabbed')) && {
                onTabChange: handleChildReport
              }),
              // 🍽️ RESTAURANT: Pass regional dishes and cuisine type
              ...getRestaurantProps(child, tabFilterContext, tabScopedFilters)
            })
          }
        </div>
      );
    }

    // Handle component with settings (TabbedContainer case)
    else if (typeof child === 'object' && child.component) {
      // Find the actual block data from dashboardSections
      const matchingBlock = findMatchingBlock(child.component, dashboardSections);

      if (matchingBlock) {
        console.log('🔍 LayoutRenderer found matching block:', matchingBlock.blockKind);

        const layoutContext = {
          parentLayoutKind,
          index,
          layoutSpacing: getLayoutSpacing(parentLayoutKind),
          layoutSize: getLayoutSize(parentLayoutKind)
        };

        return (
          <div key={index} className={styles.componentWrapper}>
            {renderBlock({
              ...matchingBlock,
              settings: {
                ...matchingBlock.settings,
                layoutContext
              }
            }, enableFilters ? {
              activeFilters: filters,
              onFiltersChange,
              // Pass unified child report handler to ANY component
              onContextReport: handleChildReport,
              // Pass tab change handler to TabbedContainer variants
              ...((matchingBlock.blockKind.includes('TabbedContainer') || matchingBlock.blockKind.includes('Tabbed')) && {
                onTabChange: handleChildReport
              }),
              // 🍽️ RESTAURANT: Pass regional dishes and cuisine type
              ...getRestaurantProps(matchingBlock, tabFilterContext, tabScopedFilters)
            } : {
              // Even when filters are disabled, components can still report and use restaurant props
              onContextReport: handleChildReport,
              // Still pass tab change handler
              ...((matchingBlock.blockKind.includes('TabbedContainer') || matchingBlock.blockKind.includes('Tabbed')) && {
                onTabChange: handleChildReport
              }),
              // 🍽️ RESTAURANT: Pass regional dishes and cuisine type even when filters disabled
              ...getRestaurantProps(matchingBlock, tabFilterContext, tabScopedFilters)
            })}
          </div>
        );
      } else {
        console.warn('⚠️ LayoutRenderer could not find block for component:', child.component);
        return (
          <div key={index} className={styles.missingComponent}>
            ⚠️ Component not found: <code>{child.component}</code>
          </div>
        );
      }
    }

    // Handle nested layouts
    else if (typeof child === 'object' && child.layoutKind) {
      return renderLayoutSection(child, index);
    }

    return null;
  };

  // Helper functions for layout context
  const getLayoutSpacing = (layoutKind) => {
    switch (layoutKind) {
      case 'Container': return 'md';
      case 'Section': return 'lg';
      case 'VerticalStack': return 'md';
      case 'HorizontalStack': return 'lg';
      default: return 'md';
    }
  };

  const getLayoutSize = (layoutKind) => {
    switch (layoutKind) {
      case 'Container': return 'full';
      case 'Section': return 'contained';
      default: return 'auto';
    }
  };

  const renderComponentInstances = (instanceConfig, baseIndex) => {
    const { component, instances } = instanceConfig;

    // Find the base component
    const baseBlock = findMatchingBlock(component, dashboardSections);

    if (!baseBlock) {
      return (
        <div key={baseIndex} className={styles.missingComponent}>
          ⚠️ Base component not found: <code>{component}</code>
        </div>
      );
    }

    // Render each instance with its custom settings
    return instances.map((instanceSettings, instanceIndex) => {
      // Merge base block settings with instance settings
      const instanceBlock = {
        ...baseBlock,
        settings: {
          ...baseBlock.settings,
          ...instanceSettings,
          // Preserve original data but allow override
          data: instanceSettings.data || baseBlock.settings.data
        }
      };

      const key = `${baseIndex}-instance-${instanceIndex}`;

      return (
        <div key={key} className={styles.componentWrapper}>
          {renderBlock(instanceBlock, enableFilters ? {
            activeFilters: filters,
            onFiltersChange,
            // Pass unified child report handler to ANY component
            onContextReport: handleChildReport,
            // 🍽️ RESTAURANT: Pass regional dishes and cuisine type
            ...getRestaurantProps(instanceBlock, tabFilterContext, tabScopedFilters)
          } : {
            // Even when filters disabled, components can still report and use restaurant props
            onContextReport: handleChildReport,
            ...getRestaurantProps(instanceBlock, tabFilterContext, tabScopedFilters)
          })}
        </div>
      );
    });
  };

  const findMatchingBlock = (componentName, sections) => {
    if (!sections || !Array.isArray(sections)) return null;

    // Try exact match first
    let block = sections.find(section => section.blockKind === componentName);
    if (block) return block;

    // Try without "Dynamic" prefix
    const withoutDynamic = componentName.replace('Dynamic', '');
    block = sections.find(section => section.blockKind.includes(withoutDynamic));
    if (block) return block;

    // Try partial match
    block = sections.find(section =>
      section.blockKind.includes(componentName) ||
      componentName.includes(section.blockKind)
    );

    return block;
  };

  const getLayoutClasses = (layoutKind, settings) => {
    const classes = [];

    const baseClass = `layout${layoutKind}`;
    classes.push(styles[baseClass] || styles.layoutDefault);

    // 🎯 ADD THIS: map your spacing system
    const spacingLevel = getLayoutSpacing(layoutKind); // 'md' or 'lg'
    if (spacingLevel) {
      const spacingClass = `spacing${spacingLevel.charAt(0).toUpperCase() + spacingLevel.slice(1)}`; // 'spacingMd'
      if (styles[spacingClass]) {
        classes.push(styles[spacingClass]);
      }
    }

    return classes.filter(Boolean).join(' ');
  };

  const getDynamicStyles = (layoutKind, settings) => {
    const dynamicStyle = {};

    // Only inline styles for truly dynamic values that can't be CSS classes

    // Dynamic widths/heights
    if (settings.maxWidth && !['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'].includes(settings.maxWidth)) {
      dynamicStyle.maxWidth = settings.maxWidth;
    }

    if (settings.width) {
      dynamicStyle.width = settings.width;
    }

    if (settings.height) {
      dynamicStyle.height = settings.height;
    }

    // Dynamic grid columns (can't predict exact number)
    if (layoutKind === 'MetricGridLayout' && settings.columns) {
      dynamicStyle.gridTemplateColumns = `repeat(${settings.columns}, minmax(0, 1fr))`;
    }

    if (layoutKind === 'GridContainer' && settings.columns) {
      dynamicStyle.gridTemplateColumns = `repeat(${settings.columns}, minmax(0, 1fr))`;
    }

    // Dynamic grid areas
    if (settings.areas && Array.isArray(settings.areas)) {
      dynamicStyle.gridTemplateAreas = settings.areas.map(area => `"${area}"`).join(' ');
    }

    // Dynamic flex grow/shrink for responsive layouts
    if (settings.flexGrow !== undefined) {
      dynamicStyle.flexGrow = settings.flexGrow;
    }

    if (settings.flexShrink !== undefined) {
      dynamicStyle.flexShrink = settings.flexShrink;
    }

    // Dynamic colors/backgrounds that come from tokens
    if (settings.background && settings.background.startsWith('#')) {
      dynamicStyle.backgroundColor = settings.background;
    }

    return Object.keys(dynamicStyle).length > 0 ? dynamicStyle : undefined;
  };

  // Show error state
  if (error) {
    return (
      <div className={styles.layoutError}>
        <p>⚠️ Layout error: {error}</p>
        <p>Falling back to default layout...</p>
        <div className={styles.layoutFallback}>
          {dashboardSections?.map((block, i) => (
            <div key={i} className={styles.componentWrapper}>
              {renderBlock(block, {
                ...getRestaurantProps(block, tabFilterContext, tabScopedFilters),
                onContextReport: handleChildReport
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show loading state only briefly
  if (loading) {
    return <div className={styles.layoutLoading}>Loading layout...</div>;
  }

  const getStatusColor = (stage) => {
    switch (stage) {
      case 'started': return '#3b82f6';
      case 'placing': return '#f59e0b';
      case 'complete': return '#10b981';
      case 'tab_changed': return '#8b5cf6';
      case 'cleanup': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Render with layout manifest if available
  if (layoutManifest?.layoutSections) {
    return (
      <div className={styles.layoutRenderer}>
        {layoutManifest.layoutSections.map(renderLayoutSection)}
        <div style={{
          marginTop: '20px',
          padding: '20px',
          border: '2px solid #ec4899',
          borderRadius: '8px',
          backgroundColor: '#fdf2f8'
        }}>
          <h3>👩 Mom Component (The Restaurant Manager)</h3>

          {lastReport && (
            <div style={{ marginBottom: '15px' }}>
              <h4>📡 Latest Report:</h4>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #d1d5db'
              }}>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: getStatusColor(lastReport.stage || lastReport.type),
                  color: 'white',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '10px'
                }}>
                  {(lastReport.stage || lastReport.type || 'UPDATE').toUpperCase()}
                </div>
                <pre style={{
                  fontSize: '12px',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify(lastReport, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div>
            <h4>📊 Restaurant Activity History (Last 10):</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {momUpdates.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No activity yet... (Waiting for customer orders)</p>
              ) : (
                momUpdates.map((update, i) => (
                  <div key={i} style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    marginBottom: '5px',
                    fontSize: '14px'
                  }}>
                    <span style={{
                      color: update.type === 'tab_change' || update.type === 'cuisine_change' ? '#8b5cf6' :
                             update.type === 'tab_context' || update.type === 'restaurant_status' ? '#f59e0b' :
                             update.type === 'variance_table' || update.type === 'dining_experience' ? '#10b981' :
                             getStatusColor(update.stage),
                      fontWeight: 'bold'
                    }}>
                      [{update.receivedAt}]
                    </span>
                    {' '}
                    <span style={{ color: '#374151' }}>
                      {(update.type === 'tab_change' || update.type === 'cuisine_change') &&
                        `🍽️ Cuisine ${update.oldTab || update.oldCuisine} → ${update.newTab || update.newCuisine}`}
                      {(update.type === 'tab_context' || update.type === 'restaurant_status') &&
                        `🌍 Cuisine "${update.label || update.cuisine}" ready - ${update.tabData?.length || update.regionalDishes || 0} dishes available`}
                      {(update.type === 'variance_table' || update.type === 'dining_experience') &&
                        `📊 Menu "${update.title || update.cuisineType}" - ${update.filteredItems || update.dishesCustomerCanEat}/${update.totalItems || update.dishesAvailable} dishes`}
                      {update.stage === 'placing' && `Pebble ${update.pebbleIndex}/${update.total} (${Math.round(update.progress)}%)`}
                      {update.stage === 'started' && `Started race - ${update.totalPebbles} pebbles, ${update.tabData?.length} filtered items`}
                      {update.stage === 'complete' && `Race completed! ${update.containerContents?.length} pebbles, filter: ${JSON.stringify(update.tabFilter)}`}
                      {update.stage === 'cleanup' && `Cleanup: ${update.reason}`}
                      {!update.type && !update.stage && 'Unknown activity'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to simple vertical stack (no layout manifest)
  return (
    <div className={styles.layoutRenderer}>
      {dashboardSections?.map((block, i) => {
        const isTabbedContainer = block.blockKind.includes('TabbedContainer');

        return (
          <div key={i} className={styles.componentWrapper}>
            {renderBlock(block, enableFilters ? {
              activeFilters: filters,
              onFiltersChange,
              onContextReport: handleChildReport,
              // 🔑 Pass tab change handler to TabbedContainer
              ...(isTabbedContainer && { onTabChange: handleChildReport }),
              ...getRestaurantProps(block, tabFilterContext, tabScopedFilters)
            } : {
              onContextReport: handleChildReport,
              // 🔑 Pass tab change handler even when filters disabled
              ...(isTabbedContainer && { onTabChange: handleChildReport }),
              ...getRestaurantProps(block, tabFilterContext, tabScopedFilters)
            })}
          </div>
        );
      })}
    </div>
  );
}