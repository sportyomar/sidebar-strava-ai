import React, {useState, useEffect, useRef} from 'react';
import styles from './BasicDataCanvasDesign.module.css';
import StatusBarDesign from './StatusBarDesign';
import CommandInputDesign from "./CommandInputDesign";
import CanvasToolBarDesign from "./CanvasToolBarDesign";
import ToggleTabsDesign from "./ToggleTabsDesign";
import * as d3 from 'd3';

const BasicDataCanvasDesign = () => {
    const [activeTab, setActiveTab] = useState('build');
    const [animationMode, setAnimationMode] = useState('demo'); // 'demo' or 'live'
    const [showOverlay, setShowOverlay] = useState(false);
    const svgRef = useRef();
    const animationTimeouts = useRef([]);


    useEffect(() => {
      if (animationMode === 'demo' && svgRef.current) {
        startOnboardingAnimation();
      }
      return () => clearAllAnimations();
    }, [animationMode]);

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
      const delayPerDot = 0.25;
      const initialDuration = 300;
      const positionDuration = 800;
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
      }, maxDelay + 500); // Small pause after grid completes

      animationTimeouts.current.push(chartTimeout);
    };

    const animateGhostChart = () => {
      const svg = d3.select(svgRef.current);
      const container = svgRef.current.parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Chart dimensions
      const margin = { top: 60, right: 80, bottom: 60, left: 80 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      // Create chart group
      const chartGroup = svg.append('g')
        .attr('class', 'ghost-chart')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // Animate axes first
      animateAxes(chartGroup, chartWidth, chartHeight);

      // Then animate lines after axes complete
      const axesTimeout = setTimeout(() => {
        animateLines(chartGroup, chartWidth, chartHeight);
      }, 800);

      animationTimeouts.current.push(axesTimeout);
    };

    const animateAxes = (group, width, height) => {
      let axesCompleted = 0;

      const checkBothAxesComplete = () => {
        axesCompleted++;
        if (axesCompleted === 2) {
          // Both axes done, add grid lines
          setTimeout(() => addGridLines(group, width, height), 300);
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
          .delay(i * 100)
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
          .duration(200)
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
          .delay(i * 150)
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
          .duration(400)
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
          // All lines drawn - add labels, then legend
          setTimeout(() => {
            addGhostLabels(group, width, height);
            // Add legend after a brief pause
            setTimeout(() => {
              addLegend(group, width, height);
            }, 600);
          }, 300);
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
        .duration(285)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0)
        .on('end', () => {
          // Draw next line after this one completes
          drawCohortLineSequential(group, cohortData, index + 1, width, height);
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

      // Y-axis label
      group.append('text')
        .attr('class', 'ghost-label')
        .attr('x', -40)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('fill', '#314362')
        .attr('opacity', 0)
        .text('Retention %')
        .transition()
        .duration(400)
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
        .duration(1200)
        .ease(d3.easeQuadOut)
        .attr('opacity', 0.05);

      // Fade out the chart grid lines
      d3.selectAll('.ghost-grid-line')
        .transition()
        .duration(1000)
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
          .delay(i * 200)
          .duration(400)
          .attr('opacity', 0.7);
      });
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
          <CommandInputDesign activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>

      {/* Canvas Box (Scrollable Below) */}
      <div className={styles.canvasBox}>
        <div className={styles.canvasContent}>
          {/*<CanvasToolBarDesign/>*/}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <svg
                ref={svgRef}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'white',
                  cursor: animationMode === 'demo' ? 'pointer' : 'default'
                }}
                onClick={animationMode === 'demo' ? () => setShowOverlay(true) : undefined}
              />
            </div>
        </div>
      </div>
    </div>
  );
};

export default BasicDataCanvasDesign;