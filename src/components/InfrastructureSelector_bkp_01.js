// InfrastructureSelector.js
import React, { useState } from 'react';
import styles from './InfrastructureSelector.module.css';
import {
  functions,
  crossFunctions,
  industries,
  decisionLayers,
  scopes,
  systemRequirements,
  contextFilters,
  findItemById,
  findSystemRequirementLabel,
  buildSelectionSummary
} from '../utils/infrastructureConfig';

const InfrastructureSelector = ({ onSelectionComplete }) => {
  // Core selection state
  const [selectedScope, setSelectedScope] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [selectedCrossFunction, setSelectedCrossFunction] = useState(null);

  // Context filter state
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [companyStage, setCompanyStage] = useState(null);
  const [regulatoryComplexity, setRegulatoryComplexity] = useState(null);
  const [integrationApproach, setIntegrationApproach] = useState(null);

  // Advanced system requirements state
  const [showSystemRequirements, setShowSystemRequirements] = useState(false);
  const [teamSize, setTeamSize] = useState(null);
  const [budgetTier, setBudgetTier] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [fundingSource, setFundingSource] = useState(null);
  const [dataGovernance, setDataGovernance] = useState(null);
  const [securityFramework, setSecurityFramework] = useState(null);
  const [auditRequirements, setAuditRequirements] = useState(null);
  const [itGovernance, setItGovernance] = useState(null);
  const [geographicScope, setGeographicScope] = useState(null);
  const [businessModel, setBusinessModel] = useState(null);
  const [performanceTier, setPerformanceTier] = useState(null);
  const [dataResidency, setDataResidency] = useState(null);
  const [internalExpertise, setInternalExpertise] = useState(null);
  const [deliveryModel, setDeliveryModel] = useState(null);
  const [dataMaturity, setDataMaturity] = useState(null);
  const [integrationComplexity, setIntegrationComplexity] = useState(null);

  // UI state
  const [expandedSection, setExpandedSection] = useState('scope');

  const handleContinue = () => {
    const selection = {
      // Core taxonomy
      scope: selectedScope,
      decision: selectedDecision,
      function: selectedScope === 'functional' ? selectedFunction : selectedCrossFunction,

      // Context filters
      industry: selectedIndustry,
      aiEnabled: aiEnabled,
      companyStage: companyStage,
      regulatoryComplexity: regulatoryComplexity,
      integrationApproach: integrationApproach,

      // System requirements
      systemRequirements: {
        teamSize,
        budgetTier,
        timeline,
        fundingSource,
        dataGovernance,
        itGovernance,
        geographicScope,
        businessModel,
        performanceTier,
        internalExpertise,
        deliveryModel,
        dataMaturity
      }
    };

    console.log('Infrastructure selection:', selection);

    if (onSelectionComplete) {
      onSelectionComplete(selection);
    } else {
      const description = buildSelectionSummary(selection);
      alert(description);
    }
  };

  const canContinue = selectedScope && selectedDecision &&
    ((selectedScope === 'functional' && selectedFunction) ||
     (selectedScope === 'cross-functional' && selectedCrossFunction));

  const renderSelectionSummary = (title, description) => (
    <div className={styles.selectionSummary}>
      <div className={styles.selectionTitle}>{title}</div>
      <div className={styles.selectionDescription}>{description}</div>
    </div>
  );

  const renderSystemRequirementsDropdown = (category, field, label, options, value, setValue) => (
    <div className={styles.systemRequirementsField}>
      <label className={styles.systemRequirementsLabel}>{label}</label>
      <select
        value={value || ''}
        onChange={(e) => setValue(e.target.value || null)}
        className={styles.systemRequirementsSelect}
      >
        <option value="">Select</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            What type of infrastructure are you building?
          </h1>
          <p className={styles.subtitle}>
            Choose your scope and decision type to access the right tools
          </p>
        </div>

        {/* Step 1: Scope Selection */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              1. What's the scope of your infrastructure?
            </h3>
            {selectedScope && expandedSection !== 'scope' && (
              <button
                onClick={() => setExpandedSection('scope')}
                className={styles.changeButton}
              >
                Change
              </button>
            )}
          </div>

          {selectedScope && expandedSection !== 'scope' ? (
            renderSelectionSummary(
              scopes.find(s => s.id === selectedScope)?.name,
              scopes.find(s => s.id === selectedScope)?.description
            )
          ) : (
            <div className={`${styles.cardGrid} ${styles.cardGridLarge}`}>
              {scopes.map(scope => (
                <button
                  key={scope.id}
                  onClick={() => {
                    setSelectedScope(scope.id);
                    setSelectedFunction(null);
                    setSelectedCrossFunction(null);
                    setExpandedSection('function');
                  }}
                  className={`${styles.selectionCard} ${selectedScope === scope.id ? styles.selected : ''}`}
                >
                  <div className={styles.cardTitle}>{scope.name}</div>
                  <div className={styles.cardDescription}>{scope.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Function Selection */}
        {selectedScope === 'functional' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                2. Which business function?
              </h3>
              {selectedFunction && expandedSection !== 'function' && (
                <button
                  onClick={() => setExpandedSection('function')}
                  className={styles.changeButton}
                >
                  Change
                </button>
              )}
            </div>

            {selectedFunction && expandedSection !== 'function' ? (
              renderSelectionSummary(
                functions.find(f => f.id === selectedFunction)?.name,
                functions.find(f => f.id === selectedFunction)?.description
              )
            ) : (
              <div className={`${styles.cardGrid} ${styles.cardGridLarge}`}>
                {functions.map(func => (
                  <button
                    key={func.id}
                    onClick={() => {
                      setSelectedFunction(func.id);
                      setExpandedSection('decision');
                    }}
                    className={`${styles.selectionCardSmall} ${selectedFunction === func.id ? styles.selected : ''}`}
                  >
                    <div className={styles.cardTitleSmall}>{func.name}</div>
                    <div className={styles.cardDescriptionSmall}>{func.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Cross-Function Selection */}
        {selectedScope === 'cross-functional' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                2. Which cross-functional area?
              </h3>
              {selectedCrossFunction && expandedSection !== 'function' && (
                <button
                  onClick={() => setExpandedSection('function')}
                  className={styles.changeButton}
                >
                  Change
                </button>
              )}
            </div>

            {selectedCrossFunction && expandedSection !== 'function' ? (
              renderSelectionSummary(
                crossFunctions.find(f => f.id === selectedCrossFunction)?.name,
                crossFunctions.find(f => f.id === selectedCrossFunction)?.description
              )
            ) : (
              <div className={`${styles.cardGrid} ${styles.cardGridLarge}`}>
                {crossFunctions.map(func => (
                  <button
                    key={func.id}
                    onClick={() => {
                      setSelectedCrossFunction(func.id);
                      setExpandedSection('decision');
                    }}
                    className={`${styles.selectionCardSmall} ${selectedCrossFunction === func.id ? styles.selected : ''}`}
                  >
                    <div className={styles.cardTitleSmall}>{func.name}</div>
                    <div className={styles.cardDescriptionSmall}>{func.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Decision Layer Selection */}
        {selectedScope && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                3. What type of decisions will this support?
              </h3>
              {selectedDecision && expandedSection !== 'decision' && (
                <button
                  onClick={() => setExpandedSection('decision')}
                  className={styles.changeButton}
                >
                  Change
                </button>
              )}
            </div>

            {selectedDecision && expandedSection !== 'decision' ? (
              renderSelectionSummary(
                decisionLayers.find(d => d.id === selectedDecision)?.name,
                decisionLayers.find(d => d.id === selectedDecision)?.description
              )
            ) : (
              <div className={`${styles.cardGrid} ${styles.cardGridMedium}`}>
                {decisionLayers.map(layer => (
                  <button
                    key={layer.id}
                    onClick={() => {
                      setSelectedDecision(layer.id);
                      setExpandedSection('context');
                    }}
                    className={`${styles.selectionCardSmall} ${selectedDecision === layer.id ? styles.selected : ''}`}
                  >
                    <div className={styles.cardTitleSmall}>{layer.name}</div>
                    <div className={styles.cardDescriptionSmall}>{layer.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Context Filters */}
        {canContinue && (
          <div className={styles.contextSection}>
            <h3 className={styles.contextTitle}>4. Context (optional)</h3>
            <p className={styles.contextSubtitle}>
              Add specific context to customize your infrastructure approach
            </p>

            {/* Industry Filter */}
            <div className={styles.contextGroup}>
              <h4 className={styles.contextGroupTitle}>Industry</h4>
              <div className={`${styles.cardGrid} ${styles.cardGridSmall}`}>
                {industries.map(industry => (
                  <button
                    key={industry.id}
                    onClick={() => setSelectedIndustry(selectedIndustry === industry.id ? null : industry.id)}
                    className={`${styles.contextCard} ${selectedIndustry === industry.id ? styles.selected : ''}`}
                  >
                    <div className={styles.contextCardTitle}>{industry.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Company Stage Filter */}
            <div className={styles.contextGroup}>
              <h4 className={styles.contextGroupTitle}>Company Stage</h4>
              <div className={`${styles.cardGrid} ${styles.cardGridSmall}`}>
                {contextFilters.companyStage.map(stage => (
                  <button
                    key={stage.id}
                    onClick={() => setCompanyStage(companyStage === stage.id ? null : stage.id)}
                    className={`${styles.contextCard} ${companyStage === stage.id ? styles.selected : ''}`}
                  >
                    <div className={styles.contextCardTitle}>{stage.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Regulatory Complexity Filter */}
            <div className={styles.contextGroup}>
              <h4 className={styles.contextGroupTitle}>Regulatory Complexity</h4>
              <div className={`${styles.cardGrid} ${styles.cardGridSmall}`}>
                {contextFilters.regulatoryComplexity.map(regulatory => (
                  <button
                    key={regulatory.id}
                    onClick={() => setRegulatoryComplexity(regulatoryComplexity === regulatory.id ? null : regulatory.id)}
                    className={`${styles.contextCard} ${regulatoryComplexity === regulatory.id ? styles.selected : ''}`}
                  >
                    <div className={styles.contextCardTitle}>{regulatory.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Integration Approach Filter */}
            <div className={styles.contextGroup}>
              <h4 className={styles.contextGroupTitle}>Integration Approach</h4>
              <div className={`${styles.cardGrid} ${styles.cardGridSmall}`}>
                {contextFilters.integrationApproach.map(integration => (
                  <button
                    key={integration.id}
                    onClick={() => setIntegrationApproach(integrationApproach === integration.id ? null : integration.id)}
                    className={`${styles.contextCard} ${integrationApproach === integration.id ? styles.selected : ''}`}
                  >
                    <div className={styles.contextCardTitle}>{integration.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Enhancement Toggle */}
            <div className={styles.contextGroup}>
              <h4 className={styles.contextGroupTitle}>Enhancement</h4>
              <label className={styles.aiToggle}>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className={styles.aiCheckbox}
                />
                Include AI & Automation capabilities
              </label>
            </div>
          </div>
        )}

        {/* System Requirements Section */}
        {canContinue && (
          <div className={styles.section}>
            <div className={styles.systemRequirements}>
              <button
                onClick={() => setShowSystemRequirements(!showSystemRequirements)}
                className={styles.systemRequirementsHeader}
              >
                <span>System Requirements</span>
                <span className={`${styles.systemRequirementsArrow} ${showSystemRequirements ? styles.expanded : ''}`}>
                  ▼
                </span>
              </button>

              <p className={styles.systemRequirementsDescription}>
                Configure the sophisticated infrastructure parameters that power your executive-ready system
              </p>

              {showSystemRequirements && (
                <div className={styles.systemRequirementsContent}>

                  {/* Scale & Resources */}
                  <div className={styles.systemRequirementsGroup}>
                    <h5 className={styles.systemRequirementsGroupTitle}>
                      Scale & Resources
                    </h5>

                    <div className={styles.systemRequirementsGrid}>
                      {renderSystemRequirementsDropdown(
                        'scaleResources', 'teamSize', 'Team Size',
                        systemRequirements.scaleResources.teamSize, teamSize, setTeamSize
                      )}
                      {renderSystemRequirementsDropdown(
                        'scaleResources', 'budgetTier', 'Budget Tier',
                        systemRequirements.scaleResources.budgetTier, budgetTier, setBudgetTier
                      )}
                      {renderSystemRequirementsDropdown(
                        'scaleResources', 'timeline', 'Timeline',
                        systemRequirements.scaleResources.timeline, timeline, setTimeline
                      )}
                      {renderSystemRequirementsDropdown(
                        'scaleResources', 'fundingSource', 'Funding Source',
                        systemRequirements.scaleResources.fundingSource, fundingSource, setFundingSource
                      )}
                    </div>
                  </div>

                  {/* Governance & Compliance */}
                  <div className={styles.systemRequirementsGroup}>
                    <h5 className={styles.systemRequirementsGroupTitle}>
                      Governance & Compliance
                    </h5>

                    <div className={`${styles.systemRequirementsGrid} ${styles.systemRequirementsGridWide}`}>
                      {renderSystemRequirementsDropdown(
                        'governanceCompliance', 'dataGovernance', 'Data Governance',
                        systemRequirements.governanceCompliance.dataGovernance, dataGovernance, setDataGovernance
                      )}
                      {renderSystemRequirementsDropdown(
                        'governanceCompliance', 'itGovernance', 'IT Governance',
                        systemRequirements.governanceCompliance.itGovernance, itGovernance, setItGovernance
                      )}
                    </div>
                  </div>

                  {/* Market & Operations */}
                  <div className={styles.systemRequirementsGroup}>
                    <h5 className={styles.systemRequirementsGroupTitle}>
                      Market & Operations
                    </h5>

                    <div className={styles.systemRequirementsGrid}>
                      {renderSystemRequirementsDropdown(
                        'marketOperations', 'geographicScope', 'Geographic Scope',
                        systemRequirements.marketOperations.geographicScope, geographicScope, setGeographicScope
                      )}
                      {renderSystemRequirementsDropdown(
                        'marketOperations', 'businessModel', 'Business Model',
                        systemRequirements.marketOperations.businessModel, businessModel, setBusinessModel
                      )}
                      {renderSystemRequirementsDropdown(
                        'marketOperations', 'performanceTier', 'Performance Tier',
                        systemRequirements.marketOperations.performanceTier, performanceTier, setPerformanceTier
                      )}
                    </div>
                  </div>

                  {/* Technical Capability & Maturity */}
                  <div className={styles.systemRequirementsGroup}>
                    <h5 className={styles.systemRequirementsGroupTitle}>
                      Technical Capability & Maturity
                    </h5>

                    <div className={`${styles.systemRequirementsGrid} ${styles.systemRequirementsGridWide}`}>
                      {renderSystemRequirementsDropdown(
                        'technicalCapability', 'internalExpertise', 'Internal Expertise',
                        systemRequirements.technicalCapability.internalExpertise, internalExpertise, setInternalExpertise
                      )}
                      {renderSystemRequirementsDropdown(
                        'technicalCapability', 'deliveryModel', 'Delivery Model',
                        systemRequirements.technicalCapability.deliveryModel, deliveryModel, setDeliveryModel
                      )}
                      {renderSystemRequirementsDropdown(
                        'technicalCapability', 'dataMaturity', 'Data Maturity',
                        systemRequirements.technicalCapability.dataMaturity, dataMaturity, setDataMaturity
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className={styles.continueSection}>
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={styles.continueButton}
          >
            {canContinue ? 'Build This Infrastructure' : 'Complete Your Selection'}
          </button>
        </div>

        {/* Selection Summary */}
        {canContinue && (
          <div className={styles.finalSummary}>
            <div className={styles.finalSummaryLabel}>
              You're building:
            </div>
            <div className={styles.finalSummaryText}>
              {selectedScope === 'functional' && selectedFunction &&
                functions.find(f => f.id === selectedFunction)?.name
              }
              {selectedScope === 'cross-functional' && selectedCrossFunction &&
                crossFunctions.find(f => f.id === selectedCrossFunction)?.name
              }
              {' '}
              infrastructure for{' '}
              {decisionLayers.find(d => d.id === selectedDecision)?.name.toLowerCase()} decisions
              {selectedIndustry && (
                <span className={styles.finalSummaryMuted}>
                  {' '}in {industries.find(i => i.id === selectedIndustry)?.name.toLowerCase()}
                </span>
              )}
              {companyStage && (
                <span className={styles.finalSummaryMuted}>
                  {', '}{companyStage}-stage
                </span>
              )}
              {regulatoryComplexity && (
                <span className={styles.finalSummaryMuted}>
                  {', '}{regulatoryComplexity.replace('-', ' ')} compliance
                </span>
              )}
              {integrationApproach && (
                <span className={styles.finalSummaryMuted}>
                  {', '}{integrationApproach.replace('-', ' ')} approach
                </span>
              )}
              {aiEnabled && (
                <span className={styles.finalSummaryHighlight}> with AI enhancement</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfrastructureSelector;