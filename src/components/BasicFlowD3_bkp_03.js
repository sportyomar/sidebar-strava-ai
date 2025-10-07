import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Text } from './charts/shapes/Text';
import { Square } from './charts/shapes/Square';
import { Triangle } from './charts/shapes/Triangle';
import { useChartTransform } from './charts/hooks'
import { useAICommands } from './charts/hooks';
import AICommandInput from './AICommandInput';

const BasicFlow = () => {
  const svgRef = useRef();
  const chartTransform = useChartTransform();
  const aiCommands = useAICommands(chartTransform);

  // Store D3 selections for efficient updates
  const d3Selections = useRef({
    svg: null,
    chartGroup: null,
    scaleHandles: null,
    squares: {},
    triangles: {}
  });

  // Store shape instances for updates
  const shapeInstances = useRef({
    squares: {},
    triangles: {}
  });

  // Store element data for bounds calculation
  const elementData = useRef({});

  // Store drag state
  const dragState = useRef({
    isDragging: false,
    isResizing: false,
    dragType: null, // 'move' or 'resize'
    resizeHandle: null, // which corner handle
    startMousePos: null,
    startTransform: null,
    startScale: null,
    resizeAnchor: null // opposite corner for resize anchor
  });

  // ONE-TIME D3 SETUP - Create all elements once
  useEffect(() => {
    if (d3Selections.current.svg) return; // Prevent double initialization
    initializeD3Visualization();
  }, []); // Empty dependency - only runs once

  // REACT STATE UPDATES - Update D3 based on React state changes
  useEffect(() => {
    updateD3FromReactState();
  }, [chartTransform.groupScale, chartTransform.groupTransform, chartTransform.isChartHighlighted]);

  // Add this new useEffect to watch for element data changes
  useEffect(() => {
    // Re-render elements when their data changes
    // This will be triggered by AI commands updating element properties
    updateElementVisuals();
  }, [chartTransform.getAllElementsData()]);
  const initializeD3Visualization = () => {
    const svg = d3.select(svgRef.current);
    d3Selections.current.svg = svg;

    // Clear any existing content
    svg.selectAll("*").remove();

    const width = 1200;
    const height = 400;
    const squareWidth1 = 250;
    const squareWidth2 = 210;
    const squareWidth3 = 360;
    const squareWidth4 = 360;
    const squareHeight = 120;
    const arrowSize = 25;

    svg.attr("width", width).attr("height", height);

    // Create main chart group that will be transformed
    const chartGroup = svg.append('g').attr('class', 'chart-group');
    d3Selections.current.chartGroup = chartGroup;

    // Create scale handles group (separate from chart group)
    const scaleHandlesGroup = svg.append('g')
      .attr('class', 'scale-handles')
      .style('opacity', 0)
      .style('pointer-events', 'none');
    d3Selections.current.scaleHandles = scaleHandlesGroup;

    // Get D3 event handlers
    const d3Handlers = chartTransform.createD3EventHandlers();

    // Create square data WITH TEXT included
    const squareData1 = {
      x: 50,
      y: 140,
      width: squareWidth1,
      height: squareHeight,
      type: 'square',
      text: "Step 1\nIdentify good companies\nwith bad balance sheets"
    };

    const squareData2 = {
      x: 360,
      y: 140,
      width: squareWidth2,
      height: squareHeight,
      type: 'square',
      text: "Step 2\nAccumulate debt at\ndiscounts to par"
    };

    const squareData3 = {
      x: 670,
      y: 40,
      width: squareWidth3,
      height: squareHeight,
      type: 'square',
      text: "Step 3\nDebt defaults\nControl company by converting debt to\nequity at low entry valuation\nExit through IPO or sale"
    };

    const squareData4 = {
      x: 670,
      y: 200,
      width: squareWidth4,
      height: squareHeight,
      type: 'square',
      text: "Step 4\nDebt recovers\nEarn on high current cash return and gain\non principle until sale or maturity of debt"
    };

    // Store element data for bounds calculation
    elementData.current = {
      square1: squareData1,
      square2: squareData2,
      square3: squareData3,
      square4: squareData4
    };

    // Register element data with the hook
    chartTransform.registerElementData("square1", {
      ...squareData1,
      fill: "#445561",
      stroke: "#445561",
      textColor: "#ffffff"
    });
    chartTransform.registerElementData("square2", {
      ...squareData2,
      fill: "#445561",
      stroke: "#445561",
      textColor: "#ffffff"
    });
    chartTransform.registerElementData("square3", {
      ...squareData3,
      fill: "#445561",
      stroke: "#445561",
      textColor: "#ffffff"
    });
    chartTransform.registerElementData("square4", {
      ...squareData4,
      fill: "#445561",
      stroke: "#445561",
      textColor: "#ffffff"
    });

    // Create triangle data with explicit positioning
    const triangleData1 = Triangle.createEquilateral(
      squareData1.x + squareWidth1 + 15,
      squareData1.y + squareHeight / 2,
      arrowSize,
      {
        direction: "right"
      }
    );

    const triangleData2 = Triangle.createEquilateral(
      squareData2.x + squareWidth2 + 15,
      squareData2.y + squareHeight / 2,
      arrowSize,
      {
        direction: "right"
      }
    );

    // Add type to triangle data and register
    triangleData1.type = 'triangle';
    triangleData2.type = 'triangle';
    elementData.current.triangle1 = triangleData1;
    elementData.current.triangle2 = triangleData2;
    chartTransform.registerElementData("triangle1", triangleData1);
    chartTransform.registerElementData("triangle2", triangleData2);

    // Create and render squares with initial styling
    const squareElements = [
      { id: "square1", data: squareData1 },
      { id: "square2", data: squareData2 },
      { id: "square3", data: squareData3 },
      { id: "square4", data: squareData4 }
    ];

    squareElements.forEach(({ id, data }) => {
      const square = new Square(chartGroup, data, {
        fill: "#445561",
        stroke: "#445561",
        strokeWidth: 1,
        rx: 4,
        instanceId: id,
        transform: "",
        // Text styling
        textColor: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
        lineHeight: 18
      });

      square.render();

      // Store shape instance and D3 selection
      shapeInstances.current.squares[id] = square;
      d3Selections.current.squares[id] = chartGroup.select(`#${id}`);

      // Add click event handler for chart highlighting
      d3Selections.current.squares[id].on('click', (event) => {
        console.log(`Square ${id} clicked - highlighting chart`);
        event.stopPropagation();
        d3Handlers.onElementClick(id);
      });
    });

    // Create and render triangles with initial styling
    const triangleElements = [
      { id: "triangle1", data: triangleData1 },
      { id: "triangle2", data: triangleData2 }
    ];

    triangleElements.forEach(({ id, data }) => {
      // Use D3 directly for triangle rendering
      const triangle = chartGroup.append("path")
        .attr("id", id)
        .attr("d", Triangle.generatePath(data.sideLength, data.direction))
        .attr("transform", `translate(${data.centerX}, ${data.centerY})`)
        .attr("fill", "#445561")
        .attr("stroke", "#445561")
        .attr("stroke-width", 1);

      // Store D3 selection and add click event handler
      d3Selections.current.triangles[id] = chartGroup.select(`#${id}`);

      // Add click event handler for chart highlighting
      d3Selections.current.triangles[id].on('click', (event) => {
        console.log(`Triangle ${id} clicked - highlighting chart`);
        event.stopPropagation();
        d3Handlers.onElementClick(id);
      });
    });

    // Create scale handles (initially hidden)
    createScaleHandles(scaleHandlesGroup);

    // Add global mouse event listeners for drag operations
    setupGlobalMouseEvents();

    // Add click to clear highlighting when clicking on empty SVG
    svg.on('click', () => {
      d3Handlers.onBackgroundClick();
    });

    console.log('D3 visualization initialized');
  };

  const setupGlobalMouseEvents = () => {
    // Add global mouse move and up events to the document for smooth dragging
    d3.select(document)
      .on('mousemove.chart-drag', handleGlobalMouseMove)
      .on('mouseup.chart-drag', handleGlobalMouseUp);
  };

  const handleGlobalMouseMove = (event) => {
    if (!dragState.current.isDragging && !dragState.current.isResizing) return;

    event.preventDefault();
    const mousePos = d3.pointer(event, d3Selections.current.svg.node());

    if (dragState.current.dragType === 'move') {
      handleMoveOperation(mousePos);
    } else if (dragState.current.dragType === 'resize') {
      handleResizeOperation(mousePos);
    }
  };

  const handleGlobalMouseUp = () => {
    if (!dragState.current.isDragging && !dragState.current.isResizing) return;

    // Reset drag state
    dragState.current = {
      isDragging: false,
      isResizing: false,
      dragType: null,
      resizeHandle: null,
      startMousePos: null,
      startTransform: null,
      startScale: null,
      resizeAnchor: null
    };

    // Reset cursor
    d3.select('body').style('cursor', 'default');

    console.log('Drag operation completed');
  };

  const handleMoveOperation = (currentMousePos) => {
    const deltaX = currentMousePos[0] - dragState.current.startMousePos[0];
    const deltaY = currentMousePos[1] - dragState.current.startMousePos[1];

    const newX = dragState.current.startTransform.x + deltaX;
    const newY = dragState.current.startTransform.y + deltaY;

    chartTransform.moveChart(newX, newY);
  };

  const handleResizeOperation = (currentMousePos) => {
    const startPos = dragState.current.startMousePos;
    const anchor = dragState.current.resizeAnchor;
    const handle = dragState.current.resizeHandle;

    // Calculate distance from anchor to current mouse position
    const currentDistance = Math.sqrt(
      Math.pow(currentMousePos[0] - anchor.x, 2) +
      Math.pow(currentMousePos[1] - anchor.y, 2)
    );

    // Calculate initial distance from anchor to start position
    const initialDistance = Math.sqrt(
      Math.pow(startPos[0] - anchor.x, 2) +
      Math.pow(startPos[1] - anchor.y, 2)
    );

    if (initialDistance === 0) return; // Prevent division by zero

    // Calculate scale factor
    const scaleFactor = currentDistance / initialDistance;
    const newScale = Math.max(0.1, Math.min(3.0, dragState.current.startScale * scaleFactor));

    chartTransform.scaleChart(newScale);
  };

  const startMoveOperation = (event) => {
    event.stopPropagation();

    const mousePos = d3.pointer(event, d3Selections.current.svg.node());

    dragState.current = {
      isDragging: true,
      isResizing: false,
      dragType: 'move',
      resizeHandle: null,
      startMousePos: mousePos,
      startTransform: { ...chartTransform.groupTransform },
      startScale: null,
      resizeAnchor: null
    };

    d3.select('body').style('cursor', 'move');
    console.log('Started move operation');
  };

  const startResizeOperation = (event, handleIndex) => {
    event.stopPropagation();

    const mousePos = d3.pointer(event, d3Selections.current.svg.node());

    // Calculate the anchor point (opposite corner)
    const elementsBounds = calculateElementsBounds();
    const scale = chartTransform.groupScale;
    const transform = chartTransform.groupTransform;

    const padding = 15;
    const chartBounds = {
      x: elementsBounds.minX * scale + transform.x - padding,
      y: elementsBounds.minY * scale + transform.y - padding,
      width: (elementsBounds.maxX - elementsBounds.minX) * scale + padding * 2,
      height: (elementsBounds.maxY - elementsBounds.minY) * scale + padding * 2
    };

    // Calculate anchor point based on handle index (opposite corner)
    let anchor;
    switch (handleIndex) {
      case 0: // top-left handle -> anchor is bottom-right
        anchor = {
          x: chartBounds.x + chartBounds.width,
          y: chartBounds.y + chartBounds.height
        };
        break;
      case 1: // top-right handle -> anchor is bottom-left
        anchor = {
          x: chartBounds.x,
          y: chartBounds.y + chartBounds.height
        };
        break;
      case 2: // bottom-left handle -> anchor is top-right
        anchor = {
          x: chartBounds.x + chartBounds.width,
          y: chartBounds.y
        };
        break;
      case 3: // bottom-right handle -> anchor is top-left
        anchor = {
          x: chartBounds.x,
          y: chartBounds.y
        };
        break;
      default:
        anchor = { x: chartBounds.x, y: chartBounds.y };
    }

    dragState.current = {
      isDragging: false,
      isResizing: true,
      dragType: 'resize',
      resizeHandle: handleIndex,
      startMousePos: mousePos,
      startTransform: null,
      startScale: chartTransform.groupScale,
      resizeAnchor: anchor
    };

    console.log('Started resize operation', { handleIndex, anchor });
  };

  const calculateElementsBounds = () => {
    // Calculate the bounding box of all chart elements
    const elements = Object.values(elementData.current);
    if (elements.length === 0) return { minX: 0, minY: 0, maxX: 1200, maxY: 400 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.forEach(element => {
      if (element.type === 'square') {
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + element.width);
        maxY = Math.max(maxY, element.y + element.height);
      } else if (element.type === 'triangle') {
        // For triangles, approximate bounds using center and side length
        const halfSide = element.sideLength / 2;
        minX = Math.min(minX, element.centerX - halfSide);
        minY = Math.min(minY, element.centerY - halfSide);
        maxX = Math.max(maxX, element.centerX + halfSide);
        maxY = Math.max(maxY, element.centerY + halfSide);
      }
    });

    return { minX, minY, maxX, maxY };
  };

  const createScaleHandles = (group) => {
    // Clear existing handles
    group.selectAll("*").remove();

    // Calculate dynamic chart bounds
    const elementsBounds = calculateElementsBounds();
    const scale = chartTransform.groupScale;
    const transform = chartTransform.groupTransform;

    // Calculate bounds with current transform and scale
    const padding = 15;
    const chartBounds = {
      x: elementsBounds.minX * scale + transform.x - padding,
      y: elementsBounds.minY * scale + transform.y - padding,
      width: (elementsBounds.maxX - elementsBounds.minX) * scale + padding * 2,
      height: (elementsBounds.maxY - elementsBounds.minY) * scale + padding * 2
    };

    // Premium selection border - desktop app feel with drag capability
    const border = group.append('rect')
      .attr('class', 'chart-border')
      .attr('x', chartBounds.x)
      .attr('y', chartBounds.y)
      .attr('width', chartBounds.width)
      .attr('height', chartBounds.height)
      .attr('fill', 'rgba(59, 130, 246, 0.05)')     // Subtle blue fill
      .attr('stroke', '#3b82f6')                    // Solid blue border
      .attr('stroke-width', 1.5)                    // Refined line weight
      .attr('rx', 6)                                // Subtle rounded corners
      .style('filter', 'drop-shadow(0 2px 8px rgba(59, 130, 246, 0.15))')
      .style('cursor', 'move')                      // Indicate it's draggable
      .on('mousedown', startMoveOperation);         // Add move drag functionality

    // Corner scale handles
    const handleSize = 8;
    const handles = [
      { x: chartBounds.x - handleSize/2, y: chartBounds.y - handleSize/2, cursor: 'nw-resize' },
      { x: chartBounds.x + chartBounds.width - handleSize/2, y: chartBounds.y - handleSize/2, cursor: 'ne-resize' },
      { x: chartBounds.x - handleSize/2, y: chartBounds.y + chartBounds.height - handleSize/2, cursor: 'sw-resize' },
      { x: chartBounds.x + chartBounds.width - handleSize/2, y: chartBounds.y + chartBounds.height - handleSize/2, cursor: 'se-resize' }
    ];

    handles.forEach((handle, i) => {
      group.append('rect')
        .attr('class', `scale-handle handle-${i}`)
        .attr('x', handle.x)
        .attr('y', handle.y)
        .attr('width', handleSize)
        .attr('height', handleSize)
        .attr('fill', '#2563eb')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('rx', 2)
        .style('cursor', handle.cursor)
        .on('mousedown', (event) => startResizeOperation(event, i));
    });
  };

  const updateD3FromReactState = () => {
    if (!d3Selections.current.svg) return; // Don't update until initialized

    console.log('Updating D3 from React state:', {
      groupScale: chartTransform.groupScale,
      groupTransform: chartTransform.groupTransform,
      isChartHighlighted: chartTransform.isChartHighlighted
    });

    // Update chart group transform
    updateChartTransform();

    // Update scale handles visibility and bounds
    updateScaleHandles();
  };

  const updateChartTransform = () => {
    if (!d3Selections.current.chartGroup) return;

    const transformString = chartTransform.getChartTransformString();

    // Only animate if we're not currently dragging
    if (dragState.current.isDragging || dragState.current.isResizing) {
      // Immediate update during drag
      d3Selections.current.chartGroup.attr('transform', transformString);
    } else {
      // Smooth animation when not dragging
      d3Selections.current.chartGroup
        .transition()
        .duration(300)
        .attr('transform', transformString);
    }
  };

  const updateElementVisuals = () => {
    if (!d3Selections.current.svg) return; // Don't update until initialized

    const allElementData = chartTransform.getAllElementsData();

    // Update squares
    Object.keys(shapeInstances.current.squares).forEach(id => {
      const elementData = allElementData[id];
      if (!elementData) return;

      const square = shapeInstances.current.squares[id];
      const d3Selection = d3Selections.current.squares[id];

      if (square && d3Selection) {
        // Update the square's visual properties
        d3Selection.select('rect')
          .attr('fill', elementData.fill || '#445561')
          .attr('stroke', elementData.stroke || '#445561');

        // Update text color if text exists
        d3Selection.select('text')
          .attr('fill', elementData.textColor || '#ffffff');
      }
    });

    // Update triangles
    Object.keys(d3Selections.current.triangles).forEach(id => {
      const elementData = allElementData[id];
      if (!elementData) return;

      const d3Selection = d3Selections.current.triangles[id];

      if (d3Selection) {
        d3Selection
          .attr('fill', elementData.fill || '#445561')
          .attr('stroke', elementData.stroke || '#445561');
      }
    });

    console.log('Updated element visuals from AI commands');
  };

  const updateScaleHandles = () => {
    if (!d3Selections.current.scaleHandles) return;

    // Recreate handles with updated bounds
    createScaleHandles(d3Selections.current.scaleHandles);

    // Set visibility based on highlight state
    const targetOpacity = chartTransform.isChartHighlighted ? 1 : 0;
    const targetPointerEvents = chartTransform.isChartHighlighted ? 'all' : 'none';

    // Only animate if we're not currently dragging
    if (dragState.current.isDragging || dragState.current.isResizing) {
      // Immediate update during drag
      d3Selections.current.scaleHandles
        .style('opacity', targetOpacity)
        .style('pointer-events', targetPointerEvents);
    } else {
      // Smooth animation when not dragging
      d3Selections.current.scaleHandles
        .transition()
        .duration(200)
        .style('opacity', targetOpacity)
        .style('pointer-events', targetPointerEvents);
    }
  };

  return (
    <div className="p-6 bg-white">
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50" style={{ position: 'relative' }}>
        {/* Simple chart controls */}
        {chartTransform.isChartHighlighted && (
          <div className="absolute top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => chartTransform.scaleChart(chartTransform.groupScale * 1.2)}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                +
              </button>
              <span className="min-w-12 text-center">{Math.round(chartTransform.groupScale * 100)}%</span>
              <button
                onClick={() => chartTransform.scaleChart(chartTransform.groupScale * 0.8)}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                −
              </button>
              <AICommandInput aiCommands={aiCommands} />
              <button
                onClick={chartTransform.resetChart}
                className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 ml-2"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          className="w-full h-auto"
          style={{
            maxWidth: '1200px',
            backgroundColor: 'white'
          }}
        />
      </div>
    </div>
  );
};

export default BasicFlow;