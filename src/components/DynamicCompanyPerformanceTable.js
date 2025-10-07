import React, { useMemo, useEffect, useState } from 'react';
import styles from './DynamicCompanyPerformanceTable.module.css';
import EventBus from '../utils/EventBus';

export default function DynamicCompanyPerformanceTable({
  activeFilters = {},
  cuisineType = 'Unknown',
  title,
  onContextReport,
  columnAliases = {},
  filters = {}
}) {
  const [dishes, setDishes] = useState([]);

  // ⛳️ Load from layout settings.data
  useEffect(() => {
    const unsubscribe = EventBus.onComponentMounted((context) => {
      const data = context?.settings?.data;
      if (Array.isArray(data)) {
        console.log("📬 DynamicCompanyPerformanceTable received data:", data?.slice(0, 2));
        setDishes(data);
      }
    });
    return unsubscribe;
  }, []);

  const columnOrder = [
    'company_name',
    'sector',
    'planned_revenue',
    'actual_revenue',
    'plan_variance_percent',
    'cash_flow_status',
    'performance_tier',
    'variance_flag',
    'requires_deep_dive'
  ];

  const hiddenColumns = [
    'requires_deep_dive',
    'performance_tier',
    'variance_flag'
  ];

  // 💡 Filter by internal filters (e.g., tab context)
  const internallyFilteredDishes = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) return dishes;
    return dishes.filter(dish =>
      Object.entries(filters).every(([key, val]) => dish[key] === val)
    );
  }, [dishes, filters]);

  // 🧠 Apply checkbox filters
  const filteredDishes = useMemo(() => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) return internallyFilteredDishes;
    return internallyFilteredDishes.filter(dish =>
      Object.entries(activeFilters).every(([filterType, selectedOptions]) => {
        if (!selectedOptions.length) return true;
        return selectedOptions.includes(dish[filterType]);
      })
    );
  }, [internallyFilteredDishes, activeFilters]);

  function formatLabel(str) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // 🏗️ Generate columns dynamically from data
  const tableColumns = useMemo(() => {
    if (!dishes.length) return [];

    const allAttributes = new Set();
    dishes.forEach(d => Object.keys(d).forEach(attr => allAttributes.add(attr)));

    const attrTypeMap = {};
    dishes.forEach(d => {
      Object.entries(d).forEach(([k, v]) => {
        if (!(k in attrTypeMap)) attrTypeMap[k] = typeof v === 'number' ? 'number' : 'text';
      });
    });

    const orderedColumns = columnOrder
      .filter(attr => allAttributes.has(attr))
      .map(attr => ({
        key: attr,
        label: columnAliases[attr] || formatLabel(attr),
        type: attrTypeMap[attr] || 'text'
      }));

    const extraColumns = [...allAttributes].filter(attr => !columnOrder.includes(attr)).map(attr => ({
      key: attr,
      label: columnAliases[attr] || formatLabel(attr),
      type: attrTypeMap[attr] || 'text'
    }));

    return [...orderedColumns, ...extraColumns].filter(col => !hiddenColumns.includes(col.key));
  }, [dishes, columnAliases]);

  // 📣 Notify parent context
  useEffect(() => {
    onContextReport?.({
      type: 'menu_table_status',
      cuisineType,
      totalRegionalDishes: dishes.length,
      filteredDishes: filteredDishes.length,
      activeFilters,
      internalFilters: filters,
      tableColumns: tableColumns.map(c => c.key),
      timestamp: new Date().toISOString()
    });
  }, [dishes.length, filteredDishes.length, activeFilters, filters, tableColumns, onContextReport, cuisineType]);

  function formatCurrency(value) {
    if (value == null || isNaN(value)) return '-';
    const abs = Math.abs(value);
    const prefix = value < 0 ? '-' : '';
    const format = n => n.toFixed(0);
    if (abs >= 1_000_000) return `${prefix}$${format(abs / 1_000_000)}M`;
    if (abs >= 1_000) return `${prefix}$${format(abs / 1_000)}K`;
    return `${prefix}$${abs}`;
  }

  return (
    <div className={styles.tableContainer}>
      {!filteredDishes.length ? (
        <div style={{
          textAlign: 'center',
          color: '#6b7280',
          padding: '40px 20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px dashed #d1d5db'
        }}>
          {dishes.length === 0 ? (
            <>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>No {cuisineType.toLowerCase()} data available</div>
              <div style={{ fontSize: '14px' }}>Please check back later</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>No records match selections</div>
              <div style={{ fontSize: '14px' }}>Try adjusting filters</div>
            </>
          )}
        </div>
      ) : (
        <div className={styles.noBounceWrapper}>
          <div className={styles.scrollWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {tableColumns.map(col => (
                    <th key={col.key} className={styles.headerCell}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDishes.map((row, idx) => (
                  <tr key={idx} className={styles.row}>
                    {tableColumns.map(col => {
                      const val = row[col.key];
                      const content =
                        col.key === 'planned_revenue' || col.key === 'actual_revenue'
                          ? formatCurrency(val)
                          : col.key === 'plan_variance_percent'
                            ? `${val ?? '-'}%`
                            : val ?? '-';
                      return (
                        <td
                          key={col.key}
                          className={`${styles.cell} ${
                            col.type === 'number' ? styles.alignRight : styles.alignLeft
                          }`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
