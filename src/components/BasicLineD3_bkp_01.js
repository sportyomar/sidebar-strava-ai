import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SimpleLine = () => {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    // Data points - start and end
    const data = [
      { x: 50,  y: 200 },
      { x: 50,  y: 50 },
      { x: 100, y: 50}
    ];

    // Create line generator
    const line = d3.line()
      .x(d => d.x)
      .y(d => d.y);

    // Draw the line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Add circles for the data points
    svg.selectAll(".point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 6)
      .attr("fill", "#ef4444");

    // Add labels
    svg.append("text")
      .attr("x", data[0].x - 19)
      .attr("y", data[0].y + 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .text("1");

    svg.append("text")
      .attr("x", data[1].x - 19)
      .attr("y", data[1].y + 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .text("2");

    svg.append("text")
      .attr("x", data[2].x + 19)
      .attr("y", data[2].y + 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .text("3");

  }, []);

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Simple D3 Line</h2>
      <svg
        ref={svgRef}
        width={400}
        height={400}
        className="border border-gray-300 bg-white rounded"
      />
    </div>
  );
};

export default SimpleLine;