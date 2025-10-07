import React, {useState, useEffect, useRef} from 'react';
import styles from './BasicDataCanvasDesign.module.css';
import StatusBarDesign from './StatusBarDesign';
import CommandInputDesign from "./CommandInputDesign";
import CanvasToolBarDesign from "./CanvasToolBarDesign";
import ToggleTabsDesign from "./ToggleTabsDesign";
import MarkdownMessage from './MarkdownMessage';
import DataLineagePanel from './DataLineagePanel';
import StravaResponseCard from './StravaResponseCard';
import Toast from './Toast';
import * as d3 from 'd3';
import { useConnections } from '../contexts/ConnectionContext';

const MarketingDemo = () => {
    const connections = useConnections();
    const [activeTab, setActiveTab] = useState('build');
    const [animationMode, setAnimationMode] = useState('demo');
    const [showOverlay, setShowOverlay] = useState(false);
    const [toast, setToast] = useState(null);
    const [isAnimating, setIsAnimating] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(10.0);
    const svgRef = useRef();
    const [showDataLineage, setShowDataLineage] = useState(false);
    const animationTimeouts = useRef([]);
    const replayFunctionRef = useRef(null);
    const [shouldStartTyping, setShouldStartTyping] = useState(false);
    const [messages, setMessages] = useState([]);
    const [activeSlideId, setActiveSlideId] = useState(null);
    const [totalSlides, setTotalSlides] = useState(0);
    const [isLoadingStrava, setIsLoadingStrava] = useState(false);

    const SKIP_ANIMATION =
      localStorage.getItem('skipAnimation') === 'true' ||
      new URLSearchParams(window.location.search).get('skip') === 'true';

    useEffect(() => {
      if (SKIP_ANIMATION) {
        setIsAnimating(false);
        setAnimationMode('live');
        // Skip chart - canvas stays empty for Strava integration
        return;
      } else if (animationMode === 'demo' && svgRef.current) {
        startOnboardingAnimation();
      }
      return () => clearAllAnimations();
    }, [animationMode]);

    const addMessage = (text, type = 'user', metadata = {}) => {
      console.log(`Adding ${type} message:`, text.substring(0, 50));

      const newMessage = {
        id: Date.now() + Math.random(),
        text: text,
        type: type,
        timestamp: new Date(),
        ...metadata  // Spread any additional metadata like stravaResponse
      };

      setMessages(prev => {
        console.log(`Messages before: ${prev.length}, after: ${prev.length + 1}`);
        return [...prev, newMessage];
      });
    };


    const getSpeedAdjusted = (timeMs) => {
      return timeMs / playbackSpeed;
    };

    const showToast = (message, type = 'success') => {
      setToast({ message, type });
    };

    const clearAllAnimations = () => {
      animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      animationTimeouts.current = [];
    };

    const animateBubbleGrid = () => {
      const svg = d3.select(svgRef.current);
      const container = svgRef.current.parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Set SVG dimensions explicitly
      svg.attr('width', width).attr('height', height);

      // Grid configuration
      const gridSpacing = 25;
      const dotRadius = 0.65;
      const basePadding = 0;

      // Account for border and ensure dots stay within bounds
      const margin = basePadding + dotRadius + 2; // +2 for border

      const availableWidth = Math.max(0, width - (margin * 2));
      const availableHeight = Math.max(0, height - (margin * 2));

      const cols = Math.floor(availableWidth / gridSpacing);
      const rows = Math.floor(availableHeight / gridSpacing);

      // Center the grid within available space
      const totalGridWidth = (cols - 1) * gridSpacing;
      const totalGridHeight = (rows - 1) * gridSpacing;
      const offsetX = Math.floor(margin + (availableWidth - totalGridWidth) / 2);
      const offsetY = Math.floor(margin + (availableHeight - totalGridHeight) / 2);

      // Create grid points data
      const gridPoints = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Constrain final positions within safe bounds
          const finalX = Math.max(margin, Math.min(width - margin, offsetX + col * gridSpacing));
          const finalY = Math.max(margin, Math.min(height - margin, offsetY + row * gridSpacing));

          gridPoints.push({
              id: `dot-${row}-${col}`,
              finalX: finalX,
              finalY: finalY,
              startX: finalX + (Math.random() - 0.5) * 10,
              startY: finalY + (Math.random() - 0.5) * 10
          });
        }
      }

      // Animation timing variables (calculated after gridPoints is populated)
      const delayPerDot = getSpeedAdjusted(0.15);// 0.25
      const initialDuration = getSpeedAdjusted(35); // 200
      const positionDuration = getSpeedAdjusted(100); // 600
      const maxDelay = gridPoints.length * delayPerDot + initialDuration + positionDuration;

      // Create dots at random positions (bubble effect)
      const dots = svg.selectAll('.grid-dot')
        .data(gridPoints)
        .enter()
        .append('circle')
        .attr('class', 'grid-dot')
        .attr('cx', d => d.startX)
        .attr('cy', d => d.startY)
        .attr('r', 0)
        .attr('fill', '#314362')
        .attr('opacity', 0.25);

      // Animate dots appearing (bubble pop)
      dots.transition()
        .duration(initialDuration)
        .delay((d, i) => i * delayPerDot)
        .attr('r', dotRadius)
        .on('end', function(d) {
          // Then animate to grid position
          d3.select(this)
            .transition()
            .duration(positionDuration)
            .ease(d3.easeBackOut.overshoot(0.3))
            .attr('cx', d.finalX)
            .attr('cy', d.finalY);
        });

      // Step 1: Trigger chart animation after grid completes
      const chartTimeout = setTimeout(() => {
          animateGhostChart();
      }, getSpeedAdjusted(maxDelay)); // Longer pause after grid - AI "processing"

      animationTimeouts.current.push(chartTimeout);
    };

    const animateGhostChart = () => {
      const svg = d3.select(svgRef.current);
      const container = svgRef.current.parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Chart dimensions - increased to accommodate all labels
      const margin = { top: 60, right: 80, bottom: 80, left: 80 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      // Create chart group
      const chartGroup = svg.append('g')
        .attr('class', 'ghost-chart')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // Animate axes first
      animateAxes(chartGroup, chartWidth, chartHeight);

      // Then animate lines after axes complete (with thinking pause)
      const axesTimeout = setTimeout(() => {
        animateLines(chartGroup, chartWidth, chartHeight);
      }, 50); // Increased from 800 to 1200 for more deliberate feel

      animationTimeouts.current.push(axesTimeout);
    };

    const animateAxes = (group, width, height) => {
      let axesCompleted = 0;

      const checkBothAxesComplete = () => {
        axesCompleted++;
        if (axesCompleted === 2) {
          // Both axes done, add grid lines
          setTimeout(() => addGridLines(group, width, height), 50); // 300
        }
      };

      // X-axis grows from left to right
      const xAxis = group.append('line')
        .attr('class', 'ghost-axis')
        .attr('x1', 0)
        .attr('y1', height)
        .attr('x2', 0)
        .attr('y2', height)
        .attr('stroke', '#314362')
        .attr('stroke-width', 2)
        .attr('opacity', 0.4);

      xAxis.transition()
        .duration(600)
        .attr('x2', width)
        .on('end', () => {
          addXAxisLabels(group, width, height);
          checkBothAxesComplete();
        });

      // Y-axis grows from bottom to top
      const yAxis = group.append('line')
        .attr('class', 'ghost-axis')
        .attr('x1', 0)
        .attr('y1', height)
        .attr('x2', 0)
        .attr('y2', height)
        .attr('stroke', '#314362')
        .attr('stroke-width', 2)
        .attr('opacity', 0.4);

      yAxis.transition()
        .duration(600)
        .attr('y2', 0)
        .on('end', () => {
          addYAxisLabels(group, width, height);
          checkBothAxesComplete();
        });
    };

    const addXAxisLabels = (group, width, height) => {
      const timeLabels = ['Week 1', 'Month 1', 'Month 3', 'Month 6', 'Month 12'];
      const xPositions = [0, width * 0.25, width * 0.5, width * 0.75, width];

      xPositions.forEach((x, i) => {
        // Tick marks
        group.append('line')
          .attr('class', 'ghost-tick')
          .attr('x1', x)
          .attr('y1', height)
          .attr('x2', x)
          .attr('y2', height + 5)
          .attr('stroke', '#314362')
          .attr('stroke-width', 1)
          .attr('opacity', 0)
          .transition()
          .delay(i * 100 + 150)
          .duration(200)
          .attr('opacity', 0.4);

        // Labels
        group.append('text')
          .attr('class', 'ghost-axis-label')
          .attr('x', x)
          .attr('y', height + 20)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', '#314362')
          .attr('opacity', 0)
          .text(timeLabels[i])
          .transition()
          .delay(i * 100 + 100)
          .duration(200)
          .attr('opacity', 0.5);
      });
    };

    const addYAxisLabels = (group, width, height) => {
      const percentLabels = ['0%', '25%', '50%', '75%', '100%'];
      const yPositions = [height, height * 0.75, height * 0.5, height * 0.25, 0];

      yPositions.forEach((y, i) => {
        // Tick marks
        group.append('line')
          .attr('class', 'ghost-tick')
          .attr('x1', -5)
          .attr('y1', y)
          .attr('x2', 0)
          .attr('y2', y)
          .attr('stroke', '#314362')
          .attr('stroke-width', 1)
          .attr('opacity', 0)
          .transition()
          .delay(i * 100)
          .duration(200) // 200
          .attr('opacity', 0.4);

        // Labels
        group.append('text')
          .attr('class', 'ghost-axis-label')
          .attr('x', -15)
          .attr('y', y + 3)
          .attr('text-anchor', 'end')
          .attr('font-size', 10)
          .attr('fill', '#314362')
          .attr('opacity', 0)
          .text(percentLabels[i])
          .transition()
          .delay(i * 100 + 100)
          .duration(200)
          .attr('opacity', 0.5);
      });
    };

    const addGridLines = (group, width, height) => {
      // Horizontal grid lines (for retention percentages)
      const yPositions = [height * 0.75, height * 0.5, height * 0.25];

      yPositions.forEach((y, i) => {
        group.append('line')
          .attr('class', 'ghost-grid-line')
          .attr('x1', 0)
          .attr('y1', y)
          .attr('x2', 0)
          .attr('y2', y)
          .attr('stroke', '#314362')
          .attr('stroke-width', 0.5)
          .attr('opacity', 0)
          .transition()
          .delay(i * 150 + 200)
          .duration(400)
          .attr('x2', width)
          .attr('opacity', 0.15);
      });

      // Vertical grid lines (for time periods)
      const xPositions = [width * 0.25, width * 0.5, width * 0.75];

      xPositions.forEach((x, i) => {
        group.append('line')
          .attr('class', 'ghost-grid-line')
          .attr('x1', x)
          .attr('y1', height)
          .attr('x2', x)
          .attr('y2', height)
          .attr('stroke', '#314362')
          .attr('stroke-width', 0.5)
          .attr('opacity', 0)
          .transition()
          .delay(i * 150 + 200)
          .duration(400) //400
          .attr('y2', 0)
          .attr('opacity', 0.15);
      });
    };

    const animateLines = (group, width, height) => {
      // Sample retention data points (3 cohorts)
      const cohortData = [
        { name: 'Jan 2024', color: '#26487e', points: [
          {x: 0, y: height * 0.3},
          {x: width * 0.25, y: height * 0.4},
          {x: width * 0.5, y: height * 0.5},
          {x: width * 0.75, y: height * 0.6},
          {x: width, y: height * 0.7}
        ]},
        { name: 'Feb 2024', color: '#136449', points: [
          {x: 0, y: height * 0.2},
          {x: width * 0.25, y: height * 0.3},
          {x: width * 0.5, y: height * 0.4},
          {x: width * 0.75, y: height * 0.45},
          {x: width, y: height * 0.5}
        ]},
        { name: 'Mar 2024', color: '#6c6b33', points: [
          {x: 0, y: height * 0.1},
          {x: width * 0.25, y: height * 0.2},
          {x: width * 0.5, y: height * 0.25},
          {x: width * 0.75, y: height * 0.3},
          {x: width, y: height * 0.35}
        ]}
      ];

      // Start with first cohort, chain the rest
      drawCohortLineSequential(group, cohortData, 0, width, height);
    };

    const drawCohortLineSequential = (group, cohortData, index, width, height) => {
      if (index >= cohortData.length) {
          // All lines drawn - add contextual insight first
          setTimeout(() => {
            addContextualInsight(group, width, height);
            // Then add labels, legend, completion
            setTimeout(() => {
              addGhostLabels(group, width, height);
              setTimeout(() => {
                addLegend(group, width, height);
                chartCompletionMoment(group, width, height);
              }, 0); //600
            }, 0); //800
          }, 0); //300
          return;
      }

      const cohort = cohortData[index];

      const lineFunction = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveCardinal);

      const path = group.append('path')
        .datum(cohort.points)
        .attr('class', 'ghost-line')
        .attr('fill', 'none')
        .attr('stroke', cohort.color)
        .attr('stroke-width', 2)
        .attr('opacity', 0.5)
        .attr('d', lineFunction);

      const totalLength = path.node().getTotalLength();

      path
      .attr('stroke-dasharray', totalLength + ' ' + totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(400) // Slightly slower line drawing
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0)
      .on('end', () => {
        // Pause before drawing next line (AI "thinking")
        setTimeout(() => {
          drawCohortLineSequential(group, cohortData, index + 1, width, height);
        }, 400); // 400ms pause between lines
      });
    };


    const addGhostLabels = (group, width, height) => {
      // Chart title
      group.append('text')
        .attr('class', 'ghost-label')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .attr('font-size', 16)
        .attr('font-weight', 'bold')
        .attr('fill', '#314362')
        .attr('opacity', 0)
        .text('Retention by Cohort')
        .transition()
        .duration(400)
        .attr('opacity', 0.6);

      // Y-axis label (rotated, moved left for clearance)
      group.append('text')
        .attr('class', 'ghost-label')
        .attr('x', -50)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('fill', '#314362')
        .attr('opacity', 0)
        .attr('transform', `rotate(-90, -50, ${height / 2})`)
        .text('Retention %')
        .transition()
        .duration(40) //400
        .attr('opacity', 0.6);

      // X-axis label
      group.append('text')
        .attr('class', 'ghost-label')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('fill', '#314362')
        .attr('opacity', 0)
        .text('Time Period')
        .transition()
        .duration(4) //400
        .attr('opacity', 0.6)
        .on('end', () => {
          // After labels appear, fade out the grid lines
          setTimeout(() => fadeOutGrids(), 800);
        });
    };

    const fadeOutGrids = () => {
      // Fade out the background dot grid
      d3.selectAll('.grid-dot')
        .transition()
        .duration(1500) //1200
        .ease(d3.easeQuadOut)
        .attr('opacity', 0.05);

      // Fade out the chart grid lines
      d3.selectAll('.ghost-grid-line')
        .transition()
        .duration(1200) // 1000
        .ease(d3.easeQuadOut)
        .attr('opacity', 0.02);
    };


    const addLegend = (group, width, height) => {
      const legendData = [
        { name: 'Jan 2024', color: '#26487e' },
        { name: 'Feb 2024', color: '#136449' },
        { name: 'Mar 2024', color: '#6c6b33' }
      ];

      const legendGroup = group.append('g')
        .attr('class', 'ghost-legend')
        .attr('transform', `translate(${width - 120}, 20)`);

      legendData.forEach((item, i) => {
        const legendItem = legendGroup.append('g')
          .attr('class', 'legend-item')
          .attr('transform', `translate(0, ${i * 20})`)
          .attr('opacity', 0);

        // Legend line
        legendItem.append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', 15)
          .attr('y2', 0)
          .attr('stroke', item.color)
          .attr('stroke-width', 2);

        // Legend text
        legendItem.append('text')
          .attr('x', 20)
          .attr('y', 4)
          .attr('font-size', 11)
          .attr('fill', '#314362')
          .text(item.name);

        // Animate in with staggered delay
        legendItem
          .transition()
          .delay(i * 150)
          .duration(300)
          .attr('opacity', 0.7)
          .on('end', function() {
            // Add click interaction after animation completes
            d3.select(this)
              .style('cursor', 'pointer')
              .on('click', function() {
                const lineIndex = i + 1; // D3 uses 1-based indexing for nth-child
                const currentLine = d3.selectAll('.ghost-line').filter((d, idx) => idx === i);
                const isVisible = currentLine.attr('opacity') > 0.1;

                // Toggle line visibility
                currentLine
                  .transition()
                  .duration(300)
                  .attr('opacity', isVisible ? 0.1 : 0.85);

                // Update legend appearance
                d3.select(this)
                  .transition()
                  .duration(300)
                  .attr('opacity', isVisible ? 0.3 : 0.9);
              });
          });
      });
    };

    const chartCompletionMoment = (group, width, height) => {
      // Slight pause, then enhance the chart for "completion"
      setTimeout(() => {
        // Brighten and sharpen all chart lines
        d3.selectAll('.ghost-line')
          .transition()
          .duration(80) //800
          .ease(d3.easeQuadOut)
          .attr('opacity', 0.85) // From 0.5 to 0.85
          .attr('stroke-width', 2.5); // Slightly thicker

        // Sharpen axes
        d3.selectAll('.ghost-axis')
          .transition()
          .duration(800)
          .attr('opacity', 0.7) // From 0.4 to 0.7
          .attr('stroke-width', 2.5);

        // Enhance labels
        d3.selectAll('.ghost-label, .ghost-axis-label')
          .transition()
          .duration(80) //800
          .attr('opacity', 0.8); // Slightly more prominent

        // Enhance legend
        d3.selectAll('.legend-item')
          .transition()
          .duration(800)
          .attr('opacity', 0.9);

        // Subtle "glow" effect on the whole chart
        group.transition()
          .duration(10) //1000
          .style('filter', 'drop-shadow(0 0 8px rgba(49, 67, 98, 0.1))');

        // Signal animation is complete
        setTimeout(() => {
          setIsAnimating(false);
          // Show replay hint
          // showReplayHint(group, width, height);
        }, 1200); // After all completion effects finish

       // Add hover interactions after completion
        setTimeout(() => {
          addLineHoverInteractions(group, width, height);
        }, 500);

        // Add data confidence after hover interactions
        setTimeout(() => {
          addDataConfidenceIndicator(group, width, height);

          // Reveal data quality issues after badges appear
          setTimeout(() => {
            revealDataQualityIssues(group, width, height);
          }, 2000);

          // Show "Ask about chart" button after overlay dismisses
          setTimeout(() => {
            addAskChartButton(group, width, height);
          }, 4000); // 8000
        }, 800);
      }, 800); // 1000 , Wait 1 second after legend completes
    };


    const addLineHoverInteractions = (group, width, height) => {
      // Create invisible hover areas over each line (wider for easier targeting)
      const cohortData = [
        { name: 'Jan 2024', color: '#26487e', points: [
          {x: 0, y: height * 0.3},
          {x: width * 0.25, y: height * 0.4},
          {x: width * 0.5, y: height * 0.5},
          {x: width * 0.75, y: height * 0.6},
          {x: width, y: height * 0.7}
        ]},
        { name: 'Feb 2024', color: '#136449', points: [
          {x: 0, y: height * 0.2},
          {x: width * 0.25, y: height * 0.3},
          {x: width * 0.5, y: height * 0.4},
          {x: width * 0.75, y: height * 0.45},
          {x: width, y: height * 0.5}
        ]},
        { name: 'Mar 2024', color: '#6c6b33', points: [
          {x: 0, y: height * 0.1},
          {x: width * 0.25, y: height * 0.2},
          {x: width * 0.5, y: height * 0.25},
          {x: width * 0.75, y: height * 0.3},
          {x: width, y: height * 0.35}
        ]}
      ];

      const lineFunction = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveCardinal);

      cohortData.forEach((cohort, i) => {
        // Create wider invisible hover line
        const hoverLine = group.append('path')
          .datum(cohort.points)
          .attr('class', `hover-line-${i}`)
          .attr('d', lineFunction)
          .attr('fill', 'none')
          .attr('stroke', 'transparent')
          .attr('stroke-width', 15) // Much wider for easier hovering
          .style('cursor', 'pointer');

        // Hover interactions
        hoverLine
          .on('mouseover', function() {
            // Highlight the corresponding visible line
            d3.selectAll('.ghost-line')
              .transition()
              .duration(150)
              .attr('opacity', 0.3); // Dim other lines

            d3.selectAll('.ghost-line')
              .filter((d, index) => index === i)
              .transition()
              .duration(150)
              .attr('opacity', 1)
              .attr('stroke-width', 3); // Thicken highlighted line

            // Highlight corresponding legend item
            d3.selectAll('.legend-item')
              .transition()
              .duration(150)
              .attr('opacity', 0.4);

            d3.selectAll('.legend-item')
              .filter((d, index) => index === i)
              .transition()
              .duration(150)
              .attr('opacity', 1);
          })
          .on('mouseout', function() {
            // Reset all lines
            d3.selectAll('.ghost-line')
              .transition()
              .duration(200)
              .attr('opacity', 0.85)
              .attr('stroke-width', 2.5);

            // Reset all legend items
            d3.selectAll('.legend-item')
              .transition()
              .duration(200)
              .attr('opacity', 0.9);
          });
      });
    };

    const addDataConfidenceIndicator = (group, width, height) => {
      // Left side - Confidence indicator
      const confidenceGroup = group.append('g')
        .attr('class', 'confidence-indicator')
        .attr('transform', 'translate(0, -45)');

      confidenceGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 100)
        .attr('height', 22)
        .attr('rx', 11)
        .attr('fill', '#e8f4f8')
        .attr('stroke', '#26487e')
        .attr('stroke-width', 1)
        .attr('opacity', 0)
        .transition()
        .duration(60) //600
        .attr('opacity', 0.9);

      confidenceGroup.append('text')
        .attr('x', 50)
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('font-weight', 'bold')
        .attr('fill', '#26487e')
        .attr('opacity', 0)
        .text('High Confidence')
        .transition()
        .delay(0) // 200
        .duration(4) // 400
        .attr('opacity', 1);

      // Right side - Coverage indicator
      const coverageGroup = group.append('g')
        .attr('class', 'coverage-indicator')
        .attr('transform', `translate(${width - 90}, -45)`);

      coverageGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 90)
        .attr('height', 22)
        .attr('rx', 11)
        .attr('fill', '#e8f8f0')
        .attr('stroke', '#136449')
        .attr('stroke-width', 1)
        .attr('opacity', 0)
        .transition()
        .delay(0) //200
        .duration(60) //600
        .attr('opacity', 0.9);

      coverageGroup.append('text')
        .attr('x', 12)
        .attr('y', 14)
        .attr('font-size', 9)
        .attr('fill', '#136449')
        .attr('font-weight', 'bold')
        .attr('opacity', 0)
        .text('94% coverage')
        .transition()
        .delay(0) //600
        .duration(40) //400
        .attr('opacity', 0.8);

      // Add audit trail button
    const auditGroup = group.append('g')
      .attr('class', 'audit-button')
      .attr('transform', `translate(${width / 2 - 40}, -45)`)
      .style('cursor', 'pointer')
      .attr('opacity', 0);

    auditGroup.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 80)
      .attr('height', 22)
      .attr('rx', 11)
      .attr('fill', '#fef3c7')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1);

    auditGroup.append('text')
      .attr('x', 40)
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('font-weight', 'bold')
      .attr('fill', '#f59e0b')
      .style('pointer-events', 'none')
      .text('View Audit');

    auditGroup
      .transition()
      .delay(0) //400
      .duration(60) //600
      .attr('opacity', 0.9)
      .on('end', function() {
        d3.select(this).on('click', () => showAuditPanel(group, width, height));
      });

    // Add data flow button
    const dataFlowGroup = group.append('g')
      .attr('class', 'data-flow-button')
      .attr('transform', `translate(${width / 2 + 50}, -45)`)
      .style('cursor', 'pointer')
      .attr('opacity', 0);

    dataFlowGroup.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 100)
      .attr('height', 22)
      .attr('rx', 11)
      .attr('fill', '#e0e7ff')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 1);

    dataFlowGroup.append('text')
      .attr('x', 50)
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('font-weight', 'bold')
      .attr('fill', '#6366f1')
      .style('pointer-events', 'none')
      .text('View Data Flow');

    dataFlowGroup
      .transition()
      .delay(600)
      .duration(600)
      .attr('opacity', 0.9)
      .on('end', function() {
        d3.select(this).on('click', () => setShowDataLineage(true));
      });
    };

    const showAuditPanel = (group, width, height) => {
      // Create backdrop
      const auditBackdrop = group.append('rect')
        .attr('x', -80)
        .attr('y', -60)
        .attr('width', width + 160)
        .attr('height', height + 140)
        .attr('fill', 'rgba(0, 0, 0, 0.85)')
        .attr('opacity', 0)
        .attr('class', 'audit-panel-backdrop')
        .style('cursor', 'pointer')
        .on('click', dismissAuditPanel);

      auditBackdrop.transition()
        .duration(400)
        .attr('opacity', 1);

      // Create panel
      const panelWidth = 400;
      const panelHeight = 320;
      const panelX = (width - panelWidth) / 2;
      const panelY = (height - panelHeight) / 2;

      const panel = group.append('g')
        .attr('class', 'audit-panel')
        .attr('transform', `translate(${panelX}, ${panelY})`)
        .attr('opacity', 0);

      // Panel background
      panel.append('rect')
        .attr('width', panelWidth)
        .attr('height', panelHeight)
        .attr('rx', 12)
        .attr('fill', 'white')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 2);

      // Header
      panel.append('text')
        .attr('x', 20)
        .attr('y', 35)
        .attr('font-size', 16)
        .attr('font-weight', 'bold')
        .attr('fill', '#1f2937')
        .text('Data Quality Issues Detected');

      // Close button
      const closeBtn = panel.append('g')
        .attr('transform', `translate(${panelWidth - 30}, 20)`)
        .style('cursor', 'pointer')
        .on('click', dismissAuditPanel);

      closeBtn.append('circle')
        .attr('r', 10)
        .attr('fill', '#ef4444');

      closeBtn.append('text')
        .attr('y', 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', 14)
        .attr('font-weight', 'bold')
        .attr('fill', 'white')
        .style('pointer-events', 'none')
        .text('×');

      // Issue 1
      const issue1Y = 70;
      panel.append('text')
        .attr('x', 20)
        .attr('y', issue1Y)
        .attr('font-size', 14)
        .attr('font-weight', 'bold')
        .attr('fill', '#dc2626')
        .text('⚠ User ID Fragmentation');

      panel.append('text')
        .attr('x', 20)
        .attr('y', issue1Y + 20)
        .attr('font-size', 12)
        .attr('fill', '#374151')
        .text('847 users tracked under multiple IDs');

      panel.append('text')
        .attr('x', 20)
        .attr('y', issue1Y + 38)
        .attr('font-size', 11)
        .attr('fill', '#6b7280')
        .text('Found: Same email with different user_ids');

      // Issue 2
      const issue2Y = 160;
      panel.append('text')
        .attr('x', 20)
        .attr('y', issue2Y)
        .attr('font-size', 14)
        .attr('font-weight', 'bold')
        .attr('fill', '#dc2626')
        .text('⚠ Event Gap: add_to_cart → checkout');

      panel.append('text')
        .attr('x', 20)
        .attr('y', issue2Y + 20)
        .attr('font-size', 12)
        .attr('fill', '#374151')
        .text('2,341 events fired → 1,567 completed (33% missing)');

      // Issue 3
      const issue3Y = 230;
      panel.append('text')
        .attr('x', 20)
        .attr('y', issue3Y)
        .attr('font-size', 14)
        .attr('font-weight', 'bold')
        .attr('fill', '#dc2626')
        .text('⚠ Session Breaks');

      panel.append('text')
        .attr('x', 20)
        .attr('y', issue3Y + 20)
        .attr('font-size', 12)
        .attr('fill', '#374151')
        .text('1,243 journeys split across states');

      panel.append('text')
        .attr('x', 20)
        .attr('y', issue3Y + 38)
        .attr('font-size', 11)
        .attr('fill', '#6b7280')
        .text('Found: user_id changes mid-session');

      // Animate in
      panel.transition()
        .duration(400)
        .attr('opacity', 1);
    };

    const dismissAuditPanel = () => {
      d3.selectAll('.audit-panel-backdrop, .audit-panel')
        .transition()
        .duration(300)
        .attr('opacity', 0)
        .remove();
    };

    const revealDataQualityIssues = (group, width, height) => {
      // Create backdrop overlay
      const backdrop = group.append('rect')
        .attr('x', -80)
        .attr('y', -60)
        .attr('width', width + 160)
        .attr('height', height + 140)
        .attr('fill', 'rgba(0, 0, 0, 0.75)')
        .attr('opacity', 0)
        .attr('class', 'quality-overlay-backdrop');

      backdrop.transition()
        .duration(600)
        .attr('opacity', 1);

      // Issue callouts data
      const issues = [
        {
          x: width * 0.75,
          y: height * 0.35,
          title: 'User ID Fragmentation',
          description: '847 users tracked under multiple IDs'
        },
        {
          x: width * 0.5,
          y: height * 0.55,
          title: 'Event Gap Detected',
          description: "'add_to_cart' → 'checkout' missing for 33%"
        },
        {
          x: width * 0.25,
          y: height * 0.25,
          title: 'Session Breaks',
          description: '1,243 journeys split across states'
        }
      ];

      // Create callouts with staggered animation
      issues.forEach((issue, i) => {
        const callout = group.append('g')
          .attr('class', 'quality-issue-callout')
          .attr('transform', `translate(${issue.x}, ${issue.y})`)
          .attr('opacity', 0);

        // Callout background
        callout.append('rect')
          .attr('x', -110)
          .attr('y', -30)
          .attr('width', 220)
          .attr('height', 60)
          .attr('rx', 8)
          .attr('fill', 'white')
          .attr('stroke', '#dc2626')
          .attr('stroke-width', 3);

        // Warning icon
        callout.append('text')
          .attr('x', -95)
          .attr('y', -5)
          .attr('font-size', 20)
          .attr('fill', '#dc2626')
          .text('⚠');

        // Title
        callout.append('text')
          .attr('x', -70)
          .attr('y', -8)
          .attr('font-size', 12)
          .attr('font-weight', 'bold')
          .attr('fill', '#1f2937')
          .text(issue.title);

        // Description
        callout.append('text')
          .attr('x', -70)
          .attr('y', 8)
          .attr('font-size', 10)
          .attr('fill', '#6b7280')
          .text(issue.description);

        // Animate in with stagger
        callout.transition()
          .delay(400 + (i * 100)) // 800 + (i * 400)
          .duration(100) // 400
          .attr('opacity', 1);
      });

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        d3.selectAll('.quality-overlay-backdrop, .quality-issue-callout')
          .transition()
          .duration(600)
          .attr('opacity', 0)
          .remove();
      }, 1000); //4000
    };

    const addAskChartButton = (group, width, height) => {
        const askButtonGroup = group.append('g')
          .attr('class', 'ask-chart-button')
          .attr('transform', `translate(${width - 200}, -45)`);

        askButtonGroup.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 100)
          .attr('height', 22)
          .attr('rx', 11)
          .attr('fill', '#f0f9ff')
          .attr('stroke', '#0ea5e9')
          .attr('stroke-width', 1)
          .attr('opacity', 0)
          .style('cursor', 'pointer')
          .transition()
          .delay(0) //400
          .duration(0) //600
          .attr('opacity', 0.9)
          .on('end', function() {
              d3.select(this.parentNode)
                .on('click', () => {
                  minimizeChartToReference();
                  setActiveTab('ask');
                  // Delay typing start to allow tab transition
                  setTimeout(() => {
                    setShouldStartTyping(true);
                  }, 0); // 500
              });
            });

        askButtonGroup.append('text')
          .attr('x', 50)
          .attr('y', 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('font-weight', 'bold')
          .attr('fill', '#0ea5e9')
          .attr('opacity', 0)
          .style('pointer-events', 'none')
          .text('Ask about chart')
          .transition()
          .delay(0) //800
          .duration(0) //400
          .attr('opacity', 1);
      };

    const minimizeChartToReference = () => {
      // Step 1: Minimize chart to bottom-left corner of canvas
      const svg = d3.select(svgRef.current);
      const container = svgRef.current.parentElement;

      // Capture current SVG as image data
      const svgElement = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create thumbnail at bottom-left of canvas
      const thumbnail = document.createElement('div');
      thumbnail.className = 'chart-thumbnail';
      thumbnail.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 20px;
        width: 300px;
        height: 200px;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 100;
        background-image: url(${svgUrl});
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      `;

      // Hide original SVG
      svg.style('display', 'none');
      container.appendChild(thumbnail);

      // Step 2: Create and slide in sidebar panel
        setTimeout(() => {
          console.log('Creating sidebar...');
          createSidebarPanel();
        }, 200);

        // Step 3: Move thumbnail to sidebar after panel appears
        setTimeout(() => {
          console.log('Moving thumbnail to sidebar...');
          moveThumbnailToSidebar(thumbnail);
        }, 1000); // Increased delay to ensure sidebar is fully visible

        // Step 4: Generate metric cards after thumbnail is positioned
        // setTimeout(() => {
        //   console.log('Generating metric cards...');
        //   generateMetricCards(svgUrl);
        // }, 1400);
    };

    const createSidebarPanel = () => {
      // Find the main container
      const mainContainer = svgRef.current.closest(`.${styles.container}`);

      if (!mainContainer) return;

      // Create a wrapper to hold both sidebar and main content
     const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          position: relative;
          display: flex;
          gap: 24px;
          width: 100%;
          height: 100%;
        `;

      // Insert wrapper before mainContainer and move mainContainer inside it
      mainContainer.parentNode.insertBefore(wrapper, mainContainer);
      wrapper.appendChild(mainContainer);

      // Create sidebar panel
      const sidebar = document.createElement('div');
      sidebar.id = 'analytics-sidebar';
      sidebar.style.cssText = `
          position: sticky;
          top: 0;
          width: 0px;
          height: 100vh;
          max-height: 86vh;
          background: #fafbfc;
          border-right: 2px solid #e5e7eb;
          box-shadow: 2px 0 8px rgba(0,0,0,0.1);
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), padding 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0;
          padding-right: 0;
          box-sizing: border-box;
          flex-shrink: 0;
        `;

      // Prevent sidebar from closing when clicked
      sidebar.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Insert sidebar before mainContainer in the wrapper
      wrapper.insertBefore(sidebar, mainContainer);

      // Slide in sidebar by changing width
      setTimeout(() => {
          sidebar.style.width = '350px';
          sidebar.style.padding = '20px 20px 20px 0';
      }, 50);
    };

    const moveThumbnailToSidebar = (thumbnail) => {
      // Remove from canvas container
      thumbnail.remove();

      // Create new thumbnail in sidebar
      const sidebar = document.getElementById('analytics-sidebar');
      if (!sidebar) return;

      const newThumbnail = thumbnail.cloneNode(true);
      newThumbnail.style.cssText = `
        position: relative;
        width: 300px;
        height: 180px;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin: 20px 25px;
        background-image: ${thumbnail.style.backgroundImage};
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        cursor: pointer;
      `;

      // Add click handlers for both restore and active highlighting
        newThumbnail.onclick = (e) => {
          e.stopPropagation();

          // Check if this is meant to set as active (single click) or restore (double click)
          if (e.detail === 1) {
            // Single click - set as active slide
            setActiveSlideHighlight('slide-chart');
          } else if (e.detail === 2) {
            // Double click - restore original view
            const originalSvg = d3.select(svgRef.current);
            originalSvg.style('display', 'block');
            sidebar.remove();
            // Reset main content position
            const container = document.querySelector('.container') || svgRef.current.closest('[class*="container"]');
            if (container) {
              container.style.marginLeft = '0px';
            }
          }
        };

        // Set chart thumbnail as clickable for active state
        newThumbnail.id = 'slide-chart';
        newThumbnail.className = 'metric-card';
        newThumbnail.dataset.color = '#26487e';
        newThumbnail.style.cursor = 'pointer';
        newThumbnail.style.transition = 'all 0.3s ease';

      sidebar.appendChild(newThumbnail);
      // Add slide number to thumbnail
        const slideNumber = document.createElement('div');
        slideNumber.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        `;
        slideNumber.textContent = '1/5';
        newThumbnail.style.position = 'relative';
        newThumbnail.appendChild(slideNumber);
    };

    const generateMetricCards = (chartImageUrl = null) => {
      console.log('generateMetricCards called');
      const sidebar = document.getElementById('analytics-sidebar');
      console.log('Sidebar found:', sidebar);

      if (!sidebar) {
        console.error('Sidebar not found!');
        return;
      }

      // If no chartImageUrl provided, try to get it from existing thumbnail
      if (!chartImageUrl) {
        const thumbnail = sidebar.querySelector('[style*="background-image"]');
        if (thumbnail) {
          const bgImage = thumbnail.style.backgroundImage;
          chartImageUrl = bgImage.match(/url\(['"]?(.*?)['"]?\)/)?.[1];
        }
      }

      // Metric cards data based on the retention chart
      const metricCards = [
          {
            title: '✓ Reliable: Jan 2024 Cohort',
            value: '70%',
            description: '89% data quality - Safe for analysis',
            color: '#10b981',
            trend: 'stable',
            status: 'reliable'
          },
          {
            title: '✓ Reliable: Feb 2024 Cohort',
            value: '50%',
            description: '87% data quality - Safe for analysis',
            color: '#10b981',
            trend: 'stable',
            status: 'reliable'
          },
          {
            title: '⚠ Excluded: March 2024',
            value: '51%',
            description: 'ID fragmentation detected - Not reliable',
            color: '#ef4444',
            trend: 'down',
            status: 'excluded'
          },
          {
            title: '⚠ Blocked: Expansion Metrics',
            value: 'N/A',
            description: 'Event gaps prevent accurate calculation',
            color: '#f59e0b',
            trend: 'stable',
            status: 'blocked'
          }
      ];

      // Create cards container
      const cardsContainer = document.createElement('div');
      cardsContainer.style.cssText = `
        padding: 20px 0px;
        margin-top: 20px;
      `;
      cardsContainer.id = 'metric-cards-container';

      console.log('Creating', metricCards.length, 'cards');

      metricCards.forEach((card, index) => {
          setTimeout(() => {
            console.log('Creating card', index + 1, ':', card.title);
            const cardElement = createMetricCard(card, index);
            cardsContainer.appendChild(cardElement);
            console.log('Card added to container');
          }, index * 200);
      });

      sidebar.appendChild(cardsContainer);
        console.log('Cards container added to sidebar');

        // Set total slides count (1 chart thumbnail + 4 metric cards)
        setTotalSlides(metricCards.length + 1);
    };


    // Expose for CommandInput to trigger
    window.generateMetricCardsForSidebar = generateMetricCards;

    const createMetricCard = (card, index) => {
      const cardDiv = document.createElement('div');
      const slideId = `slide-${index}`;
      cardDiv.id = slideId;
      cardDiv.className = 'metric-card';
      cardDiv.dataset.color = card.color;

      cardDiv.style.cssText = `
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        margin-left: 25px;
        margin-right: 25px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transform: translateY(0px);
        opacity: 1;
        border-left: 4px solid ${card.color};
        width: 280px;
        box-sizing: border-box;
        cursor: pointer;
        transition: all 0.3s ease;
      `;

      const trendIcon = card.trend === 'up' ? '↗' : card.trend === 'down' ? '↘' : '→';
      const trendColor = card.trend === 'up' ? '#10b981' : card.trend === 'down' ? '#ef4444' : '#6b7280';

      cardDiv.innerHTML = `
          <div style="position: relative;">
            <div style="position: absolute; top: -8px; right: -8px; background: rgba(0, 0, 0, 0.7); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
              ${index + 2}/5
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #374151;">${card.title}</h4>
              <span style="color: ${trendColor}; font-size: 16px;">${trendIcon}</span>
            </div>
            <div style="font-size: 24px; font-weight: bold; color: ${card.color}; margin-bottom: 4px;">
              ${card.value}
            </div>
            <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">
              ${card.description}
            </div>
          </div>
      `;

      // Add click handler with direct DOM manipulation
      cardDiv.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        setActiveSlideHighlight(slideId);
      });

      return cardDiv;
    };

    const setActiveSlideHighlight = (slideId) => {
      // Remove active styling from all cards
      document.querySelectorAll('.metric-card').forEach(card => {
        const originalColor = card.dataset.color || '#e5e7eb';
        card.style.borderLeft = `4px solid ${originalColor}`;
        card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        card.style.backgroundColor = 'white';
      });

      // Add active styling to selected card
      const activeCard = document.getElementById(slideId);
      if (activeCard) {
        activeCard.style.borderLeft = '4px solid #dc2626';
        activeCard.style.boxShadow = '0 0 0 2px rgba(220, 38, 38, 0.2), 0 4px 12px rgba(0,0,0,0.15)';
        activeCard.style.backgroundColor = '#fef2f2';

        console.log('Active slide set to:', slideId);
      }
    };

    const addContextualInsight = (group, width, height) => {
      // Position insight near the notable March cohort drop
      const insightGroup = group.append('g')
        .attr('class', 'contextual-insight')
        .attr('transform', `translate(${width * 0.6}, ${height * 0.2})`);

      // Info icon background circle with subtle shadow
      const iconShadow = insightGroup.append('circle')
        .attr('cx', 1)
        .attr('cy', 1)
        .attr('r', 8)
        .attr('fill', 'rgba(0, 0, 0, 0.15)')
        .attr('opacity', 0);

      const infoIcon = insightGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 8)
        .attr('fill', 'rgba(59, 130, 246, 0.9)')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .style('cursor', 'pointer');

      infoIcon.transition()
        .duration(300)
        .attr('opacity', 1);

      iconShadow.transition()
        .duration(300)
        .attr('opacity', 1);

      // "i" icon
      const iText = insightGroup.append('text')
        .attr('x', 0)
        .attr('y', 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .attr('opacity', 0)
        .style('cursor', 'pointer')
        .style('pointer-events', 'none') // Let clicks pass through to circle
        .text('i');

      iText.transition()
        .delay(150)
        .duration(300)
        .attr('opacity', 1);

      // Simplified callout without arrow
      const calloutGroup = group.append('g')
        .attr('class', 'insight-callout')
        .attr('transform', `translate(${Math.max(0, width * 0.6 - 250)}, ${height * 0.2 - 30})`)
        .attr('opacity', 0);

      // Callout drop shadow
      calloutGroup.append('rect')
        .attr('x', 2)
        .attr('y', 2)
        .attr('width', 220) // 200
        .attr('height', 50)
        .attr('rx', 12)
        .attr('fill', 'rgba(0, 0, 0, 0.1)');

      // Callout background with gradient
      const defs = group.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', 'callout-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', 'rgba(59, 130, 246, 0.95)');

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', 'rgba(37, 99, 235, 0.95)');

      calloutGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 220)
        .attr('height', 50)
        .attr('rx', 12)
        .attr('fill', 'url(#callout-gradient)')
        .attr('stroke', 'rgba(255, 255, 255, 0.3)')
        .attr('stroke-width', 1);

      // Callout text with better spacing
      calloutGroup.append('text')
        .attr('x', 16)
        .attr('y', 20)
        .attr('font-size', 12)
        .attr('font-weight', '600')
        .attr('fill', '#ffffff')
        .attr('letter-spacing', '0.025em')
        .text('March cohort shows 40% drop');

      calloutGroup.append('text')
        .attr('x', 16)
        .attr('y', 36)
        .attr('font-size', 11)
        .attr('fill', 'rgba(255, 255, 255, 0.85)')
        .attr('letter-spacing', '0.01em')
        .text('Typical for seasonal businesses?');

      // Simple toggle functionality - click info icon to show/hide
      infoIcon.on('click', function() {
        const isVisible = calloutGroup.attr('opacity') > 0.5;
        calloutGroup.transition()
          .duration(300)
          .attr('opacity', isVisible ? 0 : 1)
          .style('pointer-events', isVisible ? 'none' : 'auto');
      });

      // Auto-show on load for demo
      setTimeout(() => {
        calloutGroup.transition()
          .duration(400)
          .ease(d3.easeCubicOut)
          .attr('opacity', 1);
      }, 500);
    };


    const showReplayHint = (group, width, height) => {
      // Wait a moment after completion, then show hint
      setTimeout(() => {
        const buttonGroup = group.append('g')
          .attr('class', 'replay-hint')
          .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // Main replay button
        const replayButton = buttonGroup.append('g')
          .attr('class', 'replay-button')
          .style('cursor', 'pointer')
          .on('click', () => {
            if (replayFunctionRef.current) {
              replayFunctionRef.current();
            }
          });

        // Large circular button background
        replayButton.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 25)
          .attr('fill', 'rgba(49, 67, 98, 0.9)')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .attr('opacity', 0)
          .transition()
          .duration(800)
          .attr('opacity', 1);

        // Large replay icon
        replayButton.append('text')
          .attr('x', 0)
          .attr('y', 8)
          .attr('text-anchor', 'middle')
          .attr('font-size', 24)
          .attr('font-weight', 'bold')
          .attr('fill', '#ffffff')
          .attr('opacity', 0)
          .text('↻')
          .transition()
          .duration(800)
          .attr('opacity', 1);

        // Small close button (top-right of main button)
        const closeButton = buttonGroup.append('g')
          .attr('class', 'close-button')
          .attr('transform', 'translate(20, -20)')
          .style('cursor', 'pointer')
          .on('click', (event) => {
            event.stopPropagation(); // Prevent replay button from firing
            buttonGroup.transition()
              .duration(300)
              .attr('opacity', 0)
              .remove();
          });

        // Small circle for close button
        closeButton.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 8)
          .attr('fill', 'rgba(52,18,14,0.9)')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .attr('opacity', 0)
          .transition()
          .delay(1000) // Appear after main button
          .duration(400)
          .attr('opacity', 1);

        // X symbol
        closeButton.append('text')
          .attr('x', 0)
          .attr('y', 3)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('font-weight', 'bold')
          .attr('fill', '#ffffff')
          .attr('opacity', 0)
          .text('×')
          .transition()
          .delay(1000)
          .duration(400)
          .attr('opacity', 1);

        // Hover effects for replay button
        replayButton
          .on('mouseover', function() {
            d3.select(this).select('circle')
              .transition()
              .duration(200)
              .attr('r', 28)
              .attr('fill', 'rgba(38, 72, 126, 0.95)');
          })
          .on('mouseout', function() {
            d3.select(this).select('circle')
              .transition()
              .duration(200)
              .attr('r', 25)
              .attr('fill', 'rgba(49, 67, 98, 0.9)');
          });

      }, 2000);
    };


    const fadeToLiveMode = () => {
      const fadeTimeout = setTimeout(() => {
        // Fade ghost chart to background
        d3.selectAll('.ghost-chart, .ghost-axis, .ghost-line, .ghost-label')
          .transition()
          .duration(800)
          .attr('opacity', 0.1);

        // Switch to live mode
        setAnimationMode('live');
      }, 1000);

      animationTimeouts.current.push(fadeTimeout);
    };

    const startOnboardingAnimation = () => {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      setIsAnimating(true);

      // Store replay function in ref so D3 can access it
      replayFunctionRef.current = () => {
          setIsAnimating(true);
          startOnboardingAnimation();
      };

      // Start the sequence
      animateBubbleGrid();
    };

  return (
    <div className={styles.container}>
      {/* Command Prompt Box (Fixed at Top) */}
      <div className={styles.commandBox}>
        <div className={styles.commandContent}>
          {/*<StatusBarDesign />*/}
          <ToggleTabsDesign activeTab={activeTab} setActiveTab={setActiveTab} />
          <CommandInputDesign
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            shouldStartTyping={shouldStartTyping}
            setShouldStartTyping={setShouldStartTyping}
            onSendMessage={addMessage}
            showToast={showToast}
            setIsLoadingStrava={setIsLoadingStrava}
            connections={connections}
          />
        </div>
      </div>

        {/*{isAnimating && (*/}
        {/*  <div style={{*/}
        {/*    position: 'absolute',*/}
        {/*    top: '20px',*/}
        {/*    right: '20px',*/}
        {/*    zIndex: 1000,*/}
        {/*    background: 'rgba(255, 255, 255, 0.95)',*/}
        {/*    padding: '8px 12px',*/}
        {/*    borderRadius: '8px',*/}
        {/*    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',*/}
        {/*    display: 'flex',*/}
        {/*    gap: '8px',*/}
        {/*    alignItems: 'center'*/}
        {/*  }}>*/}
        {/*    <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Speed:</span>*/}
        {/*    {[0.5, 1, 2, 5, 10].map(speed => (*/}
        {/*      <button*/}
        {/*        key={speed}*/}
        {/*        onClick={() => setPlaybackSpeed(speed)}*/}
        {/*        style={{*/}
        {/*          padding: '4px 12px',*/}
        {/*          background: playbackSpeed === speed ? '#3b82f6' : '#f3f4f6',*/}
        {/*          color: playbackSpeed === speed ? 'white' : '#374151',*/}
        {/*          border: 'none',*/}
        {/*          borderRadius: '4px',*/}
        {/*          fontSize: '12px',*/}
        {/*          fontWeight: '600',*/}
        {/*          cursor: 'pointer',*/}
        {/*          transition: 'all 0.2s'*/}
        {/*        }}*/}
        {/*      >*/}
        {/*        {speed}x*/}
        {/*      </button>*/}
        {/*    ))}*/}
        {/*  </div>*/}
        {/*)}*/}

      {/* Canvas Box (Scrollable Below) */}
        <div className={styles.canvasBox} style={{
            position: 'relative',
            overflowY: activeTab === 'ask' ? 'auto' : 'hidden',
            border: '3px solid blue',
            display: activeTab === 'ask' && messages.length === 0 ? 'none' : 'flex',
            flexDirection: 'column'
        }}>
          {toast && (
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
              />
          )}
        <div className={styles.canvasContent}>
          {/*<CanvasToolBarDesign/>*/}
          {isLoadingStrava && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <div style={{
                fontSize: '15px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Analyzing Strava data...
              </div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {messages.map(message => {
              // Skip user messages - they become titles in StravaResponseCard
              if (message.type === 'user') {
                  return null;
              }

              // Check if this is a Strava AI response
              if (message.type === 'ai' && message.stravaResponse) {
                return (
                  <StravaResponseCard
                    key={message.id}
                    question={message.question}
                    backendData={message.backendData}
                  />
                );
              }

              // Check if this is the filtered chart button message
              if (message.text === '[SHOW_FILTERED_CHART_BUTTON]') {
                  return (
                    <div key={message.id} style={{ margin: '0px 8px 16px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          // 1. Make SVG visible again
                          const svg = d3.select(svgRef.current);
                          svg.style('display', 'block');

                          // 2. Remove sidebar and restore main content position
                          const sidebar = document.getElementById('analytics-sidebar');
                          if (sidebar) {
                            sidebar.remove();
                          }
                          const container = document.querySelector('.container') || svgRef.current.closest('[class*="container"]');
                          if (container) {
                            container.style.marginLeft = '0px';
                          }

                          // 3. Clear existing chart
                          svg.selectAll("*").remove();

                          const canvasContainer = svgRef.current.parentElement;
                          const width = canvasContainer.clientWidth;
                          const height = canvasContainer.clientHeight;

                          console.log('Generating filtered chart:', width, height); // Debug

                          svg.attr('width', width).attr('height', height);

                          // Chart dimensions
                          const margin = { top: 60, right: 80, bottom: 80, left: 80 };
                          const chartWidth = width - margin.left - margin.right;
                          const chartHeight = height - margin.top - margin.bottom;

                          const chartGroup = svg.append('g')
                            .attr('class', 'filtered-chart')
                            .attr('transform', `translate(${margin.left}, ${margin.top})`);

                          // Draw axes
                          chartGroup.append('line')
                            .attr('x1', 0)
                            .attr('y1', chartHeight)
                            .attr('x2', chartWidth)
                            .attr('y2', chartHeight)
                            .attr('stroke', '#314362')
                            .attr('stroke-width', 2)
                            .attr('opacity', 0.4);

                          chartGroup.append('line')
                            .attr('x1', 0)
                            .attr('y1', chartHeight)
                            .attr('x2', 0)
                            .attr('y2', 0)
                            .attr('stroke', '#314362')
                            .attr('stroke-width', 2)
                            .attr('opacity', 0.4);

                          // Reliable cohorts data
                          const reliableData = [
                            { name: 'Jan 2024', color: '#10b981', quality: '89%', points: [
                              {x: 0, y: chartHeight * 0.3},
                              {x: chartWidth * 0.25, y: chartHeight * 0.4},
                              {x: chartWidth * 0.5, y: chartHeight * 0.5},
                              {x: chartWidth * 0.75, y: chartHeight * 0.6},
                              {x: chartWidth, y: chartHeight * 0.7}
                            ]},
                            { name: 'Feb 2024', color: '#10b981', quality: '87%', points: [
                              {x: 0, y: chartHeight * 0.2},
                              {x: chartWidth * 0.25, y: chartHeight * 0.3},
                              {x: chartWidth * 0.5, y: chartHeight * 0.4},
                              {x: chartWidth * 0.75, y: chartHeight * 0.45},
                              {x: chartWidth, y: chartHeight * 0.5}
                            ]}
                          ];

                          // Excluded cohort
                          const excludedData = {
                            name: 'Mar 2024 (Excluded)',
                            color: '#9ca3af',
                            quality: '51%',
                            points: [
                              {x: 0, y: chartHeight * 0.1},
                              {x: chartWidth * 0.25, y: chartHeight * 0.2},
                              {x: chartWidth * 0.5, y: chartHeight * 0.25},
                              {x: chartWidth * 0.75, y: chartHeight * 0.3},
                              {x: chartWidth, y: chartHeight * 0.35}
                            ]
                          };

                          const lineFunction = d3.line()
                            .x(d => d.x)
                            .y(d => d.y)
                            .curve(d3.curveCardinal);

                          // Draw reliable lines (solid green)
                          reliableData.forEach(cohort => {
                            chartGroup.append('path')
                              .datum(cohort.points)
                              .attr('fill', 'none')
                              .attr('stroke', cohort.color)
                              .attr('stroke-width', 3)
                              .attr('opacity', 0.9)
                              .attr('d', lineFunction);
                          });

                          // Draw excluded line (dotted gray)
                          chartGroup.append('path')
                            .datum(excludedData.points)
                            .attr('fill', 'none')
                            .attr('stroke', excludedData.color)
                            .attr('stroke-width', 2)
                            .attr('stroke-dasharray', '5,5')
                            .attr('opacity', 0.4)
                            .attr('d', lineFunction);

                          // Title
                          chartGroup.append('text')
                            .attr('x', chartWidth / 2)
                            .attr('y', -30)
                            .attr('text-anchor', 'middle')
                            .attr('font-size', 16)
                            .attr('font-weight', 'bold')
                            .attr('fill', '#10b981')
                            .text('Filtered Retention Chart (High-Confidence Data Only)');

                          // Legend
                          const legendData = [
                            ...reliableData.map(d => ({...d, status: 'Reliable'})),
                            {...excludedData, status: 'Excluded'}
                          ];

                          const legend = chartGroup.append('g')
                            .attr('transform', `translate(${chartWidth - 200}, 20)`);

                          legendData.forEach((item, i) => {
                            const legendItem = legend.append('g')
                              .attr('transform', `translate(0, ${i * 25})`);

                            legendItem.append('line')
                              .attr('x1', 0)
                              .attr('y1', 0)
                              .attr('x2', 20)
                              .attr('y2', 0)
                              .attr('stroke', item.color)
                              .attr('stroke-width', 2)
                              .attr('stroke-dasharray', item.status === 'Excluded' ? '5,5' : 'none');

                            legendItem.append('text')
                              .attr('x', 25)
                              .attr('y', 4)
                              .attr('font-size', 11)
                              .attr('fill', '#374151')
                              .text(`${item.name} - ${item.quality} quality`);
                          });

                          // Confidence badge
                          const badge = chartGroup.append('g')
                            .attr('transform', 'translate(20, 20)');

                          badge.append('rect')
                            .attr('width', 160)
                            .attr('height', 30)
                            .attr('rx', 6)
                            .attr('fill', '#d1fae5')
                            .attr('stroke', '#10b981')
                            .attr('stroke-width', 2);

                          badge.append('text')
                            .attr('x', 80)
                            .attr('y', 20)
                            .attr('text-anchor', 'middle')
                            .attr('font-size', 12)
                            .attr('font-weight', 'bold')
                            .attr('fill', '#065f46')
                            .text('✓ Board-Ready Analysis');
                        }}
                        style={{
                          padding: '12px 24px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                        }}
                      >
                        Show Filtered Chart (High-Confidence Data Only)
                      </button>
                    </div>
                  );
              }

              // Regular message rendering
              return (
                  <div
                    key={message.id}
                    className={message.type === 'user' ? styles.userMessage : styles.aiMessage}
                    style={{
                      position: 'relative',
                      background: message.type === 'user' ? '#f9fafb' : '#ffffff',
                      border: message.type === 'user' ? '1px solid #e5e7eb' : 'none',
                      borderLeft: message.type === 'ai' ? 'none' : '1px solid #e5e7eb',
                      borderRadius: message.type === 'user' ? '6px': 'none',
                      padding: '12px',
                      margin: message.type === 'ai' ? '0px 8px 16px 8px': '20px 8px 0px 8px',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  >
                    {message.type === 'ai' ? (
                      <MarkdownMessage>{message.text}</MarkdownMessage>
                    ) : (
                      <div style={{ whiteSpace: 'pre-line' }}>{message.text}</div>
                    )}
                  </div>
              );
          })}
          {showDataLineage && (
            <DataLineagePanel
              svgRef={svgRef}
              width={svgRef.current?.parentElement?.clientWidth || 800}
              height={svgRef.current?.parentElement?.clientHeight || 600}
              onClose={() => setShowDataLineage(false)}
            />
          )}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <svg
                  ref={svgRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'transparent',
                    cursor: 'default'
                  }}
                  // onClick={handleCanvasClick}
              />
            </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingDemo;