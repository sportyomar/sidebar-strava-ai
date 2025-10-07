import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Text } from './charts/shapes/Text';
import { Square } from './charts/shapes/Square';
import { Triangle } from './charts/shapes/Triangle';
import { useGroupSelection } from './charts/hooks'

const BasicFlow = () => {
  const svgRef = useRef();
  const groupSelection = useGroupSelection();

  // Store D3 selections for efficient updates
  const d3Selections = useRef({
    svg: null,
    squares: {},
    triangles: {}
  });

  // Store shape instances for updates
  const shapeInstances = useRef({
    squares: {},
    triangles: {}
  });

  // ONE-TIME D3 SETUP - Create all elements once
  useEffect(() => {
    if (d3Selections.current.svg) return; // Prevent double initialization
    initializeD3Visualization();
  }, []); // Empty dependency - only runs once

  // REACT STATE UPDATES - Update D3 based on React state changes
  useEffect(() => {
    updateD3FromReactState();
  }, [groupSelection.selectedElements, groupSelection.groupScale, groupSelection.groupTransform]);

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

    // Get D3 event handlers
    const d3Handlers = groupSelection.createD3EventHandlers();

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

    // Register element data with the hook
    groupSelection.registerElementData("square1", squareData1);
    groupSelection.registerElementData("square2", squareData2);
    groupSelection.registerElementData("square3", squareData3);
    groupSelection.registerElementData("square4", squareData4);

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
    groupSelection.registerElementData("triangle1", triangleData1);
    groupSelection.registerElementData("triangle2", triangleData2);

    // DEBUG: Check triangle positioning
    console.log('Triangle1 data:', triangleData1);
    console.log('Triangle2 data:', triangleData2);
    groupSelection.registerElementData("triangle1", triangleData1);
    groupSelection.registerElementData("triangle2", triangleData2);

    // Create and render squares with initial styling
    const squareElements = [
      { id: "square1", data: squareData1 },
      { id: "square2", data: squareData2 },
      { id: "square3", data: squareData3 },
      { id: "square4", data: squareData4 }
    ];

    squareElements.forEach(({ id, data }) => {
      const square = new Square(svg, data, {
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
      d3Selections.current.squares[id] = svg.select(`#${id}`);

      // Add click event handler with debug logging
      d3Selections.current.squares[id].on('click', (event) => {
        console.log(`Square ${id} clicked!`);
        event.stopPropagation();
        d3Handlers.onElementClick(id);
      });
    });

    // Create and render triangles with initial styling (simplified approach)
    const triangleElements = [
      { id: "triangle1", data: triangleData1 },
      { id: "triangle2", data: triangleData2 }
    ];

    triangleElements.forEach(({ id, data }) => {
      // DEBUG: Log what we're trying to position
      console.log(`Creating triangle ${id}:`, {
        centerX: data.centerX,
        centerY: data.centerY,
        sideLength: data.sideLength,
        direction: data.direction
      });

      // Use D3 directly for simpler triangle rendering
      const triangle = svg.append("path")
        .attr("id", id)
        .attr("d", Triangle.generatePath(data.sideLength, data.direction))
        .attr("transform", `translate(${data.centerX}, ${data.centerY})`)
        .attr("fill", "#445561")
        .attr("stroke", "#445561")
        .attr("stroke-width", 1);

      // DEBUG: Log what D3 actually created
      console.log(`Triangle ${id} actual attributes:`, {
        d: triangle.attr("d"),
        transform: triangle.attr("transform"),
        id: triangle.attr("id")
      });

      // Store D3 selection and add click event handler
      d3Selections.current.triangles[id] = svg.select(`#${id}`);

      // DEBUG: Verify the selection worked
      console.log(`Triangle ${id} selection:`, d3Selections.current.triangles[id].node());

      // Add click event handler with debug logging
      d3Selections.current.triangles[id].on('click', (event) => {
        console.log(`Triangle ${id} clicked!`);
        event.stopPropagation();
        d3Handlers.onElementClick(id);
      });
    });

    // Add click to clear selection when clicking on empty SVG
    svg.on('click', () => {
      d3Handlers.onClearSelection();
    });

    console.log('D3 visualization initialized');
  };

  const updateD3FromReactState = () => {
    if (!d3Selections.current.svg) return; // Don't update until initialized

    console.log('Updating D3 from React state:', {
      selectedElements: groupSelection.selectedElements,
      groupScale: groupSelection.groupScale,
      hasSelection: groupSelection.hasSelection
    });

    // Update selection styling for squares
    updateSelectionStyling();

    // Update group transforms and scaling
    updateGroupTransforms();
  };

  const updateSelectionStyling = () => {
    const selectedSet = new Set(groupSelection.selectedElements);

    // Update square styling - squares are groups with rect and text inside
    Object.entries(d3Selections.current.squares).forEach(([id, selection]) => {
      const isSelected = selectedSet.has(id);

      // Update the rect element inside the square group
      selection.select('rect')
        .transition()
        .duration(200)
        .attr('fill', isSelected ? "#2563eb" : "#445561")
        .attr('stroke', isSelected ? "#1d4ed8" : "#445561")
        .attr('stroke-width', isSelected ? 3 : 1);

      // Also update the group's stroke if it has one
      selection
        .transition()
        .duration(200)
        .attr('stroke', isSelected ? "#1d4ed8" : "none")
        .attr('stroke-width', isSelected ? 3 : 0);
    });

    // Update triangle styling - triangles are path elements
    Object.entries(d3Selections.current.triangles).forEach(([id, selection]) => {
      const isSelected = selectedSet.has(id);

      selection
        .transition()
        .duration(200)
        .attr('fill', isSelected ? "#2563eb" : "#445561")
        .attr('stroke', isSelected ? "#1d4ed8" : "#445561")
        .attr('stroke-width', isSelected ? 3 : 1);
    });
  };

  const updateGroupTransforms = () => {
    if (!groupSelection.hasSelection) {
      // Don't clear positioning transforms! Only clear group transforms
      // Triangles need their base positioning to stay intact
      return;
    }

    const transformString = groupSelection.getGroupTransformString();
    const selectedSet = new Set(groupSelection.selectedElements);

    // Apply transforms only to selected elements
    Object.entries(d3Selections.current.squares).forEach(([id, selection]) => {
      if (selectedSet.has(id)) {
        selection
          .transition()
          .duration(300)
          .attr('transform', transformString);
      }
    });

    Object.entries(d3Selections.current.triangles).forEach(([id, selection]) => {
      if (selectedSet.has(id)) {
        // For triangles, combine the positioning transform with the group transform
        const baseTransform = `translate(${groupSelection.getElementData(id).centerX}, ${groupSelection.getElementData(id).centerY})`;
        const combinedTransform = `${transformString} ${baseTransform}`;

        selection
          .transition()
          .duration(300)
          .attr('transform', combinedTransform);
      }
    });
  };

  // DEBUG: Log the current scale value
  console.log('Current groupScale:', groupSelection.groupScale);
  console.log('Group transform string:', groupSelection.getGroupTransformString());

  return (
    <div className="p-6 bg-white">
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50" style={{ position: 'relative' }}>

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