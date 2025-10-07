// benchmark_overlay.js
export const benchmark_overlay = {
  id: 'benchmark_overlay',
  elements: [
    {
      id: 'line-benchmark',
      type: 'line',
      x1: 100, y1: 200, x2: 700, y2: 200,
      stroke: '#ef4444',
      strokeWidth: 2,
      strokeDasharray: '5,5'
    },
    {
      id: 'label-benchmark',
      type: 'text',
      x: 710, y: 205,
      text: 'Industry Avg',
      fontSize: 12,
      fill: '#ef4444',
      textAnchor: 'start'
    }
  ]
};

export default benchmark_overlay;