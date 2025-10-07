// infrastructureConfig.js
// Data constants for Infrastructure Selector

export const functions = [
  { id: 'finance', name: 'Finance', description: 'Financial reporting, budgeting, and analysis' },
  { id: 'sales-marketing', name: 'Sales & Marketing', description: 'Revenue generation and customer acquisition' },
  { id: 'product-engineering', name: 'Product & Engineering', description: 'Product development and technical delivery' },
  { id: 'information-technology', name: 'Information Technology', description: 'Systems, security, and technical infrastructure' },
  { id: 'operations', name: 'Operations', description: 'Process optimization and operational efficiency' },
  { id: 'human-resources', name: 'Human Resources', description: 'Talent management and organizational development' },
  { id: 'legal-compliance', name: 'Legal & Compliance', description: 'Regulatory, governance, and risk management' }
];

export const crossFunctions = [
  { id: 'executive-board', name: 'Executive/Board', description: 'Company-wide metrics and strategic oversight' },
  { id: 'data-analytics', name: 'Data & Analytics', description: 'Enterprise data platform and insights' },
  { id: 'strategy-planning', name: 'Strategy & Planning', description: 'Strategic initiatives spanning departments' },
  { id: 'program-management', name: 'Program Management', description: 'Cross-functional projects and initiatives' }
];

export const industries = [
  { id: 'technology', name: 'Technology', description: 'Software, hardware, and tech services' },
  { id: 'financial-services', name: 'Financial Services', description: 'Banking, insurance, and financial institutions' },
  { id: 'healthcare', name: 'Healthcare', description: 'Medical devices, pharmaceuticals, and healthcare services' },
  { id: 'manufacturing', name: 'Manufacturing', description: 'Industrial production and manufacturing' },
  { id: 'retail-ecommerce', name: 'Retail & E-commerce', description: 'Consumer goods and online commerce' },
  { id: 'energy', name: 'Energy', description: 'Oil, gas, renewable energy, and utilities' },
  { id: 'professional-services', name: 'Professional Services', description: 'Consulting, legal, and business services' },
  { id: 'other', name: 'Other', description: 'General business infrastructure' }
];

export const decisionLayers = [
  { id: 'strategic', name: 'Strategic', description: 'Long-term direction and executive decisions' },
  { id: 'operational', name: 'Operational', description: 'Day-to-day efficiency and process optimization' },
  { id: 'customer-facing', name: 'Customer-Facing', description: 'External impact and market-facing decisions' },
  { id: 'internal-systems', name: 'Internal Systems', description: 'Infrastructure and capability development' }
];

export const scopes = [
  { id: 'functional', name: 'Functional', description: 'Single department or business function' },
  { id: 'cross-functional', name: 'Cross-Functional', description: 'Spans multiple departments' }
];

