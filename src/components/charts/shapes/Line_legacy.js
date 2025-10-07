import * as d3 from 'd3';

export class Line {
  constructor(svg, data, options = {}) {
    this.svg = svg;
    this.data = data;
    this.stroke = options.stroke || "#3b82f6";
    this.strokeWidth = options.strokeWidth || 3;
    this.fill = options.fill || "none";
  }

  render() {
    const line = d3.line()
      .x(d => d.x)
      .y(d => d.y);

    return this.svg.append("path")
      .datum(this.data)
      .attr("fill", this.fill)
      .attr("stroke", this.stroke)
      .attr("stroke-width", this.strokeWidth)
      .attr("d", line);
  }
}