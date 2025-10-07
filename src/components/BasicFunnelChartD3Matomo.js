import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const BasicFunnelChartD3Matomo = () => {
  const svgRef = useRef();
  const [hoveredStage, setHoveredStage] = useState(null);
  const [timeFrame, setTimeFrame] = useState('current');

  // PE-focused data structure
  const currentData = [
    { stage: 'Data Gaps Identified', value: 100, color: '#E67E22', description: 'Market size, competitive positioning uncertain' },
    { stage: 'Proxy Sources Analyzed', value: 65, color: '#3498DB', description: 'Patent filings, job postings, industry reports' },
    { stage: 'Alternative Data Synthesized', value: 45, color: '#16A085', description: 'Satellite imagery, supplier networks, sentiment' },
    { stage: 'Risk Factors Assessed', value: 25, color: '#34495E', description: 'Regulatory exposure, market concentration' },
    { stage: 'Investment Conviction', value: 15, color: '#27AE60', description: 'Thesis validated with 85% confidence' }
  ];

  const previousData = [
    { stage: 'Data Gaps Identified', value: 100, color: '#E67E22', description: 'Traditional due diligence approach' },
    { stage: 'Proxy Sources Analyzed', value: 45, color: '#3498DB', description: 'Limited to public filings only' },
    { stage: 'Alternative Data Synthesized', value: 25, color: '#16A085', description: 'Manual research, incomplete coverage' },
    { stage: 'Risk Factors Assessed', value: 15, color: '#34495E', description: 'High uncertainty, conservative assumptions' },
    { stage: 'Investment Conviction', value: 8, color: '#27AE60', description: 'Pass on deal due to information gaps' }
  ];

  const data = timeFrame === 'current' ? currentData : previousData;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 500;
    const margin = { top: 50, right: 300, bottom: 50, left: 50 };

    svg.attr('width', width).attr('height', height);

    const funnelWidth = width - margin.left - margin.right - 200;
    const funnelHeight = height - margin.top - margin.bottom;
    const stageHeight = funnelHeight / data.length;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create funnel segments with smooth transitions
    data.forEach((d, i) => {
      const topWidth = funnelWidth * (d.value / 100);
      const bottomWidth = i < data.length - 1 ? funnelWidth * (data[i + 1].value / 100) : topWidth * 0.8;
      const y = i * stageHeight;

      // Create trapezoid path
      const path = `M 0 ${y} 
                    L ${topWidth} ${y} 
                    L ${bottomWidth} ${y + stageHeight} 
                    L 0 ${y + stageHeight} Z`;

      // Funnel segment with transition
      const segment = g.append('path')
        .attr('d', path)
        .attr('fill', d.color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .style('opacity', 0)
        .transition()
        .duration(800)
        .delay(i * 150)
        .style('opacity', 1);

      // Re-select the path for hover events after transition
      setTimeout(() => {
        g.select(`path:nth-child(${i + 1})`)
          .on('mouseenter', function() {
            setHoveredStage(i);
            d3.select(this)
              .transition()
              .duration(200)
              .style('opacity', 0.8);
          })
          .on('mouseleave', function() {
            setHoveredStage(null);
            d3.select(this)
              .transition()
              .duration(200)
              .style('opacity', 1);
          });
      }, (i * 150) + 800);

      // Stage labels with fade-in
      g.append('text')
        .attr('x', -10)
        .attr('y', y + stageHeight / 2 + 5)
        .attr('text-anchor', 'end')
        .attr('font-family', 'Arial, sans-serif')
        .attr('font-size', '14px')
        .attr('font-weight', '500')
        .attr('fill', '#2C3E50')
        .style('opacity', 0)
        .text(d.stage)
        .transition()
        .duration(600)
        .delay(i * 150 + 400)
        .style('opacity', 1);

      // Percentage labels with fade-in
      g.append('text')
        .attr('x', topWidth / 2)
        .attr('y', y + stageHeight / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Arial, sans-serif')
        .attr('font-size', '18px')
        .attr('font-weight', 'bold')
        .attr('fill', 'white')
        .style('opacity', 0)
        .text(`${d.value}%`)
        .transition()
        .duration(600)
        .delay(i * 150 + 600)
        .style('opacity', 1);

      // Description lines with draw-in effect
      g.append('line')
        .attr('x1', topWidth + 10)
        .attr('y1', y + stageHeight / 2)
        .attr('x2', topWidth + 10)
        .attr('y2', y + stageHeight / 2)
        .attr('stroke', '#7F8C8D')
        .attr('stroke-width', 1)
        .transition()
        .duration(400)
        .delay(i * 150 + 800)
        .attr('x2', topWidth + 40);

      // Description text with fade-in
      g.append('text')
        .attr('x', topWidth + 50)
        .attr('y', y + stageHeight / 2 + 5)
        .attr('font-family', 'Arial, sans-serif')
        .attr('font-size', '13px')
        .attr('fill', '#34495E')
        .style('opacity', 0)
        .text(d.description)
        .transition()
        .duration(600)
        .delay(i * 150 + 1000)
        .style('opacity', 1);
    });

  }, [data, timeFrame]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-50">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Augmented Intelligence Due Diligence
        </h2>

        {/* Time period toggle - the "I wish" moment */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTimeFrame('previous')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              timeFrame === 'previous' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Traditional Approach
          </button>
          <button
            onClick={() => setTimeFrame('current')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              timeFrame === 'current' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            AI-Augmented Approach
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <svg ref={svgRef}></svg>

        {/* Hover details - another "I wish" moment */}
        {hoveredStage !== null && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900">
              {data[hoveredStage].stage}
            </h4>
            <p className="text-blue-700 text-sm mt-1">
              {data[hoveredStage].description}
            </p>
            <div className="mt-2 text-xs text-blue-600">
              Confidence Level: {data[hoveredStage].value}% •
              {timeFrame === 'current' ? ' AI-Enhanced Analysis' : ' Manual Research Only'}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Hover over stages for details • Toggle between approaches to compare effectiveness
      </div>
    </div>
  );
};

export default BasicFunnelChartD3Matomo;