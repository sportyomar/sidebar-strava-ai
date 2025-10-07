import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Chevron } from './charts/shapes/Chevron';

const BasicChainedChevronD3 = () => {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    // Create gradient definition for the reference image style
    const defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
      .attr("id", "businessLifecycleGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#d1d5db"); // Light gray

    gradient.append("stop")
      .attr("offset", "35%")
      .attr("stop-color", "#9ca3af"); // Medium-light gray

    gradient.append("stop")
      .attr("offset", "70%")
      .attr("stop-color", "#6b7280"); // Medium gray

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#374151"); // Dark gray

    // Example 1: Simple process flow
    const processSteps = ["Start", "Process", "Review", "Complete"];
    const processData = Chevron.createChainData(50, 50, 140, 70, processSteps);

    const processChevrons = new Chevron(svg, processData, {
      fill: "#3b82f6",
      stroke: "#1e40af",
      strokeWidth: 2,
      textColor: "#ffffff",
      fontSize: 14,
      instanceId: "process"
    });
    processChevrons.render();

    // Example 2: Sales pipeline with different colors
    const salesData = Chevron.createChainData(50, 160, 120, 60,
      ["Lead", "Qualify", "Propose", "Close"]
    );

    // Render each chevron with different colors
    salesData.forEach((chevronData, index) => {
      const colors = [
        { fill: "#10b981", stroke: "#059669" }, // Green
        { fill: "#3b82f6", stroke: "#1e40af" }, // Blue
        { fill: "#f59e0b", stroke: "#d97706" }, // Yellow
        { fill: "#ef4444", stroke: "#dc2626" }  // Red
      ];

      const singleChevron = new Chevron(svg, [chevronData], {
        ...colors[index],
        strokeWidth: 2,
        textColor: "#ffffff",
        fontSize: 13,
        instanceId: `sales-${index}`
      });
      singleChevron.render();
    });

    // Example 3: Development workflow - compact spacing
    const devData = Chevron.createChainData(50, 270, 100, 50,
      ["Code", "Test", "Review", "Deploy", "Monitor"]
    );

    const devChevrons = new Chevron(svg, devData, {
      fill: "#8b5cf6",
      stroke: "#7c3aed",
      strokeWidth: 1,
      textColor: "#ffffff",
      fontSize: 12,
      pointRatio: 0.12, // Slightly less pointy
      instanceId: "dev"
    });
    devChevrons.render();

    // Example 4: Long text labels - wider chevrons
    const longTextData = Chevron.createChainData(50, 360, 160, 65,
      ["Research Phase", "Development", "Testing Phase", "Launch"]
    );

    const longTextChevrons = new Chevron(svg, longTextData, {
      fill: "#ec4899",
      stroke: "#db2777",
      strokeWidth: 2,
      textColor: "#ffffff",
      fontSize: 13,
      pointRatio: 0.1, // Less pointy for wider text
      instanceId: "longtext"
    });
    longTextChevrons.render();

    // Example 5: Business Lifecycle (Reference Image Style) - Gradient with multi-line text
    const businessLifecycleSteps = [
      "Concept\nstage",
      "Development/\nlater stage",
      "Mature\nenterprise",
      "Reengineering/\nrestructuring"
    ];

    const businessData = Chevron.createChainData(50, 450, 180, 80, businessLifecycleSteps);

    const businessChevrons = new Chevron(svg, businessData, {
      fill: "url(#businessLifecycleGradient)",
      stroke: "#6b7280",
      strokeWidth: 1,
      textColor: "#ffffff",
      fontSize: 13,
      pointRatio: 0.08, // Less pointed for professional look
      instanceId: "business-lifecycle",
      includeText: false // We'll handle multi-line text manually
    });
    businessChevrons.render();

    // Manually add multi-line text for business lifecycle
    businessData.forEach((d, index) => {
      const centerX = d.x + d.width / 2;
      const centerY = d.y + d.height / 2;
      const lines = d.text.split('\n');

      lines.forEach((line, lineIndex) => {
        svg.append("text")
          .attr("x", centerX)
          .attr("y", centerY - ((lines.length - 1) * 8) + (lineIndex * 16))
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "#ffffff")
          .attr("font-size", "13px")
          .attr("font-family", "Arial, sans-serif")
          .attr("font-weight", "500")
          .text(line);
      });
    });

  }, []);

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Basic Chained Chevron D3</h2>
      <p className="text-sm text-gray-600 mb-4">
        Examples of chained chevrons showing different styling options and use cases.
      </p>
      <svg
        ref={svgRef}
        width={800}
        height={580}
        className="border border-gray-300 bg-white rounded"
      />

      {/* Labels for examples */}
      <div className="mt-4 space-y-2 text-sm text-gray-600">
        <div><strong>Row 1:</strong> Simple process flow (uniform styling)</div>
        <div><strong>Row 2:</strong> Sales pipeline (different colors per step)</div>
        <div><strong>Row 3:</strong> Development workflow (compact, custom point ratio)</div>
        <div><strong>Row 4:</strong> Research process (wide chevrons for longer text)</div>
        <div><strong>Row 5:</strong> Business lifecycle (gradient chain with multi-line text - reference image style)</div>
      </div>
    </div>
  );
};

export default BasicChainedChevronD3;