// System Requirements Options
export const systemRequirements = {
  scaleResources: {
    teamSize: [
      { value: 'solo', label: 'Solo' },
      { value: 'small', label: 'Small Team' },
      { value: 'department', label: 'Department' },
      { value: 'division', label: 'Division' },
      { value: 'enterprise', label: 'Enterprise' }
    ],
    budgetTier: [
      { value: 'startup', label: 'Startup' },
      { value: 'growth', label: 'Growth' },
      { value: 'enterprise', label: 'Enterprise' },
      { value: 'strategic', label: 'Strategic Investment' }
    ],
    timeline: [
      { value: 'immediate', label: 'Immediate' },
      { value: 'quarter', label: 'Quarter' },
      { value: 'half-year', label: 'Half-Year' },
      { value: 'annual', label: 'Annual' },
      { value: 'multi-year', label: 'Multi-Year' }
    ],
    fundingSource: [
      { value: 'it-budget', label: 'IT Budget' },
      { value: 'business-unit', label: 'Business Unit' },
      { value: 'strategic', label: 'Strategic Initiative' },
      { value: 'external', label: 'External/Investor' }
    ]
  },

  governanceCompliance: {
    dataGovernance: [
      { value: 'none', label: 'None' },
      { value: 'basic', label: 'Basic Policies' },
      { value: 'formal', label: 'Formal Framework' },
      { value: 'enterprise', label: 'Enterprise Governance' }
    ],
    itGovernance: [
      { value: 'centralized', label: 'Centralized' },
      { value: 'managed', label: 'Managed' },
      { value: 'federated', label: 'Federated' },
      { value: 'shadow-it', label: 'Shadow IT Prevalent' }
    ]
  },

  marketOperations: {
    geographicScope: [
      { value: 'local', label: 'Local' },
      { value: 'national', label: 'National' },
      { value: 'regional', label: 'Regional' },
      { value: 'global', label: 'Global' }
    ],
    businessModel: [
      { value: 'b2b', label: 'B2B' },
      { value: 'b2c', label: 'B2C' },
      { value: 'marketplace', label: 'Marketplace' },
      { value: 'platform', label: 'Platform' },
      { value: 'services', label: 'Services' }
    ],
    performanceTier: [
      { value: 'standard', label: 'Standard' },
      { value: 'high-performance', label: 'High Performance' },
      { value: 'mission-critical', label: 'Mission Critical' }
    ]
  },

  technicalCapability: {
    internalExpertise: [
      { value: 'basic', label: 'Basic' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'expert', label: 'Expert' }
    ],
    deliveryModel: [
      { value: 'internal', label: 'Internal' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'outsourced', label: 'Outsourced' },
      { value: 'managed-service', label: 'Managed Service' }
    ],
    dataMaturity: [
      { value: 'spreadsheets', label: 'Spreadsheets' },
      { value: 'basic-systems', label: 'Basic Systems' },
      { value: 'integrated', label: 'Integrated' },
      { value: 'advanced-analytics', label: 'Advanced Analytics' }
    ]
  }
};

// Context filters
export const contextFilters = {
  companyStage: [
    { id: 'startup', name: 'Startup', description: 'Early-stage, high growth' },
    { id: 'growth', name: 'Growth', description: 'Scaling operations' },
    { id: 'enterprise', name: 'Enterprise', description: 'Established, complex' },
    { id: 'public', name: 'Public', description: 'Regulatory reporting' }
  ],

  regulatoryComplexity: [
    { id: 'standard', name: 'Standard', description: 'Basic compliance' },
    { id: 'highly-regulated', name: 'Highly Regulated', description: 'SOX, Basel III, etc.' },
    { id: 'multi-jurisdiction', name: 'Multi-Jurisdiction', description: 'International compliance' }
  ],

  integrationApproach: [
    { id: 'greenfield', name: 'Greenfield', description: 'Building from scratch' },
    { id: 'legacy-integration', name: 'Legacy Integration', description: 'Working with existing systems' },
    { id: 'migration', name: 'Migration', description: 'Replacing current infrastructure' }
  ]
};

// Helper functions
export const findItemById = (collection, id) => {
  return collection.find(item => item.id === id);
};

export const findSystemRequirementLabel = (category, field, value) => {
  const option = systemRequirements[category]?.[field]?.find(opt => opt.value === value);
  return option?.label || value;
};

// Selection summary builder
export const buildSelectionSummary = (selection) => {
  let description = '';

  // Core selection
  if (selection.scope === 'functional' && selection.function) {
    const func = findItemById(functions, selection.function);
    description += func?.name;
  } else if (selection.scope === 'cross-functional' && selection.function) {
    const func = findItemById(crossFunctions, selection.function);
    description += func?.name;
  }

  if (selection.decision) {
    const decision = findItemById(decisionLayers, selection.decision);
    description += ` infrastructure for ${decision?.name.toLowerCase()} decisions`;
  }

  // Context
  if (selection.industry) {
    const industry = findItemById(industries, selection.industry);
    description += ` in ${industry?.name.toLowerCase()}`;
  }

  if (selection.companyStage) {
    description += `, ${selection.companyStage}-stage`;
  }

  if (selection.regulatoryComplexity) {
    description += `, ${selection.regulatoryComplexity.replace('-', ' ')} compliance`;
  }

  if (selection.integrationApproach) {
    description += `, ${selection.integrationApproach.replace('-', ' ')} approach`;
  }

  if (selection.aiEnabled) {
    description += ' with AI enhancement';
  }

  return description;
};