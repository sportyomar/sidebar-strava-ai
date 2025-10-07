// src/utils/metricGlossary.js
const metricGlossary = {
  // Core Metric Properties
  value: {
    label: "Primary Metric Value",
    description: "The main performance number, such as total revenue or net margin.",
    executiveContext: "This is the headline figure that shows current performance at a glance."
  },
  comparison: {
    label: "Comparative Performance",
    description: "Shows how this metric changed compared to a baseline (like last year or budget).",
    executiveContext: "Helps you quickly understand if performance is improving or declining."
  },
  trend: {
    label: "Trend Visualization",
    description: "Displays how the metric is performing over time with mini charts or sparklines.",
    executiveContext: "Reveals patterns and momentum without requiring detailed analysis."
  },
  annotations: {
    label: "Annotations",
    description: "Explanatory notes provided by analysts or consultants for executive clarity.",
    executiveContext: "Gives you the 'why' behind unusual numbers or significant changes."
  },

  // Performance Indicators
  delta: {
    label: "Absolute Change",
    description: "The numerical difference between current value and the comparison period.",
    executiveContext: "Shows the raw magnitude of change, like '+$2.3M' or '-15 units'."
  },
  percentChange: {
    label: "Percentage Change",
    description: "The relative difference as a percentage of the baseline value.",
    executiveContext: "Indicates scale of change regardless of the metric's absolute size."
  },
  status: {
    label: "Performance Status",
    description: "Visual indicator showing if metric is performing well, neutral, or poorly.",
    executiveContext: "Quick visual signal of whether attention is needed on this metric."
  },

  // Time Dimensions
  timeframe: {
    label: "Time Period",
    description: "The specific duration represented by the metric (monthly, quarterly, YTD).",
    executiveContext: "Ensures you know exactly what time period is being measured."
  },
  forecast: {
    label: "Projection",
    description: "Expected future performance based on current trajectory and modeling.",
    executiveContext: "Helps with forward planning by showing where metrics are heading."
  },
  seasonality: {
    label: "Seasonal Pattern",
    description: "Indication of regular cyclical patterns affecting the metric.",
    executiveContext: "Distinguishes between normal seasonal variations and actual performance changes."
  },

  // Analysis Components
  breakdown: {
    label: "Dimensional Analysis",
    description: "Segmentation of the metric by relevant business dimensions (product, region, etc.).",
    executiveContext: "Reveals which parts of the business are driving overall performance."
  },
  threshold: {
    label: "Performance Threshold",
    description: "Pre-defined levels that indicate when a metric requires attention.",
    executiveContext: "Clarifies when a metric has crossed into concerning or exceptional territory."
  },
  correlation: {
    label: "Related Metrics",
    description: "Indicators that typically move in relation to this primary metric.",
    executiveContext: "Shows connections between this metric and others for broader understanding."
  },

  // Data Quality
  freshness: {
    label: "Data Freshness",
    description: "When the metric was last updated with current data.",
    executiveContext: "Indicates how recent and relevant the information is for decision-making."
  },
  confidence: {
    label: "Confidence Score",
    description: "Rating of data reliability based on completeness and source quality.",
    executiveContext: "Signals how much weight to put on this metric when making decisions."
  },
  reconciliation: {
    label: "Financial Reconciliation",
    description: "Status of verification against official financial systems.",
    executiveContext: "Shows whether figures have been fully validated against financial records."
  },

  // Collaboration Elements
  insight: {
    label: "System Insight",
    description: "Automatically generated observation about the metric's behavior.",
    executiveContext: "Highlights important patterns or anomalies you might otherwise miss."
  },
  action: {
    label: "Recommended Action",
    description: "Suggested next steps based on metric performance.",
    executiveContext: "Provides guidance on how to respond to the metric's current status."
  },
  ownership: {
    label: "Metric Owner",
    description: "The person or team accountable for this performance indicator.",
    executiveContext: "Identifies who to contact with questions or concerns about this metric."
  }
};

export default metricGlossary;