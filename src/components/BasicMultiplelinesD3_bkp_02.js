import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Line } from './charts/shapes/Line';
import { Circle } from './charts/shapes/Circle';
import { Text } from './charts/shapes/Text';

// Template creation function
const createTemplate = (shapes, data) => ({
  id: `lineTemplate_${Date.now()}`, // Auto-generated ID
  displayName: "Line Template", // User can rename
  data,
  shapes,
  created: new Date().toISOString(),
  usageCount: 0
});

// Repeat function - core library utility
const repeat = (svg, template, count, offsetFn) => {
  const instances = [];

  for (let i = 0; i < count; i++) {
    const offset = offsetFn(i);

    // Apply offset to template data
    const offsetData = template.data.map(point => ({
      x: point.x + offset.x,
      y: point.y + offset.y
    }));

    // Render each shape in the template
    template.shapes.forEach(shapeConfig => {
      const { type: ShapeClass, style, labels, positions } = shapeConfig;

      if (ShapeClass === Text && labels && positions) {
        // Handle text labels with positions
        const textRenderer = new ShapeClass(svg, style);
        labels.forEach((label, idx) => {
          if (positions[idx]) {
            const pos = positions[idx];
            textRenderer.render(
              offsetData[idx].x + pos.x,
              offsetData[idx].y + pos.y,
              label
            );
          }
        });
      } else {
        // Handle Line and Circle shapes
        const shape = new ShapeClass(svg, offsetData, style);
        shape.render();
      }
    });

    instances.push({ offset, data: offsetData });
  }

  // Update usage count
  template.usageCount += count;

  return instances;
};

const BasicMultipleLinesD3 = () => {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    // Base data points
    const baseData = [
      { x: 50,  y: 200 },
      { x: 50,  y: 50 },
      { x: 100, y: 50}
    ];

    // Create reusable template - lineTemplate_01 (auto-generated name)
    const lineTemplate_01 = createTemplate([
      {
        type: Line,
        style: {
          stroke: "#3b82f6",
          strokeWidth: 3,
          fill: "none"
        }
      },
      {
        type: Circle,
        style: {
          radius: 6,
          fill: "#ef4444",
          className: "point"
        }
      },
      {
        type: Text,
        style: {
          fill: "#fff",
          textAnchor: "middle"
        },
        labels: ["1", "2", "3"],
        positions: [
          { x: -19, y: 5 },  // Label for point 1
          { x: -19, y: 5 },  // Label for point 2
          { x: 19, y: 5 }    // Label for point 3
        ]
      }
    ], baseData);

    // User can rename template for better readability
    const salesTrendLine = lineTemplate_01;
    salesTrendLine.displayName = "Sales Trend Line";

    // One-liner to repeat the template 5 times
    repeat(svg, salesTrendLine, 5, (i) => ({ x: i * 80, y: 0 }));

    // Log template info for catalog/governance
    console.log('Template created:', {
      id: salesTrendLine.id,
      name: salesTrendLine.displayName,
      usage: salesTrendLine.usageCount,
      shapes: salesTrendLine.shapes.length
    });

  }, []);

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Basic Multiple Lines D3</h2>
      <svg
        ref={svgRef}
        width={800}
        height={400}
        className="border border-gray-300 bg-white rounded"
      />
    </div>
  );
};

export default BasicMultipleLinesD3;