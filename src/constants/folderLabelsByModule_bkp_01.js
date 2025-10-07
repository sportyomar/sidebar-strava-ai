// src/constants/folderLabelsByModule.js (frontend)
const folderLabelsByModule = {
  manifest: [
    {label: 'Template Engine',
      subStages: [
        {
          group:'Platform Research',
          items: [
              'Sandbox-1',
              'Sandbox-2',
              'Sandbox-3'
          ]
        }
      ]
    }
  ],
  marketingCollateral: [
    {
      label: 'Brand & Creative Assets',
      subStages: [
        {
          group: 'Brand Guidelines',
          items: [
            'Logo & Brand Standards',
            'Color Palette & Typography',
            'Brand Voice & Messaging',
            'Visual Identity System',
            'Brand Usage Guidelines',
            'Co-branding Standards'
          ]
        },
        {
          group: 'Visual Assets',
          items: [
            'Stock Photo Library',
            'Custom Photography',
            'Illustrations & Graphics',
            'Icon Library',
            'Video Assets',
            'Animation Library'
          ]
        },
        {
          group: 'Template Library',
          items: [
            'PowerPoint Templates',
            'Email Templates',
            'Social Media Templates',
            'Document Templates',
            'Web Graphics Templates',
            'Print Layout Templates'
          ]
        }
      ]
    },
    {
      label: 'Sales Enablement',
      subStages: [
        {
          group: 'Pitch Materials',
          items: [
            'Master Pitch Deck',
            'Capability Presentations',
            'Case Study Decks',
            'ROI Calculators',
            'Competitive Battle Cards',
            'Objection Handling Guides'
          ]
        },
        {
          group: 'Proposal Support',
          items: [
            'Proposal Templates',
            'Service Description Library',
            'Pricing Sheets',
            'Contract Addendums',
            'Reference Materials',
            'Testimonial Database'
          ]
        },
        {
          group: 'Client-Facing Materials',
          items: [
            'Executive Summary Templates',
            'Project Overview Decks',
            'Success Story Presentations',
            'Industry-Specific Materials',
            'Thought Leadership Content',
            'Implementation Guides'
          ]
        }
      ]
    },
    {
      label: 'Campaign Materials',
      subStages: [
        {
          group: 'Digital Marketing',
          items: [
            'Website Content',
            'Landing Page Copy',
            'Email Campaign Content',
            'Social Media Assets',
            'Display Ad Creative',
            'Video Marketing Content'
          ]
        },
        {
          group: 'Event & Conference',
          items: [
            'Booth Graphics',
            'Speaking Presentations',
            'Handout Materials',
            'Swag & Giveaways',
            'Event Signage',
            'Follow-up Materials'
          ]
        },
        {
          group: 'Print Materials',
          items: [
            'Brochures & Flyers',
            'Business Cards',
            'Stationery Package',
            'Trade Publication Ads',
            'Direct Mail Pieces',
            'Corporate Fact Sheets'
          ]
        }
      ]
    },
    {
      label: 'Content Strategy',
      subStages: [
        {
          group: 'Thought Leadership',
          items: [
            'White Papers',
            'Industry Reports',
            'Research Studies',
            'Expert Interviews',
            'Opinion Pieces',
            'Trend Analysis'
          ]
        },
        {
          group: 'Educational Content',
          items: [
            'How-to Guides',
            'Best Practices Documentation',
            'Webinar Content',
            'Training Materials',
            'FAQ Documents',
            'Glossary & Definitions'
          ]
        },
        {
          group: 'Case Studies & Success Stories',
          items: [
            'Client Success Stories',
            'Project Case Studies',
            'Before/After Comparisons',
            'Quantified Results',
            'Industry-Specific Examples',
            'Challenge-Solution Narratives'
          ]
        }
      ]
    },
    {
      label: 'Internal Communications',
      subStages: [
        {
          group: 'Employee Engagement',
          items: [
            'Internal Newsletters',
            'Company Updates',
            'Team Spotlights',
            'Achievement Announcements',
            'Culture & Values Content',
            'Training Communications'
          ]
        },
        {
          group: 'Recruitment Materials',
          items: [
            'Job Posting Templates',
            'Employer Brand Materials',
            'Recruitment Presentations',
            'Employee Value Proposition',
            'Onboarding Materials',
            'Candidate Experience Assets'
          ]
        }
      ]
    },
    {
      label: 'Performance & Analytics',
      subStages: [
        {
          group: 'Campaign Tracking',
          items: [
            'Usage Analytics',
            'Performance Dashboards',
            'ROI Measurement',
            'Engagement Metrics',
            'Conversion Tracking',
            'A/B Testing Results'
          ]
        },
        {
          group: 'Asset Management',
          items: [
            'Asset Library Organization',
            'Version Control System',
            'Approval Workflows',
            'Distribution Tracking',
            'Compliance Monitoring',
            'Archive Management'
          ]
        }
      ]
    }
  ],
  connectors: [
    {
      label: 'Data Source Connectors',
      subStages: [
        {
          group: 'Cloud Storage & Files',
          items: [
            'Google Drive Connector',
            'SharePoint Connector',
            'Dropbox Connector',
            'AWS S3 Connector',
            'Box Connector',
            'OneDrive Connector'
          ]
        },
        {
          group: 'Financial Systems',
          items: [
            'NetSuite Connector',
            'QuickBooks Connector',
            'SAP Connector',
            'Oracle Financials Connector',
            'Xero Connector',
            'Sage Intacct Connector',
            'Workday Financials Connector'
          ]
        },
        {
          group: 'CRM & Sales',
          items: [
            'Salesforce Connector',
            'HubSpot Connector',
            'Microsoft Dynamics Connector',
            'Pipedrive Connector',
            'Zoho CRM Connector'
          ]
        },
        {
          group: 'Databases',
          items: [
            'MySQL Connector',
            'PostgreSQL Connector',
            'SQL Server Connector',
            'MongoDB Connector',
            'Snowflake Connector',
            'BigQuery Connector',
            'Redshift Connector'
          ]
        },
        {
          group: 'Analytics & BI',
          items: [
            'Tableau Connector',
            'Power BI Connector',
            'Looker Connector',
            'Google Analytics Connector',
            'Adobe Analytics Connector'
          ]
        },
        {
          group: 'HR & Payroll',
          items: [
            'Workday HR Connector',
            'BambooHR Connector',
            'ADP Connector',
            'Greenhouse Connector',
            'Lever Connector'
          ]
        },
        {
          group: 'Marketing & Advertising',
          items: [
            'Google Ads Connector',
            'Facebook Ads Connector',
            'LinkedIn Ads Connector',
            'Mailchimp Connector',
            'Marketo Connector'
          ]
        },
        {
          group: 'E-commerce & Retail',
          items: [
            'Shopify Connector',
            'WooCommerce Connector',
            'Magento Connector',
            'Amazon Seller Central Connector',
            'eBay Connector'
          ]
        },
        {
          group: 'Project Management',
          items: [
            'Asana Connector',
            'Jira Connector',
            'Monday.com Connector',
            'Trello Connector',
            'Slack Connector',
            'Microsoft Teams Connector'
          ]
        },
        {
          group: 'Custom & API',
          items: [
            'REST API Connector',
            'GraphQL Connector',
            'Webhook Connector',
            'SOAP Connector',
            'FTP/SFTP Connector',
            'Custom Database Connector'
          ]
        }
      ]
    },
    {
      label:'Database Operations',
      subStages: [
        {
          group: 'Sync Google Drive',
          items: [
            'Explore Databases',
            'Explore Tables',
            'Build Views',
            'Upload Data'
          ]
        }
      ]
    },
    // {
    //   label: 'Connector Management',
    //   subStages: [
    //     {
    //       group: 'Configuration',
    //       items: [
    //         'Connection Setup',
    //         'Authentication Manager',
    //         'Field Mapping Editor',
    //         'Data Transformation Rules',
    //         'Sync Schedule Configuration',
    //         'Error Handling Rules'
    //       ]
    //     },
    //     {
    //       group: 'Monitoring & Maintenance',
    //       items: [
    //         'Connection Status Dashboard',
    //         'Sync History & Logs',
    //         'Error Tracking & Alerts',
    //         'Performance Metrics',
    //         'Data Quality Monitoring',
    //         'Connector Health Checks'
    //       ]
    //     },
    //     {
    //       group: 'Data Processing',
    //       items: [
    //         'Data Validation Rules',
    //         'Duplicate Detection',
    //         'Data Enrichment',
    //         'Format Standardization',
    //         'Data Lineage Tracking',
    //         'Processing Queue Management'
    //       ]
    //     },
    //     {
    //       group: 'Security & Compliance',
    //       items: [
    //         'Credential Management',
    //         'Data Encryption Settings',
    //         'Access Control Policies',
    //         'Audit Trail Configuration',
    //         'Compliance Reporting',
    //         'Data Retention Policies'
    //       ]
    //     }
    //   ]
    // },
    // {
    //   label: 'Connector Development',
    //   subStages: [
    //     {
    //       group: 'Builder Tools',
    //       items: [
    //         'Custom Connector Builder',
    //         'API Schema Generator',
    //         'Test Connection Wizard',
    //         'Mapping Template Editor',
    //         'Transformation Logic Builder',
    //         'Connector Marketplace'
    //       ]
    //     },
    //     {
    //       group: 'Developer Resources',
    //       items: [
    //         'SDK Documentation',
    //         'Code Examples',
    //         'API Reference',
    //         'Best Practices Guide',
    //         'Community Forums',
    //         'Support Tickets'
    //       ]
    //     }
    //   ]
    // }
  ],
  metrics: [ // Module (Dropdown, Access Bar Only)
    {
      label: 'Portfolio Reporting', // Folder (Large Section, Drawer Only)
      subStages: [
        {
          group: 'Overview', // Group, Sections the items (Drawer only)
          items: [
              'Portfolio Reporting Dashboard' // Component, Selected by Radio button, UI
          ]
        },
        { group: 'Project Setup',
          items: [
              'Setup New Portfolio Project'
          ]
        },
        { group: 'Financial & Operational Reports',
          items: [
            'Executive Summary',
            'Goal Progress',
            'Department Highlights',
            'Key Ratios',
            'Quarterly Results'
          ]
        }
      ]
    }
  ],
  forecasts: [
    'Forward Outlook',
    'Goal Trajectory',
    'Scenario Comparison',
    'Forecast Accuracy',
    'Headwinds & Tailwinds'
  ],
  quality: [
    'Data Freshness Report',
    'Reconciliation Status',
    'Confidence Levels',
    'Change Log',
    'Notes on Limitations'
  ],
  collaboration: [
    'Action Tracker',
    'Stakeholder Notes',
    'Ownership Directory',
    'Comment Archive',
    'Recommendations'
  ],
  transactionAnalysis: [
      'Accretion Dilution',
      'Add On Acquisition',
      'Buyout Transaction',
      'Consolidation Transaction',
      'Divestiture Exit',
      'Divestiture Investment',
      'Going Private',
      'Growth Capital',
      'IPO Transaction',
      'Joint Venture',
      'Merger Exit',
      'Merger Investment',
      'Recapitalization Exit',
      'Recapitalization Investment',
      'Secondary Buyout',
      'Secondary Sale',
      'Shut Down',
      'Sold To Existing Investors',
      'Sold To Management',
      'SPAC Transaction',
      'Special Situations',
      'Spin Off',
      'Stake Purchase',
      'Stake Sale',
      'Trade Sale',
      'Venture'
    ],
    dealIntake: [
      'Deal Name',
      'Source',
      'Sector',
      'Geography',
      'Size Range',
      'Seller Type',
      'Notes',
      'Attachments',
    ],
    memoEditor: [
      {
        label: 'Insights & Data',
        subStages: [
          {
            group:'AI Strategy & Advisory',
            items:[
                'GenAI Strategy Development',
                'Agentic Systems Architecture',
                'AI Transformation Roadmaps',
                'AI Governance & Ethics Framework',
                'AI ROI Assessment & Business Cases',
                'Industry-Specific AI Use Cases'
            ]
          },
          {
            group: 'Data Analytics & Intelligence',
            items: [
              'Advanced Analytics Solutions',
              'Predictive Modeling & Forecasting',
              'Customer Behavior Analytics',
              'Operational Intelligence Dashboards',
              'Real-Time Data Processing',
              'Data Visualization & Storytelling'
            ]
          },
          {
            group: 'Industry-Specific Solutions',
            items: [
              'Financial Services AI Applications',
              'Insurance Industry Analytics',
              'Wealth Management Solutions',
              'P&C/Life Insurance Modeling',
              'Retail & Consumer Analytics',
              'Regulatory Compliance Analytics'
            ]
          },
          {
            group: 'Data Management & Quality',
            items: [
              'Data Strategy & Architecture',
              'Master Data Management',
              'Data Quality Assessment',
              'Data Integration & ETL',
              'Data Privacy & Security',
              'Metadata Management'
            ]
          },
          {
            group: 'Measurement & Optimization',
            items: [
              'Performance Measurement Frameworks',
              'Test-and-Learn Methodologies',
              'A/B Testing & Experimentation',
              'Attribution Modeling',
              'Customer Journey Analytics',
              'Business Intelligence Solutions'
            ]
          },
        ]
      },
      {
        label: 'CFO Services',
        subStages: [
          {
            group:'Financial Planning & Analysis',
            items:[
                'Budget Development & Management',
                'Financial Forecasting & Modeling',
                'Variance Analysis & Reporting',
                'KPI Development & Tracking',
                'Board Reporting Packages',
                'Management Reporting Systems'
            ]
          },
          {
            group: 'Accounting & Controls',
            items: [
              'Financial Statement Preparation',
              'Month-End Close Process',
              'Internal Controls Implementation',
              'Audit Coordination & Management',
              'Revenue Recognition Analysis',
              'Cost Accounting & Allocation'
            ]
          },
          {
            group: 'Cash Management & Treasury',
            items: [
              'Cash Flow Forecasting',
              'Working Capital Optimization',
              'Banking Relationship Management',
              'Investment Policy Development',
              'Credit Facility Management',
              'Foreign Exchange Management'
            ]
          },
          {
            group: 'Strategic Finance',
            items: [
              'Business Case Development',
              'M&A Financial Analysis',
              'Capital Structure Optimization',
              'Investment Evaluation',
              'Scenario Planning & Stress Testing',
              'Value Creation Planning'
            ]
          },
          {
            group: 'Fundraising & Investor Relations',
            items: [
              'Fundraising Materials Preparation',
              'Investor Presentation Development',
              'Data Room Management',
              'Investor Q&A Coordination',
              'Valuation Analysis & Support',
              'Term Sheet Negotiation Support'
            ]
          },
          {
            group: 'Risk Management & Compliance',
            items: [
              'Financial Risk Assessment',
              'Compliance Program Development',
              'Insurance Program Review',
              'Tax Planning & Strategy',
              'Regulatory Reporting',
              'Risk Mitigation Strategies'
            ]
          },
          {
            group: 'Systems & Process Optimization',
            items: [
              'ERP Implementation & Optimization',
              'Financial Systems Integration',
              'Process Automation',
              'Data Analytics & Visualization',
              'Financial Controls Documentation',
              'Team Training & Development'
            ]
          }
        ]
      },
      {
        label: 'Due Diligence',
        subStages: [
          {
            group: 'Early Stage',
            items:[

            ]
          },
          {
            group: 'IC Ready',
            items: [

            ]
          },
          {
            group: 'Kickoff & Planning',
            items: [
              'Deal Team Formation',
              'Preliminary Investment Thesis',
              'Engagement Letter',
              'DD Workplan Definition',
              'VDR Setup & Indexing',
              'Kickoff Call with Management',
            ]
          },
          {
            group: 'Initial Assessment',
            items: [
              'Initial Q&A Round',
              'Executive Summary',
              'Risk Factors',
            ]
          },
          {
            group: 'Deep Dives',
            items: [
              'Financial DD',
              'Commercial DD',
              'Operational DD',
              'Legal DD',
              'IT / Technology DD',
              'HR / Talent DD',
              'ESG DD'
            ]
          },
          {
            group: 'Market Validation & Stakeholder Checks',
            items: [
              'Customer Interviews',
              'Vendor / Partner Checks',
              'Expert Calls',
              'Ex-Employee Feedback',
              'Reputation & Media Sweep'
            ]
          },
          {
            group: 'Synthesis & Value Creation Planning',
            items: [
              'Key Findings Consolidation',
              'Model Refinement (Base / Upside / Downside)',
              'Synergy Mapping',
              '100-Day Plan Drafting',
              'Preliminary Valuation Ranges'
            ]
          },
          {
            group: 'Final Review & Approval',
            items: [
              'Final DD Memo',
              'IC Deck & Approval Materials',
              'Deal Structuring Inputs',
              'Final Q&A / Confirmatory DD',
              'Legal Docs Review',
              'Signing / Closing Prep'
            ]
          },
          {
            group: 'Continuous Activities',
            items: [
              'Ongoing Q&A Tracking',
              'Rolling Risk Log Updates',
              'Management Alignment Touchpoints',
              'Model Adjustments',
              'Weekly Workstream Syncs'
            ]
          }
        ]
      },
      'Term Sheet Issued',
      'Signed / Closed',
      'Passed'
    ],
    utilities: [
      {
        label: 'Library Discovery & Analysis',
        // Req: the first requirement is a binding engine and spec for the available python libraries if we use that.
        // TechReq:this will formally codify features and contraints of powerpoint within our engine
        // TechReq:if there are serious contraints that our binding engine must overcome we can work on those early
         // Todo: scan the entire python-pptx to create a binding engine and spec
        // Objective: binding engine becomes your contract between business requirements and technical reality.
        subStages: [
          {
            group: 'Step 1: Library File System Scanning',
            items: [
              'Step 1 Dashboard',
              // 'Download python-pptx source code from GitHub',
              // 'Parse all .py files in the package directory',
              // 'Extract import statements to map dependencies',
              // 'List all Python files and their purposes',
              // 'Create file structure map'
            ]
          },
          {
            group: 'Step 2: AST (Abstract Syntax Tree) Parsing',
            items: [
                'Step 2 Dashboard',
              // 'Parse each Python file into an AST',
              // 'Extract all class definitions and their methods',
              // 'Extract all function definitions and parameters',
              // 'Extract all property definitions',
              // 'Extract docstrings and type hints',
              // 'Store in structured format (JSON/database)'
            ]
          },
          {
            group: 'Step 3: Runtime Object Introspection',
            items: [
              'Import python-pptx library',
              'Create a basic Presentation object',
              'Use dir() on every object to list available methods',
              'Use inspect.signature() to get method parameters',
              'Use type() to determine object types',
              'Test hasattr() for property existence',
              'Document what each method actually returns'
            ]
          },
          {
            group: 'Step 4: Systematic Method Testing',
            items: [
              'Create test presentation file',
              'For each discovered method, attempt to call it',
              'Try with minimal valid parameters',
              'Record success/failure and error messages',
              'Try with edge case parameters (None, empty, large values)',
              'Document actual behavior vs documented behavior'
            ]
          },
          {
            group: 'Step 5: Boundary Value Testing',
            items: [
              'Test text length limits (1 char, 1000 chars, 10000 chars)',
              'Test image size limits (small, medium, large files)',
              'Test slide count limits (1, 100, 1000 slides)',
              'Test shape count limits per slide',
              'Test performance timing for each operation',
              'Record where operations fail or slow down'
            ]
          },
          {
            group: 'Step 6: File Format Analysis',
            items: [
              'Create presentations with different features',
              'Save and analyze resulting .pptx file sizes',
              'Test opening files in actual PowerPoint',
              'Compare python-pptx output vs manually created slides',
              'Document compatibility issues'
            ]
          },
          {
            group: 'Step 7: Data Structure Mapping',
            items: [
              'Create comprehensive test data sets',
              'Test how different data types are handled',
              'Document conversion rules (strings, numbers, dates)',
              'Test data structure limits (nested objects, arrays)',
              'Map input formats to output results'
            ]
          },
          {
            group: 'Step 8: Constraint Documentation',
            items: [
              'Compile all failure points from steps 1-7',
              'Create constraint categories (size limits, format limits, feature gaps)',
              'Document each constraint with exact parameters that cause failure',
              'Create constraint severity levels (blocker, warning, performance)',
              'Generate constraint lookup tables',
              'Cross-reference constraints with method dependencies'
            ]
          },
          {
            group: 'Step 9: Capability Matrix Generation',
            items: [
              'Create grid of all discovered methods vs constraint categories',
              'Mark each method as: WORKS, FAILS, PARTIAL, UNTESTED',
              'Add performance ratings (FAST, SLOW, VERY_SLOW)',
              'Add reliability ratings (STABLE, FLAKY, BROKEN)',
              'Generate capability scoring system',
              'Export matrix as structured data (CSV, JSON)'
            ]
          },
          {
            group: 'Step 10: Binding Rule Creation',
            items: [
              'For each working method, create binding rule template',
              'Define required parameters and optional parameters',
              'Define pre-conditions that must be met',
              'Define post-conditions and expected outputs',
              'Define error handling for each failure mode',
              'Create validation rules for parameter checking'
            ]
          },
          {
            group: 'Step 11: Execution Engine Implementation',
            items: [
              'Build method dispatcher that routes requests to python-pptx',
              'Add constraint validation before each method call',
              'Add error handling and fallback strategies',
              'Add logging for debugging and monitoring',
              'Add performance monitoring and timeouts',
              'Create rollback mechanisms for failed operations'
            ]
          },
          {
            group: 'Step 12: Specification Document Generation',
            items: [
              'Generate formal specification from all collected data',
              'Create human-readable constraint documentation',
              'Generate API reference with actual behavior notes',
              'Create operation examples with working code',
              'Generate troubleshooting guide for common failures',
              'Export as formal specification document'
            ]
          },
          {
            group: 'Step 13: Validation Test Suite Creation',
            items: [
              'Create automated tests for every documented capability',
              'Create regression tests for known constraint violations',
              'Create performance benchmarks',
              'Create compatibility tests across Python versions',
              'Create output validation tests (compare generated vs expected)',
              'Set up continuous testing framework'
            ]
          },
          {
            group: 'Step 14: Binding Engine Assembly',
            items: [
              'Combine constraint validator, method dispatcher, and error handler into single engine',
              'Create configuration system for runtime behavior settings',
              'Add plugin architecture for extending capabilities',
              'Build command queue system for batch operations',
              'Add transaction support for atomic presentation building',
              'Create engine state management and recovery systems'
            ]
          },
          {
            group: 'Step 15: Interface Layer Creation',
            items: [
              'Design abstract operation interface (create_slide, add_text, insert_chart)',
              'Map abstract operations to concrete python-pptx method sequences',
              'Create parameter translation layer (business terms to technical parameters)',
              'Build result standardization (consistent return formats)',
              'Add operation chaining support (slide1.add_title().add_bullets())',
              'Create operation validation pipeline'
            ]
          },
          {
            group: 'Step 16: Output Format Standardization',
            items: [
              'Define standard presentation object model',
              'Create serialization/deserialization for presentation state',
              'Build presentation diff and comparison tools',
              'Create presentation validation against original requirements',
              'Add presentation metadata tracking',
              'Create export format options (different PowerPoint versions)'
            ]
          },
          {
            group: 'Step 17: Performance Optimization',
            items: [
              'Profile all operations and identify bottlenecks',
              'Implement caching for repeated operations',
              'Add batch processing for multiple similar operations',
              'Create lazy loading for large presentations',
              'Add memory management for resource-intensive operations',
              'Implement parallel processing where possible'
            ]
          },
          {
            group: 'Step 18: Production Readiness',
            items: [
              'Add comprehensive logging and monitoring',
              'Create health check endpoints and diagnostics',
              'Add resource usage tracking and limits',
              'Build error reporting and alerting system',
              'Create backup and recovery procedures',
              'Add security validation and input sanitization'
            ]
          },
          {
            group: 'Step 19: Integration Preparation',
            items: [
              'Create standard API endpoints for external systems',
              'Build authentication and authorization framework',
              'Add rate limiting and throttling',
              'Create request/response format specifications',
              'Build SDK/client libraries for common languages',
              'Create integration testing framework'
            ]
          },
          {
            group: 'Step 20: Documentation and Handoff',
            items: [
              'Generate complete API documentation',
              'Create deployment and operations guide',
              'Build troubleshooting and maintenance procedures',
              'Create user training materials',
              'Generate performance tuning guide',
              'Create system architecture documentation'
            ]
          }
        ]
      },
      {
        label: 'Presentation Tools',
        subStages: [
          {
            group: 'Animated Exports',
            items: [
              'Circle Animation PowerPoint',
              'Line Animation PowerPoint'
            ]
          }
        ]
      },
      {
      label: 'Workflow Mastery Tools',  // 🆕 NEW SECTION
      subStages: [
        {
          group: 'Code Review & Analysis',
          items: [
            'Component Review CLI',
            'Business Alignment Checker',
            'Technical Assessment Tool',
            'Dependency Mapper',
            'Gap Analysis Generator',
            'Pattern Recognition Engine'
          ]
        },
        {
          group: 'Progress Tracking',
          items: [
            'Mastery Progress Dashboard',
            'Daily Session Logger',
            'Skill Level Tracker',
            'Milestone Manager',
            'Time Investment Tracker',
            'Expertise Validator'
          ]
        },
        {
          group: 'Accountability & Reporting',
          items: [
            'Provided vs Built Tracker',
            'Executive Report Generator',
            'Team Update Creator',
            'Contribution Auditor',
            'Value Documentation',
            'Stakeholder Communicator'
          ]
        },
        {
          group: 'AI Integration',
          items: [
            'AI-Assisted Code Review',
            'Automated Gap Detection',
            'Smart Recommendations',
            'Pattern Learning Engine',
            'Workflow Optimization',
            'Predictive Analysis'
          ]
        }
      ]
    },
    {
      label: 'Identity Generator',
      subStages: [
        {
          group: 'Steps',
          items: [
            'Gmail Signup',
            'Password Generator',
            'VPN Country Check'
          ]
        }
      ]
    },
    {
      label: 'Phone Number Tools',
      subStages: [
        {
          group: 'Phone Setup',
          items: [
            '5SIM Status Check',
            'Number Assignment',
            'SMS Polling'
          ]
        }
      ]
    },
    {
      label: 'Automation Scripts',
      subStages: [
        {
          group: 'Automated Actions',
          items: [
            'Playwright Signup Flow',
            'Email Warmup Tasks',
            'Browser Session Mocker'
          ]
        }
      ]
    },
  ],
  ontologyBuilder: [
    {
      label: 'Domain Modeling',
      subStages: [
        {
          group: 'Conceptual Framework',
          items: [
            'Entity Definition',
            'Relationship Mapping',
            'Attribute Specification',
            'Hierarchy Construction',
            'Constraint Definition',
            'Inheritance Rules'
          ]
        },
        {
          group: 'Semantic Networks',
          items: [
            'Node Classification',
            'Edge Type Definition',
            'Weighted Relationships',
            'Path Analysis',
            'Connectivity Mapping',
            'Network Topology'
          ]
        },
        {
          group: 'Frame Systems',
          items: [
            'Frame Templates',
            'Slot Definitions',
            'Default Values',
            'Procedural Attachments',
            'Frame Inheritance',
            'Context Binding'
          ]
        }
      ]
    },
    {
      label: 'Knowledge Validation',
      subStages: [
        {
          group: 'Consistency Checking',
          items: [
            'Logic Validation',
            'Constraint Verification',
            'Circular Reference Detection',
            'Completeness Analysis',
            'Redundancy Detection',
            'Conflict Resolution'
          ]
        }
      ]
    }
  ],
  semanticParser: [
    {
      label: 'Language Processing',
      subStages: [
        {
          group: 'Lexical Analysis',
          items: [
            'Token Identification',
            'Pattern Recognition',
            'Entity Extraction',
            'Keyword Mapping',
            'Context Clues',
            'Ambiguity Resolution'
          ]
        },
        {
          group: 'Syntactic Parsing',
          items: [
            'Grammar Rules',
            'Parse Tree Construction',
            'Syntax Validation',
            'Structure Analysis',
            'Pattern Matching',
            'Error Recovery'
          ]
        },
        {
          group: 'Semantic Analysis',
          items: [
            'Meaning Extraction',
            'Intent Recognition',
            'Slot Filling',
            'Semantic Role Labeling',
            'Concept Mapping',
            'Context Integration'
          ]
        }
      ]
    },
    {
      label: 'Output Generation',
      subStages: [
        {
          group: 'Structured Representation',
          items: [
            'AST Generation',
            'JSON Schema Output',
            'Graph Representation',
            'Vector Encoding',
            'Metadata Annotation',
            'Quality Scoring'
          ]
        }
      ]
    }
  ],
  domainAdapter: [
    {
      label: 'Domain Configuration',
      subStages: [
        {
          group: 'Sports & Games',
          items: [
            'NFL Play Parser',
            'NFL Formation Analysis',
            'NFL Route Concepts',
            'Basketball Strategies',
            'Chess Notation',
            'Video Game Commands',
            'Esports Strategies',
            'Olympic Events'
          ]
        },
        {
          group: 'Business Operations',
          items: [
            'Meeting Commands',
            'Project Instructions',
            'Workflow Definitions',
            'Process Specifications',
            'Resource Allocation',
            'Task Orchestration'
          ]
        },
        {
          group: 'Technical Systems',
          items: [
            'Code Instructions',
            'Deployment Commands',
            'Configuration Scripts',
            'API Specifications',
            'Database Queries',
            'System Operations'
          ]
        },
        {
          group: 'Military & Defense',
          items: [
            'Tactical Commands',
            'Mission Parameters',
            'Formation Instructions',
            'Equipment Specifications',
            'Objective Definitions',
            'Contingency Plans'
          ]
        },
        {
          group: 'Legal & Compliance',
          items: [
            'Contract Clauses',
            'Regulatory Requirements',
            'Policy Statements',
            'Compliance Frameworks',
            'Risk Assessments',
            'Audit Procedures'
          ]
        }
      ]
    },
    {
      label: 'Adaptation Layer',
      subStages: [
        {
          group: 'Grammar Mapping',
          items: [
            'Domain Vocabulary',
            'Syntax Rules',
            'Semantic Patterns',
            'Context Rules',
            'Exception Handling',
            'Transformation Logic'
          ]
        }
      ]
    }
  ],
  knowledgeGraph: [
    {
      label: 'Graph Construction',
      subStages: [
        {
          group: 'Node Management',
          items: [
            'Entity Nodes',
            'Concept Nodes',
            'Attribute Nodes',
            'Value Nodes',
            'Temporal Nodes',
            'Context Nodes'
          ]
        },
        {
          group: 'Relationship Engineering',
          items: [
            'Edge Types',
            'Relationship Strength',
            'Directional Mapping',
            'Temporal Relationships',
            'Conditional Links',
            'Probabilistic Connections'
          ]
        },
        {
          group: 'Graph Operations',
          items: [
            'Path Finding',
            'Subgraph Extraction',
            'Pattern Matching',
            'Graph Traversal',
            'Similarity Computation',
            'Clustering Analysis'
          ]
        }
      ]
    },
    {
      label: 'Query Interface',
      subStages: [
        {
          group: 'Query Processing',
          items: [
            'Graph Query Language',
            'Natural Language Queries',
            'Visual Query Builder',
            'Parameterized Queries',
            'Complex Joins',
            'Result Ranking'
          ]
        }
      ]
    }
  ],
  reasoningEngine: [
    {
      label: 'Inference Systems',
      subStages: [
        {
          group: 'Logical Reasoning',
          items: [
            'Deductive Inference',
            'Inductive Reasoning',
            'Abductive Logic',
            'Rule-Based Systems',
            'Constraint Satisfaction',
            'Probabilistic Reasoning'
          ]
        },
        {
          group: 'Decision Support',
          items: [
            'Decision Trees',
            'Scenario Analysis',
            'Risk Assessment',
            'Optimization Models',
            'Multi-Criteria Analysis',
            'Uncertainty Handling'
          ]
        }
      ]
    },
    {
      label: 'Learning & Adaptation',
      subStages: [
        {
          group: 'Knowledge Acquisition',
          items: [
            'Pattern Learning',
            'Rule Discovery',
            'Concept Formation',
            'Analogy Recognition',
            'Transfer Learning',
            'Incremental Updates'
          ]
        }
      ]
    }
  ],
  contextEngine: [
    {
      label: 'Context Management',
      subStages: [
        {
          group: 'Context Modeling',
          items: [
            'Situational Context',
            'Temporal Context',
            'Spatial Context',
            'User Context',
            'Domain Context',
            'Historical Context'
          ]
        },
        {
          group: 'Context Integration',
          items: [
            'Context Fusion',
            'Context Switching',
            'Context Inheritance',
            'Context Conflict Resolution',
            'Context Validation',
            'Context Persistence'
          ]
        }
      ]
    }
  ],
  visualizationEngine: [
    {
      label: 'Knowledge Visualization',
      subStages: [
        {
          group: 'Graph Visualization',
          items: [
            'Network Diagrams',
            'Hierarchical Trees',
            'Concept Maps',
            'Flow Charts',
            'Interactive Graphs',
            'Layered Representations'
          ]
        },
        {
          group: 'Analysis Views',
          items: [
            'Relationship Matrices',
            'Similarity Heatmaps',
            'Cluster Visualization',
            'Path Highlighting',
            'Temporal Evolution',
            'Multi-Dimensional Projections'
          ]
        }
      ]
    }
  ],
  careerManagement: [
    {
      label: 'Role Planning & Design',
      subStages: [
        {
          group: 'Role Architecture',
          items: [
            'Job Description Templates',
            'Competency Frameworks',
            'Role Level Definitions',
            'Career Pathway Mapping',
            'Skill Taxonomy',
            'Performance Standards'
          ]
        },
        {
          group: 'Market Analysis',
          items: [
            'Compensation Benchmarking',
            'Industry Comparisons',
            'Talent Market Trends',
            'Skills Gap Analysis',
            'Regional Variations',
            'Competitive Intelligence'
          ]
        }
      ]
    },
    {
      label: 'Talent Acquisition',
      subStages: [
        {
          group: 'Sourcing Strategy',
          items: [
            'Candidate Pipeline',
            'Sourcing Channels',
            'Talent Network',
            'Referral Programs',
            'University Relations',
            'Executive Search'
          ]
        },
        {
          group: 'Assessment & Selection',
          items: [
            'Interview Frameworks',
            'Technical Assessments',
            'Case Study Evaluations',
            'Cultural Fit Testing',
            'Reference Checks',
            'Background Verification'
          ]
        }
      ]
    },
    {
      label: 'Performance & Development',
      subStages: [
        {
          group: 'Performance Management',
          items: [
            'Goal Setting & Tracking',
            'Regular Check-ins',
            'Annual Reviews',
            'Feedback Systems',
            'Performance Improvement',
            'Recognition Programs'
          ]
        },
        {
          group: 'Learning & Development',
          items: [
            'Skill Development Plans',
            'Training Programs',
            'Mentorship Matching',
            'Leadership Development',
            'Certification Tracking',
            'Knowledge Sharing'
          ]
        }
      ]
    }
  ],

  // Professional Services Module
  professionalServices: [
    {
      label: 'Service Delivery',
      subStages: [
        {
          group: 'Project Management',
          items: [
            'Statement of Work',
            'Project Charter',
            'Work Breakdown Structure',
            'Resource Planning',
            'Risk Register',
            'Status Reporting'
          ]
        },
        {
          group: 'Client Engagement',
          items: [
            'Client Onboarding',
            'Stakeholder Mapping',
            'Communication Plans',
            'Meeting Cadence',
            'Feedback Collection',
            'Relationship Management'
          ]
        }
      ]
    },
    {
      label: 'Knowledge Management',
      subStages: [
        {
          group: 'Methodology Development',
          items: [
            'Best Practices',
            'Process Documentation',
            'Tool Templates',
            'Quality Standards',
            'Lesson Learned',
            'Innovation Lab'
          ]
        },
        {
          group: 'Thought Leadership',
          items: [
            'Research Reports',
            'White Papers',
            'Industry Insights',
            'Speaking Engagements',
            'Publications',
            'Expert Networks'
          ]
        }
      ]
    }
  ],

  // Business Development Module
  businessDevelopment: [
    {
      label: 'Opportunity Management',
      subStages: [
        {
          group: 'Pipeline Development',
          items: [
            'Lead Generation',
            'Opportunity Scoring',
            'Proposal Development',
            'Competitive Analysis',
            'Win/Loss Analysis',
            'Client Intelligence'
          ]
        },
        {
          group: 'Relationship Building',
          items: [
            'Network Mapping',
            'Event Planning',
            'Client Entertainment',
            'Partnership Development',
            'Alliance Management',
            'Community Engagement'
          ]
        }
      ]
    },
    {
      label: 'Market Strategy',
      subStages: [
        {
          group: 'Market Intelligence',
          items: [
            'Industry Analysis',
            'Competitive Landscape',
            'Market Sizing',
            'Trend Analysis',
            'Customer Insights',
            'Regulatory Impact'
          ]
        },
        {
          group: 'Go-to-Market',
          items: [
            'Service Portfolio',
            'Pricing Strategy',
            'Channel Strategy',
            'Marketing Campaigns',
            'Brand Positioning',
            'Message Framework'
          ]
        }
      ]
    }
  ],

  // Organizational Development Module
  organizationalDevelopment: [
    {
      label: 'Structure & Design',
      subStages: [
        {
          group: 'Organizational Architecture',
          items: [
            'Org Chart Design',
            'Reporting Relationships',
            'Span of Control',
            'Decision Rights',
            'Governance Models',
            'Operating Rhythms'
          ]
        },
        {
          group: 'Change Management',
          items: [
            'Change Strategy',
            'Communication Plan',
            'Training & Support',
            'Resistance Management',
            'Success Metrics',
            'Sustainability Planning'
          ]
        }
      ]
    },
    {
      label: 'Culture & Engagement',
      subStages: [
        {
          group: 'Culture Assessment',
          items: [
            'Values Definition',
            'Behavior Standards',
            'Culture Surveys',
            'Engagement Metrics',
            'Exit Interview Analysis',
            'Culture Dashboard'
          ]
        },
        {
          group: 'Employee Experience',
          items: [
            'Journey Mapping',
            'Touchpoint Optimization',
            'Feedback Mechanisms',
            'Recognition Systems',
            'Wellness Programs',
            'Work-Life Balance'
          ]
        }
      ]
    }
  ],
  privacyCenter: [
    {
      label: 'Browser Data Management',
      subStages: [
        {
          group: 'Storage Controls',
          items: [
            'View Local Storage',
            'Clear Local Storage',
            'View Session Storage',
            'Clear Session Storage'
          ]
        },
        {
          group: 'Cookie Controls',
          items: [
            'List Cookies',
            'Delete Cookies',
            'Cookie Preferences'
          ]
        }
      ]
    },
    {
      label: 'Privacy & Security',
      subStages: [
        {
          group: 'Tracking & Visibility',
          items: [
            'Show IP Address',
            'Detect VPN / Proxy',
            'Estimate Geo Location (IP)',
            'Clear Browser Fingerprints'
          ]
        },
        {
          group: 'Permissions',
          items: [
            'Manage Location Access',
            'Revoke Camera/Mic Permissions',
            'Reset Site Permissions'
          ]
        }
      ]
    }
  ],
  adminConsole: [
    {
      label: 'Access Management',
      subStages: [
        {
          group: 'Team Permissions',
          items: [
            'View Assignments',
            'Update Roles',
            'Module Access Editor'
          ]
        },
        {
          group: 'Security Controls',
          items: [
            'Role Audit Logs',
            'Restricted User Overrides',
            'Access History Tracker'
          ]
        }
      ]
    },
    {
      label: 'Platform Settings',
      subStages: [
        {
          group: 'System Configuration',
          items: [
            'Global Defaults',
            'Role Definitions',
            'Project Type Settings',
          ]
        }
      ]
    }
  ],
  intellectualCapital: [
    {
      label: 'Research & Development',
      subStages: [
        {
          group: 'Innovation Pipeline',
          items: [
            'Research Thesis Development',
            'Technology Landscape Mapping',
            'Proof of Concept Projects',
            'Prototype Development',
            'Feasibility Studies',
            'Technical Risk Assessment'
          ]
        },
        {
          group: 'Experimental Design',
          items: [
            'Hypothesis Formation',
            'Test Case Development',
            'Methodology Framework',
            'Data Collection Protocols',
            'Results Analysis Templates',
            'Iteration Planning'
          ]
        },
        {
          group: 'Patent Development',
          items: [
            'Prior Art Research',
            'Invention Disclosure Forms',
            'Patent Application Drafts',
            'Claims Development',
            'Patent Portfolio Strategy',
            'IP Landscape Analysis'
          ]
        }
      ]
    },
    {
      label: 'Competitive Intelligence',
      subStages: [
        {
          group: 'Market Research',
          items: [
            'Competitor Technology Analysis',
            'Feature Gap Analysis',
            'Pricing Strategy Research',
            'Market Positioning Studies',
            'Product Roadmap Intelligence',
            'Partnership Ecosystem Mapping'
          ]
        },
        {
          group: 'Technology Scouting',
          items: [
            'Emerging Technology Radar',
            'Academic Research Monitoring',
            'Startup Landscape Analysis',
            'Patent Filing Trends',
            'Open Source Intelligence',
            'Conference & Event Insights'
          ]
        },
        {
          group: 'Strategic Intelligence',
          items: [
            'Competitive Threat Assessment',
            'Market Disruption Signals',
            'Technology Adoption Curves',
            'Regulatory Impact Analysis',
            'Industry Consolidation Trends',
            'Investment Flow Analysis'
          ]
        }
      ]
    },
    {
      label: 'Thought Leadership',
      subStages: [
        {
          group: 'Content Strategy',
          items: [
            'Research Publications',
            'Technical White Papers',
            'Industry Position Papers',
            'Trend Analysis Reports',
            'Best Practices Guides',
            'Technology Primers'
          ]
        },
        {
          group: 'External Engagement',
          items: [
            'Conference Speaking',
            'Expert Panel Participation',
            'Industry Advisory Roles',
            'Standards Committee Work',
            'Academic Collaborations',
            'Media Interviews'
          ]
        },
        {
          group: 'Knowledge Dissemination',
          items: [
            'Internal Tech Talks',
            'Cross-Team Knowledge Sharing',
            'Client Education Materials',
            'Partner Training Content',
            'Community Contributions',
            'Open Source Projects'
          ]
        }
      ]
    },
    {
      label: 'Knowledge Assets',
      subStages: [
        {
          group: 'Intellectual Property',
          items: [
            'Patent Portfolio Management',
            'Trade Secret Documentation',
            'Copyright Materials',
            'Trademark Strategy',
            'Licensing Agreements',
            'IP Valuation Models'
          ]
        },
        {
          group: 'Methodologies & Frameworks',
          items: [
            'Proprietary Methodologies',
            'Decision Frameworks',
            'Process Innovations',
            'Tool Development',
            'Algorithm Design',
            'Architecture Patterns'
          ]
        },
        {
          group: 'Data & Insights',
          items: [
            'Research Datasets',
            'Benchmark Studies',
            'Performance Metrics',
            'Industry Databases',
            'Customer Intelligence',
            'Market Intelligence'
          ]
        }
      ]
    },
    {
      label: 'Innovation Management',
      subStages: [
        {
          group: 'Idea Generation',
          items: [
            'Innovation Workshops',
            'Ideation Sessions',
            'Cross-Pollination Studies',
            'Customer Co-Creation',
            'Design Thinking Sessions',
            'Future Scenario Planning'
          ]
        },
        {
          group: 'Evaluation & Prioritization',
          items: [
            'Innovation Scoring Models',
            'ROI Assessment Framework',
            'Technical Feasibility Analysis',
            'Market Opportunity Sizing',
            'Resource Requirement Planning',
            'Risk-Reward Matrices'
          ]
        },
        {
          group: 'Execution & Tracking',
          items: [
            'Innovation Project Management',
            'Milestone Tracking',
            'Resource Allocation',
            'Success Metrics Definition',
            'Pivot Decision Framework',
            'Portfolio Optimization'
          ]
        }
      ]
    },
    {
      label: 'External Partnerships',
      subStages: [
        {
          group: 'Academic Collaboration',
          items: [
            'University Research Partnerships',
            'Joint Research Projects',
            'Student Internship Programs',
            'Faculty Advisory Relationships',
            'Research Grant Applications',
            'Technology Transfer Programs'
          ]
        },
        {
          group: 'Industry Partnerships',
          items: [
            'Technology Alliance Development',
            'Joint Innovation Projects',
            'Standards Development Participation',
            'Consortium Memberships',
            'Cross-Industry Collaboration',
            'Supplier Innovation Programs'
          ]
        },
        {
          group: 'Ecosystem Development',
          items: [
            'Developer Community Building',
            'Partner Enablement Programs',
            'Innovation Challenges',
            'Hackathon Organization',
            'Startup Accelerator Programs',
            'Venture Partnership Strategy'
          ]
        }
      ]
    }
  ],
  ideationCapture: [
    {
      label: 'Raw Capture',
      subStages: [
        {
          group: 'Voice Recordings',
          items: [
            'Stream of Consciousness Audio',
            'Meeting Voice Notes',
            'Walking Brainstorm Sessions',
            'Phone Call Insights',
            'Interview Raw Audio',
            'Spontaneous Idea Captures'
          ]
        },
        {
          group: 'Written Brain Dumps',
          items: [
            'Free-Form Text Dumps',
            'Rapid Fire Note Taking',
            'Whiteboard Sessions',
            'Email Thread Insights',
            'Chat Conversation Exports',
            'Late Night Idea Downloads'
          ]
        },
        {
          group: 'Visual Captures',
          items: [
            'Sketch Photos',
            'Diagram Screenshots',
            'Whiteboard Images',
            'Mind Map Photos',
            'Flowchart Drafts',
            'Napkin Sketch Archives'
          ]
        }
      ]
    },
    {
      label: 'Processing & Refinement',
      subStages: [
        {
          group: 'Transcription & Parsing',
          items: [
            'Audio-to-Text Conversion',
            'Speech Pattern Analysis',
            'Key Phrase Extraction',
            'Sentiment Detection',
            'Speaker Identification',
            'Timestamp Mapping'
          ]
        },
        {
          group: 'AI-Assisted Cleanup',
          items: [
            'GPT Summary Generation',
            'Claude Structure Analysis',
            'LLM Theme Extraction',
            'Concept Clustering',
            'Priority Ranking',
            'Actionable Item Extraction'
          ]
        },
        {
          group: 'Manual Curation',
          items: [
            'Expert Review Sessions',
            'Content Validation',
            'Context Addition',
            'Cross-Reference Linking',
            'Quality Assessment',
            'Relevance Filtering'
          ]
        }
      ]
    },
    {
      label: 'Structured Outputs',
      subStages: [
        {
          group: 'Formatted Summaries',
          items: [
            'Executive Briefings',
            'Key Insights Reports',
            'Action Item Lists',
            'Decision Frameworks',
            'Concept Definitions',
            'Research Directions'
          ]
        },
        {
          group: 'Categorized Content',
          items: [
            'Technical Concepts',
            'Business Opportunities',
            'Product Ideas',
            'Process Improvements',
            'Strategic Insights',
            'Problem Statements'
          ]
        },
        {
          group: 'Cross-Referenced Knowledge',
          items: [
            'Related Idea Clusters',
            'Historical Context Links',
            'Similar Concept Mapping',
            'Contradiction Analysis',
            'Evolution Tracking',
            'Synthesis Opportunities'
          ]
        }
      ]
    },
    {
      label: 'Knowledge Integration',
      subStages: [
        {
          group: 'Module Distribution',
          items: [
            'Intellectual Capital Feeds',
            'R&D Project Seeds',
            'Marketing Content Ideas',
            'Product Feature Concepts',
            'Process Innovation Input',
            'Strategic Planning Input'
          ]
        },
        {
          group: 'Workflow Triggers',
          items: [
            'Patent Disclosure Initiators',
            'Research Project Starters',
            'Competitive Analysis Tasks',
            'Thought Leadership Topics',
            'Client Solution Concepts',
            'Partnership Opportunity Ideas'
          ]
        },
        {
          group: 'Long-term Archives',
          items: [
            'Historical Idea Evolution',
            'Prediction Accuracy Tracking',
            'Trend Pattern Analysis',
            'Successful Concept Origins',
            'Failed Idea Post-Mortems',
            'Timing Analysis Studies'
          ]
        }
      ]
    },
    {
      label: 'Collaboration Tools',
      subStages: [
        {
          group: 'Sharing & Review',
          items: [
            'Team Review Sessions',
            'Expert Validation Requests',
            'Peer Feedback Collection',
            'Cross-Functional Input',
            'Client Validation Tests',
            'External Expert Consultations'
          ]
        },
        {
          group: 'Iterative Development',
          items: [
            'Concept Refinement Cycles',
            'Hypothesis Testing',
            'Prototype Planning',
            'Feasibility Assessments',
            'Market Validation Steps',
            'Implementation Roadmaps'
          ]
        }
      ]
    },
    {
      label: 'Analytics & Insights',
      subStages: [
        {
          group: 'Pattern Recognition',
          items: [
            'Recurring Theme Analysis',
            'Innovation Pattern Mapping',
            'Cognitive Bias Detection',
            'Creative Peak Timing',
            'Environmental Factor Analysis',
            'Collaboration Effect Studies'
          ]
        },
        {
          group: 'Performance Metrics',
          items: [
            'Idea-to-Implementation Ratios',
            'Quality Score Tracking',
            'Time-to-Clarity Metrics',
            'Commercial Success Correlation',
            'Resource Efficiency Analysis',
            'ROI Prediction Models'
          ]
        }
      ]
    }
  ],
  salesStartupGrowth: [
    {
      label: 'Startup Launch Readiness',
      subStages: [
        {
          group: 'Foundation Setup',
          items: [
            'Legal Entity Formation',
            'Banking & Financial Setup',
            'Basic Brand Assets',
            'Domain & Email Setup',
            'Initial Product Demo',
            'Founder Story Development'
          ]
        },
        {
          group: 'Market Readiness Assessment',
          items: [
            'Target Customer Validation',
            'Problem-Solution Fit Check',
            'Competitive Landscape Analysis',
            'Value Proposition Clarity',
            'Pricing Strategy Foundation',
            'Go-to-Market Readiness Score'
          ]
        },
        {
          group: 'Minimum Viable Sales Stack',
          items: [
            'CRM Setup & Configuration',
            'Email Automation Setup',
            'Demo Environment Preparation',
            'Sales Collateral Creation',
            'Proposal Templates',
            'Contract Templates'
          ]
        }
      ]
    },
    {
      label: 'First Client Acquisition',
      subStages: [
        {
          group: 'Prospect Identification',
          items: [
            'Ideal Customer Profile Definition',
            'Target Account List Building',
            'Contact Discovery & Research',
            'Decision Maker Mapping',
            'Channel Strategy Selection',
            'Referral Network Activation'
          ]
        },
        {
          group: 'Outreach & Engagement',
          items: [
            'Cold Email Sequences',
            'LinkedIn Outreach Campaigns',
            'Content Marketing for Leads',
            'Network Leveraging Strategy',
            'Event & Conference Targeting',
            'Partnership Channel Development'
          ]
        },
        {
          group: 'Discovery & Qualification',
          items: [
            'Discovery Call Framework',
            'Pain Point Validation Process',
            'Budget Qualification Methods',
            'Timeline Assessment Tools',
            'Stakeholder Mapping',
            'Competitive Situation Analysis'
          ]
        },
        {
          group: 'Demo & Proof of Concept',
          items: [
            'Demo Customization Process',
            'Proof of Concept Planning',
            'Pilot Program Design',
            'Success Criteria Definition',
            'Feedback Collection Methods',
            'Objection Handling Scripts'
          ]
        },
        {
          group: 'Closing & Onboarding',
          items: [
            'Proposal Development Process',
            'Negotiation Strategy',
            'Contract Finalization',
            'Payment Terms Setup',
            'Client Onboarding Workflow',
            'Success Milestone Planning'
          ]
        }
      ]
    },
    {
      label: 'Sales Process Optimization',
      subStages: [
        {
          group: 'Performance Tracking',
          items: [
            'Sales Funnel Analytics',
            'Conversion Rate Monitoring',
            'Activity Metrics Tracking',
            'Deal Velocity Analysis',
            'Win/Loss Analysis',
            'Revenue Forecasting'
          ]
        },
        {
          group: 'Process Iteration',
          items: [
            'Sales Process Documentation',
            'Bottleneck Identification',
            'A/B Testing Framework',
            'Message Optimization',
            'Channel Effectiveness Review',
            'Customer Feedback Integration'
          ]
        },
        {
          group: 'Scaling Preparation',
          items: [
            'Sales Playbook Development',
            'Training Material Creation',
            'Quality Control Processes',
            'Lead Scoring Models',
            'Territory Planning',
            'Commission Structure Design'
          ]
        }
      ]
    },
    {
      label: 'Customer Success & Growth',
      subStages: [
        {
          group: 'Client Retention',
          items: [
            'Success Metric Tracking',
            'Regular Check-in Schedules',
            'Value Realization Reports',
            'Expansion Opportunity Identification',
            'Renewal Process Management',
            'Churn Risk Monitoring'
          ]
        },
        {
          group: 'Referral & Advocacy',
          items: [
            'Case Study Development',
            'Testimonial Collection',
            'Reference Program Setup',
            'Referral Incentive Design',
            'Success Story Marketing',
            'Client Advisory Board'
          ]
        },
        {
          group: 'Product Development Feedback',
          items: [
            'Feature Request Tracking',
            'User Behavior Analysis',
            'Product-Market Fit Assessment',
            'Roadmap Input Collection',
            'Beta Testing Programs',
            'Customer Co-creation'
          ]
        }
      ]
    },
    {
      label: 'Investment Readiness',
      subStages: [
        {
          group: 'Traction Metrics',
          items: [
            'Revenue Growth Tracking',
            'Customer Acquisition Metrics',
            'Market Size Validation',
            'Product-Market Fit Evidence',
            'Competitive Differentiation',
            'Unit Economics Modeling'
          ]
        },
        {
          group: 'Investor Materials',
          items: [
            'Pitch Deck Development',
            'Financial Model Creation',
            'Market Analysis Documentation',
            'Team & Advisory Board',
            'Technology Demo Preparation',
            'Due Diligence Data Room'
          ]
        },
        {
          group: 'Fundraising Process',
          items: [
            'Investor Target List',
            'Warm Introduction Strategy',
            'Pitch Meeting Preparation',
            'Term Sheet Negotiation',
            'Due Diligence Management',
            'Legal Documentation'
          ]
        },
        {
          group: 'Growth Planning',
          items: [
            'Scaling Strategy Development',
            'Team Expansion Planning',
            'Market Expansion Strategy',
            'Partnership Strategy',
            'Technology Roadmap',
            'Risk Mitigation Planning'
          ]
        }
      ]
    },
    {
      label: 'Startup Intelligence',
      subStages: [
        {
          group: 'Market Intelligence',
          items: [
            'Industry Trend Monitoring',
            'Competitor Analysis',
            'Customer Behavior Studies',
            'Technology Trend Tracking',
            'Regulatory Change Monitoring',
            'Economic Impact Assessment'
          ]
        },
        {
          group: 'Learning & Development',
          items: [
            'Founder Skill Development',
            'Industry Knowledge Building',
            'Network Expansion Strategy',
            'Mentor Relationship Management',
            'Peer Learning Groups',
            'Conference & Event Planning'
          ]
        },
        {
          group: 'Iteration Framework',
          items: [
            'Hypothesis Testing',
            'Rapid Experimentation',
            'Pivot Decision Framework',
            'Learning Documentation',
            'Success Pattern Recognition',
            'Failure Analysis Process'
          ]
        }
      ]
    }
  ]
};

export default folderLabelsByModule;
