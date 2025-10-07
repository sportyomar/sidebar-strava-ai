// transactionTypeMetadata.js
/**
 * Metadata definition for financial transaction types.
 *
 * This metadata serves multiple purposes:
 * 1. Defines the expected structure and constraints for each transaction type
 * 2. Provides contextual information about fields for users
 * 3. Enables automated mock data generation
 * 4. Supports validation of input data
 * 5. Guides insight function generation
 */
const transactionTypeMetadata = {
  /**
   * Performance Overview transaction type
   * Used to track company performance against benchmarks with focus on burn rate and runway
   */
  performanceOverview: {
    description: "Provides an overview of company performance against benchmarks with financial sustainability metrics",
    purpose: "To quickly assess how a company is performing relative to targets and its financial runway",
    fields: {
      value: {
        type: "number",
        description: "Current revenue number",
        unit: "USD",
        min: 0,
        max: 100000000000, // $100B
        typical: [5000000, 50000000], // $5M to $50M range
        required: true,
        display: (val) => `$${(val / 1000000).toFixed(1)}M`
      },
      comparison: {
        type: "number",
        description: "Comparison benchmark (last quarter, year-ago, or plan)",
        unit: "USD",
        min: 0,
        max: 100000000000, // $100B
        typical: [4000000, 45000000], // Typically slightly less than current value
        required: true,
        display: (val) => `$${(val / 1000000).toFixed(1)}M`
      },
      burnMultiple: {
        type: "number",
        description: "How quickly cash is being burned relative to growth (lower is better)",
        unit: "multiple",
        min: 0.1,
        max: 10,
        typical: [0.8, 2.5],
        required: true,
        display: (val) => `${val.toFixed(1)}x`
      },
      cashRunway: {
        type: "number",
        description: "Number of months before company runs out of cash at current burn rate",
        unit: "months",
        min: 1,
        max: 60,
        typical: [6, 24],
        required: true,
        display: (val) => `${val} months`
      }
    },
    relationships: [
      {
        name: "Delta Calculation",
        description: "The percentage difference between current value and comparison",
        fields: ["value", "comparison"],
        formula: (metrics) => ((metrics.value - metrics.comparison) / metrics.comparison) * 100,
        result: {
          name: "delta",
          display: (val) => `${val.toFixed(1)}%`
        }
      }
    ],
    insightLogic: "If current value > comparison, describe as 'ahead of plan', otherwise 'behind plan'. Low burn multiple (< 1.0) is described positively. Cash runway > 12 months is presented as favorable.",
    examples: [
      {
        value: 21000000,
        comparison: 19500000,
        burnMultiple: 1.4,
        cashRunway: 13,
        description: "Company exceeding revenue targets with moderate burn and good runway"
      },
      {
        value: 8500000,
        comparison: 10000000,
        burnMultiple: 2.2,
        cashRunway: 7,
        description: "Company missing revenue targets with concerning burn rate and short runway"
      }
    ]
  },

  /**
   * Accretion Dilution transaction type
   * Used to analyze impact of an acquisition on earnings per share
   */
  accretionDilution: {
    description: "Analyzes whether an acquisition will increase (accretive) or decrease (dilutive) earnings per share",
    purpose: "To evaluate the immediate financial impact of an acquisition on shareholder value",
    fields: {
      currentEPS: {
        type: "number",
        description: "Current earnings per share before the transaction",
        unit: "USD",
        min: 0,
        max: 50,
        typical: [0.5, 5],
        required: true,
        display: (val) => `$${val.toFixed(2)}`
      },
      proFormaEPS: {
        type: "number",
        description: "Projected earnings per share after the transaction",
        unit: "USD",
        min: 0,
        max: 50,
        typical: [0.5, 5.5],
        required: true,
        display: (val) => `$${val.toFixed(2)}`
      },
      sharesOutstanding: {
        type: "number",
        description: "Total number of shares currently outstanding",
        unit: "shares",
        min: 1000000,
        max: 10000000000,
        typical: [10000000, 500000000],
        required: true,
        display: (val) => `${(val / 1000000).toFixed(1)}M shares`
      },
      transactionType: {
        type: "string",
        description: "Method of financing the acquisition",
        enum: ["cash", "stock", "mixed"],
        default: "cash",
        required: true
      },
      acquisitionCost: {
        type: "number",
        description: "Total cost to acquire the target company",
        unit: "USD",
        min: 1000000,
        max: 100000000000,
        typical: [100000000, 5000000000],
        required: true,
        display: (val) => {
          if (val >= 1000000000) {
            return `$${(val / 1000000000).toFixed(1)}B`;
          } else {
            return `$${(val / 1000000).toFixed(0)}M`;
          }
        }
      }
    },
    relationships: [
      {
        name: "EPS Change",
        description: "Percentage change in EPS resulting from the transaction",
        fields: ["currentEPS", "proFormaEPS"],
        formula: (metrics) => ((metrics.proFormaEPS - metrics.currentEPS) / metrics.currentEPS) * 100,
        result: {
          name: "epsChange",
          display: (val) => `${val.toFixed(1)}%`
        }
      },
      {
        name: "Transaction Nature",
        description: "Whether the transaction is accretive or dilutive",
        fields: ["currentEPS", "proFormaEPS"],
        formula: (metrics) => metrics.proFormaEPS > metrics.currentEPS ? "accretive" : "dilutive",
        result: {
          name: "nature"
        }
      }
    ],
    insightLogic: "Describe the transaction as 'accretive' if proFormaEPS > currentEPS, otherwise 'dilutive'. Include the percentage change and the transaction type. Positive change in EPS is generally viewed favorably.",
    examples: [
      {
        currentEPS: 2.10,
        proFormaEPS: 2.30,
        sharesOutstanding: 50000000,
        transactionType: "stock",
        acquisitionCost: 1000000000,
        description: "Accretive stock-based acquisition with modest EPS improvement"
      },
      {
        currentEPS: 3.45,
        proFormaEPS: 3.15,
        sharesOutstanding: 75000000,
        transactionType: "cash",
        acquisitionCost: 2500000000,
        description: "Dilutive cash acquisition with significant purchase price"
      }
    ]
  },

  /**
   * Secondary Buyout transaction type
   * Used to analyze a private equity firm selling a portfolio company to another PE firm
   */
  secondaryBuyout: {
    description: "Models a private equity firm selling a portfolio company to another PE firm",
    purpose: "To evaluate the success of a PE investment and the terms of its secondary sale",
    fields: {
      sellerName: {
        type: "string",
        description: "Name of the selling private equity firm",
        examples: ["Blackstone", "KKR", "Carlyle Group", "Summit Partners", "Warburg Pincus", "Advent International"],
        required: true
      },
      buyerName: {
        type: "string",
        description: "Name of the purchasing private equity firm",
        examples: ["Apollo Global", "Bain Capital", "TPG Capital", "CVC Capital", "Silver Lake", "Thoma Bravo"],
        required: true
      },
      targetCompany: {
        type: "string",
        description: "Name of the company being bought/sold",
        examples: ["HealthSync Solutions", "TechCorp Inc", "Industrial Services Group", "Pinnacle Analytics", "CloudBase Systems"],
        required: true
      },
      acquisitionPrice: {
        type: "number",
        description: "Price paid by new buyer in current transaction",
        unit: "USD",
        min: 10000000, // $10M
        max: 10000000000, // $10B
        typical: [250000000, 2000000000], // $250M to $2B
        required: true,
        display: (val) => {
          if (val >= 1000000000) {
            return `$${(val / 1000000000).toFixed(1)}B`;
          } else {
            return `$${(val / 1000000).toFixed(0)}M`;
          }
        }
      },
      originalInvestment: {
        type: "number",
        description: "What seller initially paid for the company",
        unit: "USD",
        min: 5000000, // $5M
        max: 5000000000, // $5B
        typical: [100000000, 1000000000], // $100M to $1B
        constraints: ["Typically less than acquisitionPrice for successful exits"],
        required: true,
        display: (val) => {
          if (val >= 1000000000) {
            return `$${(val / 1000000000).toFixed(1)}B`;
          } else {
            return `$${(val / 1000000).toFixed(0)}M`;
          }
        }
      },
      holdingPeriodYears: {
        type: "number",
        description: "How long the seller owned the company",
        unit: "years",
        min: 2,
        max: 10,
        typical: [3, 7],
        required: true,
        display: (val) => `${val.toFixed(1)} years`
      },
      estimatedIRR: {
        type: "number",
        description: "Internal Rate of Return for the investment",
        unit: "percentage",
        min: -20,
        max: 100,
        typical: [15, 35],
        required: true,
        display: (val) => `${val.toFixed(1)}%`
      },
      dealType: {
        type: "string",
        description: "Classification of the transaction type",
        enum: ["PE-to-PE Secondary Sale", "PE-to-Strategic Secondary Sale", "Partial Secondary Sale"],
        default: "PE-to-PE Secondary Sale",
        required: true
      }
    },
    relationships: [
      {
        name: "Multiple on Invested Capital",
        description: "The cash-on-cash return multiple for the investment",
        fields: ["acquisitionPrice", "originalInvestment"],
        formula: (metrics) => metrics.acquisitionPrice / metrics.originalInvestment,
        result: {
          name: "moic",
          display: (val) => `${val.toFixed(1)}x`
        }
      },
      {
        name: "Annual Growth Rate",
        description: "Approximate annual growth rate in valuation",
        fields: ["acquisitionPrice", "originalInvestment", "holdingPeriodYears"],
        formula: (metrics) => {
          const growthRate = Math.pow(metrics.acquisitionPrice / metrics.originalInvestment, 1/metrics.holdingPeriodYears) - 1;
          return growthRate * 100;
        },
        result: {
          name: "cagr",
          display: (val) => `${val.toFixed(1)}%`
        }
      },
      {
        name: "IRR Validation",
        description: "Validates whether the IRR is consistent with other metrics",
        fields: ["acquisitionPrice", "originalInvestment", "holdingPeriodYears", "estimatedIRR"],
        formula: (metrics) => {
          // Simplistic IRR approximation for validation
          const approximate = (Math.pow(metrics.acquisitionPrice / metrics.originalInvestment, 1/metrics.holdingPeriodYears) - 1) * 100;
          return Math.abs(approximate - metrics.estimatedIRR) < 15; // Allow some flexibility
        },
        result: {
          name: "irrConsistent"
        }
      }
    ],
    insightLogic: "Describe the exit, mentioning seller, buyer, and target by name. Include the holding period, IRR, and characterize the success of the investment based on IRR (< 10% is poor, 10-20% is moderate, > 20% is strong).",
    examples: [
      {
        sellerName: "Summit Partners",
        buyerName: "TPG Capital",
        targetCompany: "HealthSync Solutions",
        acquisitionPrice: 850000000,
        originalInvestment: 320000000,
        holdingPeriodYears: 4.5,
        estimatedIRR: 27.3,
        dealType: "PE-to-PE Secondary Sale",
        description: "Successful exit with strong returns after moderate holding period"
      },
      {
        sellerName: "Warburg Pincus",
        buyerName: "Bain Capital",
        targetCompany: "Pinnacle Analytics",
        acquisitionPrice: 1200000000,
        originalInvestment: 800000000,
        holdingPeriodYears: 3.2,
        estimatedIRR: 14.5,
        dealType: "PE-to-PE Secondary Sale",
        description: "Modest return after shorter holding period"
      }
    ]
  }
};

export default transactionTypeMetadata;