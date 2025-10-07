import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ChartAIAvatar = ({
  size = 40,
  isThinking = false,
  isSpeaking = false,
  className = ""
}) => {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set up SVG dimensions
    const centerX = size / 2;
    const centerY = size / 2;

    svg.attr("width", size).attr("height", size);

    // Create gradient definitions
    const defs = svg.append("defs");

    // Main gradient
    const gradient = defs.append("radialGradient")
      .attr("id", "aiGradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#4f46e5")
      .attr("stop-opacity", 0.8);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#1e40af")
      .attr("stop-opacity", 1);

    // Thinking gradient
    const thinkingGradient = defs.append("radialGradient")
      .attr("id", "thinkingGradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");

    thinkingGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", 0.8);

    thinkingGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#d97706")
      .attr("stop-opacity", 1);

    // Speaking gradient
    const speakingGradient = defs.append("radialGradient")
      .attr("id", "speakingGradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");

    speakingGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.8);

    speakingGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#059669")
      .attr("stop-opacity", 1);

    // Main AI shape - geometric brain-like form
    const mainShape = svg.append("g").attr("class", "main-shape");

    // Outer ring
    const outerRing = mainShape.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", size * 0.4)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    // Inner core
    const innerCore = mainShape.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", size * 0.25)
      .attr("fill", "url(#aiGradient)");

    // Neural network lines
    const neuralLines = mainShape.append("g").attr("class", "neural-lines");

    const lineData = [
      { x1: centerX - size * 0.15, y1: centerY - size * 0.1, x2: centerX + size * 0.1, y2: centerY + size * 0.15 },
      { x1: centerX + size * 0.15, y1: centerY - size * 0.1, x2: centerX - size * 0.1, y2: centerY + size * 0.15 },
      { x1: centerX, y1: centerY - size * 0.15, x2: centerX, y2: centerY + size * 0.15 },
      { x1: centerX - size * 0.1, y1: centerY, x2: centerX + size * 0.1, y2: centerY }
    ];

    neuralLines.selectAll("line")
      .data(lineData)
      .enter()
      .append("line")
      .attr("x1", d => d.x1)
      .attr("y1", d => d.y1)
      .attr("x2", d => d.x2)
      .attr("y2", d => d.y2)
      .attr("stroke", "#8b5cf6")
      .attr("stroke-width", 1)
      .attr("opacity", 0.4);

    // Floating particles
    const particles = svg.append("g").attr("class", "particles");
    const particleData = d3.range(6).map((d, i) => ({
      angle: (i * 60) * Math.PI / 180,
      radius: size * 0.35,
      id: i
    }));

    particles.selectAll("circle")
      .data(particleData)
      .enter()
      .append("circle")
      .attr("cx", d => centerX + Math.cos(d.angle) * d.radius)
      .attr("cy", d => centerY + Math.sin(d.angle) * d.radius)
      .attr("r", 2)
      .attr("fill", "#a855f7")
      .attr("opacity", 0.6);

    // Animation functions
    const startBasePulse = () => {
      innerCore
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("r", size * 0.28)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("r", size * 0.25)
        .on("end", startBasePulse);

      outerRing
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("r", size * 0.42)
        .attr("opacity", 0.3)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("r", size * 0.4)
        .attr("opacity", 0.6);
    };

    const rotateParticles = () => {
      particles.selectAll("circle")
        .transition()
        .duration(8000)
        .ease(d3.easeLinear)
        .attrTween("transform", function(d) {
          return d3.interpolateString(
            `rotate(0 ${centerX} ${centerY})`,
            `rotate(360 ${centerX} ${centerY})`
          );
        })
        .on("end", rotateParticles);
    };

    // State-specific animations
    if (isThinking) {
      innerCore.attr("fill", "url(#thinkingGradient)");

      // Rapid pulse for thinking
      const thinkingPulse = () => {
        innerCore
          .transition()
          .duration(400)
          .ease(d3.easeBounce)
          .attr("r", size * 0.3)
          .transition()
          .duration(400)
          .ease(d3.easeBounce)
          .attr("r", size * 0.22)
          .on("end", thinkingPulse);
      };
      thinkingPulse();

      // Flicker neural lines
      neuralLines.selectAll("line")
        .transition()
        .duration(200)
        .attr("opacity", 0.8)
        .transition()
        .duration(200)
        .attr("opacity", 0.2)
        .on("end", function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.4);
        });

    } else if (isSpeaking) {
      innerCore.attr("fill", "url(#speakingGradient)");

      // Speaking wave animation
      const speakingWave = () => {
        outerRing
          .transition()
          .duration(600)
          .ease(d3.easeLinear)
          .attr("r", size * 0.45)
          .attr("opacity", 0.8)
          .transition()
          .duration(600)
          .ease(d3.easeLinear)
          .attr("r", size * 0.4)
          .attr("opacity", 0.4)
          .on("end", speakingWave);
      };
      speakingWave();

      // Enhanced neural activity
      neuralLines.selectAll("line")
        .attr("stroke", "#10b981")
        .attr("opacity", 0.7)
        .attr("stroke-width", 1.5);

    } else {
      // Default state
      innerCore.attr("fill", "url(#aiGradient)");
      startBasePulse();
    }

    // Always rotate particles
    rotateParticles();

  }, [size, isThinking, isSpeaking]);

  return (
    <div className={`inline-block ${className}`}>
      <svg
        ref={svgRef}
        className="drop-shadow-sm"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
        }}
      />
    </div>
  );
};

export default ChartAIAvatar;