// /src/insightTemplates/performanceOverview.js
import React from 'react';

function generatePerformanceOverview(metrics) {
  const deltaPct = ((metrics.value - metrics.comparison) / metrics.comparison) * 100;
  const burn = metrics.burnMultiple || 1.4;
  const runway = metrics.cashRunway || 13;

  return `Revenue is ${deltaPct >= 0 ? "ahead of plan" : "behind plan"} by ${Math.abs(deltaPct.toFixed(1))}%. ` +
         `Burn multiple is ${burn.toFixed(1)}x. Cash runway exceeds ${runway} months.`;
}

export default generatePerformanceOverview()