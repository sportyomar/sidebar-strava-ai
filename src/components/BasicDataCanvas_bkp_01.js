import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useDataTransform } from './charts/hooks/useDataTransform';
import { useDataCommands } from './charts/hooks/useDataCommands';
import AICommandInput from './AICommandInput';
import { Undo, Redo } from 'lucide-react';

const BasicDataCanvas = () => {
  const svgRef = useRef();
  const dataTransform = useDataTransform();
  const dataCommands = useDataCommands(dataTransform);

  // Store D3 selections for efficient updates
  const d3Selections = useRef({
    svg: null,
    dataGroup: null,
    tables: {}
  });

  // Canvas dimensions
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;
  const TABLE_ITEM_WIDTH = 200;
  const TABLE_ITEM_HEIGHT = 40;
  const TABLE_ITEM_GAP = 10;

  // ONE-TIME D3 SETUP
  useEffect(() => {
    if (d3Selections.current.svg) return;
    initializeD3Canvas();
  }, []);

  // REACT STATE UPDATES
  useEffect(() => {
    updateD3FromReactState();
  }, [dataTransform.connectionStatus, dataTransform.availableTables, dataTransform.selectedTable]);

  // Watch for history changes
  useEffect(() => {
    updateCanvasVisuals();
  }, [dataTransform.historyVersion]);

  const initializeD3Canvas = () => {
    const svg = d3.select(svgRef.current);
    d3Selections.current.svg = svg;

    // Clear any existing content
    svg.selectAll("*").remove();

    svg.attr("width", CANVAS_WIDTH).attr("height", CANVAS_HEIGHT);

    // Create main data group
    const dataGroup = svg.append('g').attr('class', 'data-group');
    d3Selections.current.dataGroup = dataGroup;

    // Get D3 event handlers
    const d3Handlers = dataTransform.createD3EventHandlers();

    // Add click to clear selection
    svg.on('click', () => {
      d3Handlers.onBackgroundClick();
    });

    console.log('D3 data canvas initialized');
  };

  const updateD3FromReactState = () => {
    if (!d3Selections.current.svg) return;

    console.log('Updating data canvas:', {
      connectionStatus: dataTransform.connectionStatus,
      availableTables: dataTransform.availableTables,
      selectedTable: dataTransform.selectedTable
    });

    updateCanvasVisuals();
  };

  const updateCanvasVisuals = () => {
    if (!d3Selections.current.dataGroup) return;

    const dataGroup = d3Selections.current.dataGroup;

    // Clear existing tables
    dataGroup.selectAll('.table-item').remove();
    d3Selections.current.tables = {};

    // Render connection status
    renderConnectionStatus(dataGroup);

    // Render tables if connected
    if (dataTransform.connectionStatus === 'connected' && dataTransform.availableTables.length > 0) {
      renderTables(dataGroup);
    }

    // Render query results if available
    if (dataTransform.queryResults) {
      renderQueryResults(dataGroup);
    }
  };

  const renderConnectionStatus = (group) => {
    // Clear existing status elements
    group.selectAll('.connection-status').remove();

    const statusY = 30;
    const statusX = 30;

    // Status indicator circle
    const statusColor = {
      'disconnected': '#9ca3af',
      'connecting': '#eab308',
      'connected': '#22c55e',
      'error': '#ef4444'
    }[dataTransform.connectionStatus] || '#9ca3af';

    group.append('circle')
      .attr('class', 'connection-status')
      .attr('cx', statusX)
      .attr('cy', statusY)
      .attr('r', 8)
      .attr('fill', statusColor);

    // Status text
    const statusText = {
      'disconnected': 'Not Connected',
      'connecting': 'Connecting...',
      'connected': `Connected to ${dataTransform.connectionInfo?.database || 'database'}`,
      'error': 'Connection Error'
    }[dataTransform.connectionStatus] || 'Unknown';

    group.append('text')
      .attr('class', 'connection-status')
      .attr('x', statusX + 15)
      .attr('y', statusY)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', 14)
      .attr('font-weight', '500')
      .text(statusText);
  };

  const renderTables = (group) => {
    const startY = 80;
    const startX = 30;

    // Tables header
    group.append('text')
      .attr('class', 'table-item')
      .attr('x', startX)
      .attr('y', startY)
      .attr('fill', '#6b7280')
      .attr('font-size', 12)
      .attr('font-weight', '600')
      .text('AVAILABLE TABLES');

    // Get D3 event handlers
    const d3Handlers = dataTransform.createD3EventHandlers();

    // Render each table
    dataTransform.availableTables.forEach((table, index) => {
      const y = startY + 30 + (index * (TABLE_ITEM_HEIGHT + TABLE_ITEM_GAP));
      const isSelected = dataTransform.selectedTable === table.name;

      // Table container group
      const tableGroup = group.append('g')
        .attr('class', 'table-item')
        .attr('data-table-name', table.name)
        .style('cursor', 'pointer');

      // Table rectangle
      const rect = tableGroup.append('rect')
        .attr('x', startX)
        .attr('y', y)
        .attr('width', TABLE_ITEM_WIDTH)
        .attr('height', TABLE_ITEM_HEIGHT)
        .attr('fill', isSelected ? '#dbeafe' : '#ffffff')
        .attr('stroke', isSelected ? '#3b82f6' : '#e5e7eb')
        .attr('stroke-width', isSelected ? 2 : 1)
        .attr('rx', 4);

      // Table name
      tableGroup.append('text')
        .attr('x', startX + 10)
        .attr('y', y + TABLE_ITEM_HEIGHT / 2 - 5)
        .attr('fill', '#111827')
        .attr('font-size', 14)
        .attr('font-weight', '500')
        .text(table.name);

      // Row count
      tableGroup.append('text')
        .attr('x', startX + 10)
        .attr('y', y + TABLE_ITEM_HEIGHT / 2 + 10)
        .attr('fill', '#6b7280')
        .attr('font-size', 11)
        .text(`${table.rows.toLocaleString()} rows`);

      // Add click handler
      tableGroup.on('click', (event) => {
        event.stopPropagation();
        d3Handlers.onTableClick(table.name);
      });

      // Store selection
      d3Selections.current.tables[table.name] = tableGroup;
    });
  };

  const renderQueryResults = (group) => {
    const resultsY = 80;
    const resultsX = 280;

    // Clear existing query results
    group.selectAll('.query-results').remove();

    // Results header
    group.append('text')
      .attr('class', 'query-results')
      .attr('x', resultsX)
      .attr('y', resultsY)
      .attr('fill', '#6b7280')
      .attr('font-size', 12)
      .attr('font-weight', '600')
      .text('QUERY RESULTS');

    // Last query
    if (dataTransform.lastQuery) {
      const queryLines = dataTransform.lastQuery.split('\n');

      group.append('text')
        .attr('class', 'query-results')
        .attr('x', resultsX)
        .attr('y', resultsY + 30)
        .attr('fill', '#374151')
        .attr('font-size', 11)
        .attr('font-weight', '500')
        .text('Last Query:');

      // Render query (first 3 lines max)
      queryLines.slice(0, 3).forEach((line, index) => {
        group.append('text')
          .attr('class', 'query-results')
          .attr('x', resultsX)
          .attr('y', resultsY + 50 + (index * 16))
          .attr('fill', '#6b7280')
          .attr('font-size', 10)
          .attr('font-family', 'monospace')
          .text(line.substring(0, 60) + (line.length > 60 ? '...' : ''));
      });

      // Row count
      if (dataTransform.queryResults) {
        group.append('text')
          .attr('class', 'query-results')
          .attr('x', resultsX)
          .attr('y', resultsY + 110)
          .attr('fill', '#059669')
          .attr('font-size', 12)
          .attr('font-weight', '600')
          .text(`✓ ${dataTransform.queryResults.rowCount} rows returned`);
      }
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          dataTransform.redo();
        } else {
          dataTransform.undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dataTransform]);

  return (
    <div className="p-6 bg-white">
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50" style={{ position: 'relative' }}>
        {/* Data canvas controls */}
        <div className="absolute top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={dataTransform.undo}
              disabled={!dataTransform.canUndo}
              className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={dataTransform.redo}
              disabled={!dataTransform.canRedo}
              className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="w-4 h-4" />
            </button>

            <AICommandInput aiCommands={dataCommands} />

            <button
              onClick={dataTransform.resetDataCanvas}
              className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 ml-2"
            >
              Reset
            </button>
          </div>
        </div>

        <svg
          ref={svgRef}
          className="w-full h-auto"
          style={{
            maxWidth: '1000px',
            backgroundColor: 'white'
          }}
        />

        {/* Connection info */}
        {dataTransform.connectionStatus !== 'disconnected' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <div className="font-medium text-blue-900">
              Status: {dataTransform.connectionStatus}
            </div>
            {dataTransform.connectionInfo && (
              <div className="text-blue-700 text-xs mt-1">
                Database: {dataTransform.connectionInfo.database} ({dataTransform.connectionInfo.type})
              </div>
            )}
            {dataTransform.selectedTable && (
              <div className="text-blue-700 text-xs mt-1">
                Selected table: {dataTransform.selectedTable}
              </div>
            )}
          </div>
        )}

        {/* Processing indicator */}
        {dataTransform.isExecuting && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <div className="flex items-center gap-2 text-yellow-800">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              Executing query...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicDataCanvas;