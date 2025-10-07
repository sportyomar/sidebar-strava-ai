// src/constants/workflowDefinitions.js
const workflowDefinitions = {
  // DEAL EXECUTION WORKFLOWS
  commercialDiligence: {
    id: 'commercial-dd',
    name: 'Commercial Due Diligence',
    description: 'Comprehensive market and commercial assessment for investment decisions',
    category: 'Deal Execution',
    module: 'memoEditor',
    substages: [
      'Kickoff & Planning',
      'Initial Assessment',
      'Deep Dives',
      'Market Validation & Stakeholder Checks',
      'Synthesis & Value Creation Planning'
    ],
    progressStages: [
      'Not Started',
      'Team Assigned',
      'Data Collection',
      'Analysis Phase',
      'Draft Review',
      'Final Approval',
      'Delivered'
    ],
    inputs: [
      { type: 'pptx', label: 'Initial IC Deck', required: true, template: 'ic-deck-template.pptx' },
      { type: 'xlsx', label: 'Financial Model', required: true, template: 'financial-model-template.xlsx' },
      { type: 'pdf', label: 'CIM (Confidential Information Memorandum)', required: true },
      { type: 'xlsx', label: 'Management Presentation', required: false },
      { type: 'docx', label: 'Previous DD Reports', required: false }
    ],
    outputs: [
      { type: 'pdf', label: 'Commercial DD Memo', deliverable: true, owner: 'Principal', template: 'dd-memo-template.pdf' },
      { type: 'pptx', label: 'Market Sizing Analysis', deliverable: true, owner: 'Senior Associate', template: 'market-analysis-template.pptx' },
      { type: 'xlsx', label: 'Competitive Landscape Matrix', deliverable: true, owner: 'Associate', template: 'competitive-matrix-template.xlsx' },
      { type: 'pdf', label: 'Customer Interview Summary', deliverable: true, owner: 'Senior Associate' }
    ],
    systems: ['PowerPoint', 'Excel', 'VDR', 'Expert Networks'],
    integrations: {
      excelParser: 'parseFinancialModel',
      vdr: ['DocSend', 'Intralinks', 'ShareVault'],
      syncTo: ['CRM', 'Deal Database', 'IC Portal'],
      automations: ['scheduleInterviews', 'extractCompetitors', 'generateMarketReport']
    },
    roles: {
      lead: 'Principal',
      contributors: ['Senior Associate', 'Associate'],
      approver: 'Partner',
      stakeholders: ['Investment Committee', 'Portfolio Company CEO']
    },
    duration: '3-4 weeks',
    dependencies: ['Deal Team Formation', 'VDR Access'],
    automations: ['Customer interview scheduling', 'Expert call coordination', 'Competitive intelligence gathering'],
    tags: ['M&A', 'Private Equity', 'IC Approval', 'Market Analysis', 'Customer Research'],
    complexity: 'High',
    criticality: 'Investment Decision'
  },

  financialDiligence: {
    id: 'financial-dd',
    name: 'Financial Due Diligence',
    description: 'Deep financial analysis and validation for investment decisions',
    category: 'Deal Execution',
    module: 'memoEditor',
    substages: [
      'Kickoff & Planning',
      'Initial Assessment',
      'Deep Dives',
      'Synthesis & Value Creation Planning',
      'Final Review & Approval'
    ],
    progressStages: [
      'Not Started',
      'Data Requested',
      'Financial Analysis',
      'Quality Review',
      'Partner Review',
      'Approved'
    ],
    inputs: [
      { type: 'xlsx', label: 'Financial Statements (3-5 years)', required: true, template: 'financial-statements-template.xlsx' },
      { type: 'xlsx', label: 'Management Budgets & Forecasts', required: true, template: 'budget-template.xlsx' },
      { type: 'pdf', label: 'Audit Reports', required: true },
      { type: 'xlsx', label: 'Monthly Financial Packages', required: true, template: 'monthly-package-template.xlsx' },
      { type: 'xlsx', label: 'Working Capital Analysis', required: false }
    ],
    outputs: [
      { type: 'pdf', label: 'Financial DD Report', deliverable: true, owner: 'Principal', template: 'financial-dd-template.pdf' },
      { type: 'xlsx', label: 'Normalized Financial Model', deliverable: true, owner: 'Senior Associate', template: 'normalized-model-template.xlsx' },
      { type: 'xlsx', label: 'Quality of Earnings Analysis', deliverable: true, owner: 'Financial Analyst', template: 'qoe-template.xlsx' },
      { type: 'pdf', label: 'Working Capital Assessment', deliverable: true, owner: 'Senior Associate' }
    ],
    systems: ['Excel', 'PowerBI', 'Audit Software', 'VDR'],
    integrations: {
      excelParser: 'parseFinancialStatements',
      vdr: ['DocSend', 'Intralinks'],
      syncTo: ['Deal Database', 'Portfolio System'],
      automations: ['normalizeFinancials', 'calculateMetrics', 'flagAnomalies']
    },
    roles: {
      lead: 'Principal',
      contributors: ['Senior Associate', 'Financial Analyst'],
      approver: 'Partner',
      stakeholders: ['CFO', 'Investment Committee']
    },
    duration: '2-3 weeks',
    dependencies: ['Audited financials access', 'Management availability'],
    tags: ['M&A', 'Private Equity', 'Financial Analysis', 'IC Approval', 'QOE'],
    complexity: 'High',
    criticality: 'Investment Decision'
  },

  dealIntakeProcess: {
    id: 'deal-intake',
    name: 'Deal Intake & Initial Screening',
    description: 'Systematic evaluation and intake of new investment opportunities',
    category: 'Deal Sourcing',
    module: 'dealIntake',
    substages: ['Deal Name', 'Source', 'Sector', 'Geography', 'Size Range', 'Seller Type'],
    inputs: [
      { type: 'pdf', label: 'Executive Summary/Teaser', required: true },
      { type: 'xlsx', label: 'Basic Financials', required: false },
      { type: 'docx', label: 'Investment Banking Deck', required: false }
    ],
    outputs: [
      { type: 'pdf', label: 'Deal Intake Summary', deliverable: true },
      { type: 'xlsx', label: 'Initial Screening Matrix', deliverable: true },
      { type: 'docx', label: 'Go/No-Go Recommendation', deliverable: true }
    ],
    systems: ['CRM', 'Deal Database', 'Email'],
    roles: {
      lead: 'Associate',
      contributors: ['Analyst'],
      approver: 'Principal',
      stakeholders: ['Investment Team']
    },
    duration: '1-2 days',
    dependencies: ['Teaser receipt', 'Initial call with banker']
  },

  // PORTFOLIO MANAGEMENT WORKFLOWS
  portfolioReporting: {
    id: 'portfolio-reporting',
    name: 'Portfolio Company Reporting',
    description: 'Regular financial and operational reporting for portfolio companies',
    category: 'Portfolio Management',
    module: 'metrics',
    substages: [
      'Executive Summary',
      'Goal Progress',
      'Department Highlights',
      'Key Ratios',
      'Quarterly Results'
    ],
    progressStages: [
      'Not Started',
      'Data Collection',
      'Draft Preparation',
      'Internal Review',
      'Management Review',
      'Board Ready'
    ],
    inputs: [
      { type: 'xlsx', label: 'Monthly Financial Package', required: true, template: 'monthly-reporting-template.xlsx' },
      { type: 'pptx', label: 'Board Deck Template', required: true, template: 'board-deck-template.pptx' },
      { type: 'xlsx', label: 'KPI Dashboard', required: true, template: 'kpi-dashboard-template.xlsx' },
      { type: 'docx', label: 'Management Commentary', required: false, template: 'commentary-template.docx' }
    ],
    outputs: [
      { type: 'pptx', label: 'Board Presentation', deliverable: true, owner: 'Portfolio Manager', template: 'board-presentation-template.pptx' },
      { type: 'pdf', label: 'Portfolio Company Update', deliverable: true, owner: 'Senior Associate', template: 'portfolio-update-template.pdf' },
      { type: 'xlsx', label: 'Performance Analytics', deliverable: true, owner: 'Portfolio Company CFO', template: 'performance-analytics-template.xlsx' }
    ],
    systems: ['Excel', 'PowerPoint', 'Portfolio Management System'],
    integrations: {
      excelParser: 'parseMonthlyPackage',
      dashboardSync: ['Tableau', 'Power BI'],
      syncTo: ['Board Portal', 'LP Portal', 'Portfolio System'],
      automations: ['extractKPIs', 'generateCharts', 'flagVariances']
    },
    roles: {
      lead: 'Portfolio Manager',
      contributors: ['Senior Associate', 'Portfolio Company CFO'],
      approver: 'Managing Director',
      stakeholders: ['Board Members', 'LPs']
    },
    duration: '1 week',
    dependencies: ['Monthly close completion', 'Management availability'],
    cadence: 'Monthly',
    tags: ['Portfolio Management', 'Board Reporting', 'KPI Tracking', 'Recurring'],
    complexity: 'Medium',
    criticality: 'Board Governance'
  },

  valueCreationPlanning: {
    id: 'value-creation',
    name: 'Value Creation Planning',
    description: 'Strategic planning and execution tracking for portfolio company improvements',
    category: 'Portfolio Management',
    module: 'collaboration',
    substages: [
      'Action Tracker',
      'Stakeholder Notes',
      'Ownership Directory',
      'Recommendations'
    ],
    inputs: [
      { type: 'xlsx', label: 'Current Performance Metrics', required: true },
      { type: 'pptx', label: 'Initial Investment Thesis', required: true },
      { type: 'docx', label: 'Management Team Assessment', required: true },
      { type: 'xlsx', label: 'Competitive Benchmarking', required: false }
    ],
    outputs: [
      { type: 'pptx', label: '100-Day Plan', deliverable: true },
      { type: 'xlsx', label: 'Value Creation Tracker', deliverable: true },
      { type: 'pdf', label: 'Strategic Roadmap', deliverable: true }
    ],
    systems: ['Monday.com', 'Excel', 'PowerPoint'],
    roles: {
      lead: 'Operating Partner',
      contributors: ['Portfolio Company CEO', 'Principal'],
      approver: 'Managing Director',
      stakeholders: ['Board Members', 'Management Team']
    },
    duration: '2-3 weeks',
    dependencies: ['Deal closing', 'Management onboarding']
  },

  // CFO SERVICES WORKFLOWS
  budgetAndForecast: {
    id: 'budget-forecast',
    name: 'Budget Development & Forecasting',
    description: 'Annual budget creation and rolling forecast management',
    category: 'CFO Services',
    module: 'memoEditor',
    substages: ['CFO Services'],
    specificSubStages: [
      'Budget Development & Management',
      'Financial Forecasting & Modeling',
      'Variance Analysis & Reporting'
    ],
    inputs: [
      { type: 'xlsx', label: 'Prior Year Actuals', required: true },
      { type: 'xlsx', label: 'Strategic Plan', required: true },
      { type: 'docx', label: 'Department Input Templates', required: true },
      { type: 'xlsx', label: 'Market Assumptions', required: false }
    ],
    outputs: [
      { type: 'xlsx', label: 'Annual Budget Model', deliverable: true },
      { type: 'xlsx', label: 'Rolling 13-Week Forecast', deliverable: true },
      { type: 'pptx', label: 'Budget Presentation', deliverable: true },
      { type: 'pdf', label: 'Variance Analysis Report', deliverable: true }
    ],
    systems: ['Excel', 'Adaptive Planning', 'NetSuite'],
    roles: {
      lead: 'Fractional CFO',
      contributors: ['Financial Analyst', 'Department Heads'],
      approver: 'CEO',
      stakeholders: ['Board Members', 'Investors']
    },
    duration: '4-6 weeks',
    dependencies: ['Strategic plan completion', 'Department input collection'],
    cadence: 'Annual (with monthly updates)'
  },

  fundraisingSupport: {
    id: 'fundraising-support',
    name: 'Fundraising Materials & Process',
    description: 'Comprehensive support for equity or debt fundraising processes',
    category: 'CFO Services',
    module: 'memoEditor',
    substages: ['CFO Services'],
    specificSubStages: [
      'Fundraising Materials Preparation',
      'Investor Presentation Development',
      'Data Room Management',
      'Investor Q&A Coordination'
    ],
    inputs: [
      { type: 'xlsx', label: 'Financial Model', required: true },
      { type: 'xlsx', label: 'Historical Financials', required: true },
      { type: 'pptx', label: 'Company Overview Deck', required: true },
      { type: 'docx', label: 'Business Plan', required: false }
    ],
    outputs: [
      { type: 'pptx', label: 'Investor Pitch Deck', deliverable: true },
      { type: 'xlsx', label: 'Financial Projections Model', deliverable: true },
      { type: 'pdf', label: 'Executive Summary', deliverable: true },
      { type: 'folder', label: 'Virtual Data Room', deliverable: true }
    ],
    systems: ['PowerPoint', 'Excel', 'DocSend', 'Intralinks'],
    roles: {
      lead: 'Fractional CFO',
      contributors: ['Investment Banker', 'Legal Counsel'],
      approver: 'CEO',
      stakeholders: ['Board Members', 'Potential Investors']
    },
    duration: '6-8 weeks',
    dependencies: ['Board approval', 'Legal documentation prep']
  },

  // DATA & ANALYTICS WORKFLOWS
  businessIntelligence: {
    id: 'business-intelligence',
    name: 'Business Intelligence Dashboard',
    description: 'Design and implementation of executive dashboards and KPI tracking',
    category: 'Data & Analytics',
    module: 'memoEditor',
    substages: ['Insights & Data'],
    specificSubStages: [
      'Advanced Analytics Solutions',
      'Operational Intelligence Dashboards',
      'Real-Time Data Processing',
      'Data Visualization & Storytelling'
    ],
    inputs: [
      { type: 'xlsx', label: 'Raw Data Sources', required: true },
      { type: 'docx', label: 'KPI Requirements', required: true },
      { type: 'sql', label: 'Database Schema', required: true },
      { type: 'json', label: 'API Documentation', required: false }
    ],
    outputs: [
      { type: 'dashboard', label: 'Executive Dashboard', deliverable: true },
      { type: 'pdf', label: 'Data Architecture Document', deliverable: true },
      { type: 'xlsx', label: 'KPI Dictionary', deliverable: true }
    ],
    systems: ['Tableau', 'Power BI', 'SQL Server', 'Python'],
    roles: {
      lead: 'Data Scientist',
      contributors: ['Business Analyst', 'Data Engineer'],
      approver: 'Chief Data Officer',
      stakeholders: ['Executive Team', 'Department Heads']
    },
    duration: '4-6 weeks',
    dependencies: ['Data source access', 'Requirements gathering']
  },

  // OPERATIONAL WORKFLOWS
  processOptimization: {
    id: 'process-optimization',
    name: 'Business Process Optimization',
    description: 'Analysis and improvement of core business processes',
    category: 'Operations',
    module: 'collaboration',
    substages: [
      'Action Tracker',
      'Stakeholder Notes',
      'Ownership Directory',
      'Recommendations'
    ],
    inputs: [
      { type: 'docx', label: 'Current Process Documentation', required: true },
      { type: 'xlsx', label: 'Process Metrics', required: true },
      { type: 'pdf', label: 'Pain Point Analysis', required: true }
    ],
    outputs: [
      { type: 'pdf', label: 'Process Improvement Plan', deliverable: true },
      { type: 'docx', label: 'Optimized Process Documentation', deliverable: true },
      { type: 'xlsx', label: 'Implementation Timeline', deliverable: true }
    ],
    systems: ['Visio', 'Excel', 'Process Mining Tools'],
    roles: {
      lead: 'Operations Manager',
      contributors: ['Business Analyst', 'Process Owners'],
      approver: 'COO',
      stakeholders: ['Department Teams', 'Executive Team']
    },
    duration: '3-4 weeks',
    dependencies: ['Process mapping completion', 'Stakeholder interviews']
  },

  // SPECIALIZED WORKFLOWS
  transactionAnalysis: {
    id: 'transaction-analysis',
    name: 'M&A Transaction Analysis',
    description: 'Comprehensive analysis of merger, acquisition, or divestiture transactions',
    category: 'Transaction Advisory',
    module: 'transactionAnalysis',
    substages: [
      'Buyout Transaction',
      'Merger Investment',
      'Accretion Dilution',
      'Divestiture Investment'
    ],
    inputs: [
      { type: 'xlsx', label: 'Target Company Financials', required: true },
      { type: 'xlsx', label: 'Acquirer Financials', required: true },
      { type: 'pdf', label: 'Transaction Overview', required: true },
      { type: 'xlsx', label: 'Synergy Estimates', required: false }
    ],
    outputs: [
      { type: 'xlsx', label: 'Accretion/Dilution Analysis', deliverable: true },
      { type: 'pdf', label: 'Transaction Summary', deliverable: true },
      { type: 'pptx', label: 'Board Recommendation', deliverable: true }
    ],
    systems: ['Excel', 'FactSet', 'Bloomberg'],
    roles: {
      lead: 'M&A Director',
      contributors: ['Financial Analyst', 'Legal Counsel'],
      approver: 'CFO',
      stakeholders: ['Board Members', 'Executive Team']
    },
    duration: '2-3 weeks',
    dependencies: ['LOI execution', 'Financial data access']
  }
};

// Enhanced workflow utility functions
export const getWorkflowsByCategory = (category) => {
  return Object.values(workflowDefinitions).filter(workflow => workflow.category === category);
};

export const getWorkflowsByModule = (module) => {
  return Object.values(workflowDefinitions).filter(workflow => workflow.module === module);
};

export const getWorkflowsByRole = (role) => {
  return Object.values(workflowDefinitions).filter(workflow =>
    workflow.roles.lead === role ||
    workflow.roles.contributors.includes(role) ||
    workflow.roles.approver === role
  );
};

export const getWorkflowsByTags = (tags) => {
  return Object.values(workflowDefinitions).filter(workflow =>
    workflow.tags && tags.some(tag => workflow.tags.includes(tag))
  );
};

export const getWorkflowsByComplexity = (complexity) => {
  return Object.values(workflowDefinitions).filter(workflow => workflow.complexity === complexity);
};

export const getRecurringWorkflows = () => {
  return Object.values(workflowDefinitions).filter(workflow => workflow.cadence);
};

export const getWorkflowById = (id) => {
  return workflowDefinitions[id];
};

export const getAllWorkflowCategories = () => {
  return [...new Set(Object.values(workflowDefinitions).map(workflow => workflow.category))];
};

export const getAllWorkflowTags = () => {
  const allTags = new Set();
  Object.values(workflowDefinitions).forEach(workflow => {
    if (workflow.tags) {
      workflow.tags.forEach(tag => allTags.add(tag));
    }
  });
  return Array.from(allTags);
};

export const getWorkflowDependencies = (workflowId) => {
  const workflow = workflowDefinitions[workflowId];
  return workflow ? workflow.dependencies : [];
};

export const getWorkflowInputTypes = () => {
  const inputTypes = new Set();
  Object.values(workflowDefinitions).forEach(workflow => {
    workflow.inputs.forEach(input => inputTypes.add(input.type));
  });
  return Array.from(inputTypes);
};

export const getWorkflowOutputTypes = () => {
  const outputTypes = new Set();
  Object.values(workflowDefinitions).forEach(workflow => {
    workflow.outputs.forEach(output => outputTypes.add(output.type));
  });
  return Array.from(outputTypes);
};

export const getTemplatesForWorkflow = (workflowId) => {
  const workflow = workflowDefinitions[workflowId];
  if (!workflow) return [];

  const templates = [];
  workflow.inputs.forEach(input => {
    if (input.template) templates.push({ type: 'input', ...input });
  });
  workflow.outputs.forEach(output => {
    if (output.template) templates.push({ type: 'output', ...output });
  });
  return templates;
};

export const getWorkflowsByIntegration = (integration) => {
  return Object.values(workflowDefinitions).filter(workflow =>
    workflow.integrations && (
      workflow.integrations.vdr?.includes(integration) ||
      workflow.integrations.syncTo?.includes(integration) ||
      workflow.integrations.dashboardSync?.includes(integration)
    )
  );
};

export const getWorkflowAutomations = (workflowId) => {
  const workflow = workflowDefinitions[workflowId];
  return workflow?.integrations?.automations || workflow?.automations || [];
};

export const getDeliverablesByOwner = (workflowId, owner) => {
  const workflow = workflowDefinitions[workflowId];
  if (!workflow) return [];

  return workflow.outputs.filter(output =>
    output.deliverable && output.owner === owner
  );
};

export const getWorkflowProgressStages = (workflowId) => {
  const workflow = workflowDefinitions[workflowId];
  return workflow?.progressStages || [
    'Not Started',
    'In Progress',
    'Under Review',
    'Completed'
  ];
};

export const validateWorkflowInputs = (workflowId, providedInputs) => {
  const workflow = workflowDefinitions[workflowId];
  if (!workflow) return { valid: false, errors: ['Workflow not found'] };

  const errors = [];
  const requiredInputs = workflow.inputs.filter(input => input.required);

  requiredInputs.forEach(input => {
    if (!providedInputs.find(provided => provided.label === input.label)) {
      errors.push(`Missing required input: ${input.label}`);
    }
  });

  return { valid: errors.length === 0, errors };
};

export const getWorkflowMetrics = () => {
  const workflows = Object.values(workflowDefinitions);
  return {
    totalWorkflows: workflows.length,
    byCategory: workflows.reduce((acc, w) => {
      acc[w.category] = (acc[w.category] || 0) + 1;
      return acc;
    }, {}),
    byComplexity: workflows.reduce((acc, w) => {
      if (w.complexity) {
        acc[w.complexity] = (acc[w.complexity] || 0) + 1;
      }
      return acc;
    }, {}),
    recurringCount: workflows.filter(w => w.cadence).length,
    avgDuration: workflows.filter(w => w.duration).length
  };
};

export default workflowDefinitions;