import * as d3 from 'd3';
import { Text } from './Text.js';

export class Square {
  constructor(svg, data, options = {}) {
    this.svg = svg;
    this.data = data; // Expected: [{ x, y, width, height, text? }] or single object
    this.fill = options.fill || "#3b82f6";
    this.stroke = options.stroke || "#1e40af";
    this.strokeWidth = options.strokeWidth || 2;
    this.className = options.className || "square";
    this.instanceId = options.instanceId || ""; // For unique naming
    this.rx = options.rx || 0; // Border radius for rounded corners
    this.ry = options.ry || 0; // Border radius for rounded corners

    // Text options
    this.textColor = options.textColor || "#ffffff";
    this.fontSize = options.fontSize || 14;
    this.fontFamily = options.fontFamily || "Arial, sans-serif";
    this.fontWeight = options.fontWeight || "normal";
    this.includeText = options.includeText !== false; // Default true
    this.textPadding = options.textPadding || 10; // Padding around text
  }

  render() {
    // Ensure data is an array for consistent processing
    const dataArray = Array.isArray(this.data) ? this.data : [this.data];

    // Create unique class name if instanceId provided
    const uniqueClassName = this.instanceId
      ? `${this.className}-${this.instanceId}`
      : this.className;

    // Render square shapes
    const squares = this.svg.selectAll(`.${uniqueClassName}`)
      .data(dataArray)
      .enter()
      .append("g")
      .attr("class", uniqueClassName);

    // Add rectangle paths
    squares.append("rect")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("rx", d => d.rx || this.rx)
      .attr("ry", d => d.ry || this.ry)
      .attr("fill", d => d.fill || this.fill)
      .attr("stroke", d => d.stroke || this.stroke)
      .attr("stroke-width", d => d.strokeWidth || this.strokeWidth);

    // Add text if enabled and text exists
    if (this.includeText) {
      // Create Text instance for rendering
      const textRenderer = new Text(this.svg, {
        fill: this.textColor,
        textAnchor: "middle",
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        fontWeight: this.fontWeight
      });

      // Render text for each square that has text
      dataArray.forEach(d => {
        if (d.text) {
          const centerX = d.x + d.width / 2 + (d.textOffsetX || 0);
          const centerY = d.y + d.height / 2 + (d.textOffsetY || 0);

          // Create individual text renderer for this square if it has custom properties
          const currentTextRenderer = this._needsCustomTextRenderer(d)
            ? new Text(this.svg, {
                fill: d.textColor || this.textColor,
                textAnchor: "middle",
                fontSize: d.fontSize || this.fontSize,
                fontFamily: d.fontFamily || this.fontFamily,
                fontWeight: d.fontWeight || this.fontWeight
              })
            : textRenderer;

          currentTextRenderer.render(centerX, centerY, d.text);
        }
      });
    }

    return squares;
  }

  // Private method to check if custom text renderer is needed
  _needsCustomTextRenderer(d) {
    return (d.fontWeight && d.fontWeight !== this.fontWeight) ||
           (d.textColor && d.textColor !== this.textColor) ||
           (d.fontSize && d.fontSize !== this.fontSize) ||
           (d.fontFamily && d.fontFamily !== this.fontFamily);
  }

  // Utility method for creating grid data
  static createGridData(startX, startY, width, height, rows, cols, options = {}) {
    const gapX = options.gapX || 0;
    const gapY = options.gapY || 0;
    const texts = options.texts || [];

    const squares = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        squares.push({
          x: startX + col * (width + gapX),
          y: startY + row * (height + gapY),
          width: width,
          height: height,
          text: texts[index] || null
        });
      }
    }
    return squares;
  }

  // Utility method for creating horizontal sequence
  static createHorizontalSequence(startX, startY, width, height, count, options = {}) {
    const gap = options.gap || 0;
    const texts = options.texts || [];

    return Array.from({ length: count }, (_, index) => ({
      x: startX + index * (width + gap),
      y: startY,
      width: width,
      height: height,
      text: texts[index] || null
    }));
  }

  // Utility method for creating vertical sequence
  static createVerticalSequence(startX, startY, width, height, count, options = {}) {
    const gap = options.gap || 0;
    const texts = options.texts || [];

    return Array.from({ length: count }, (_, index) => ({
      x: startX,
      y: startY + index * (height + gap),
      width: width,
      height: height,
      text: texts[index] || null
    }));
  }

  // Utility method for creating squares with varying sizes
  static createVariableSizeData(configs = []) {
    // Expected: [{ x, y, width, height, text?, fill?, stroke?, etc. }]
    return configs.map(config => ({
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      text: config.text || null,
      fill: config.fill || null,
      stroke: config.stroke || null,
      strokeWidth: config.strokeWidth || null,
      rx: config.rx || null,
      ry: config.ry || null,
      textColor: config.textColor || null,
      fontSize: config.fontSize || null,
      fontWeight: config.fontWeight || null,
      textOffsetX: config.textOffsetX || 0,
      textOffsetY: config.textOffsetY || 0
    }));
  }
}