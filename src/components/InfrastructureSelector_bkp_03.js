// InfrastructureSelector.js
import React, { useState } from 'react';
import styles from './InfrastructureSelector.module.css';
import {
  functions,
  crossFunctions,
  industries,
  decisionLayers,
  scopes,
  contextFilters,
  systemRequirements,
  stepTitles,
  getStepStatus,
  canProceed,
  getSelectedSummary,
  buildSelectionDescription
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
  const [teamSize, setTeamSize] = useState(null);
  const [budgetTier, setBudgetTier] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [fundingSource, setFundingSource] = useState(null);
  const [dataGovernance, setDataGovernance] = useState(null);
  const [itGovernance, setItGovernance] = useState(null);
  const [geographicScope, setGeographicScope] = useState(null);
  const [businessModel, setBusinessModel] = useState(null);
  const [performanceTier, setPerformanceTier] = useState(null);
  const [dataResidency, setDataResidency] = useState(null);
  const [internalExpertise, setInternalExpertise] = useState(null);
  const [deliveryModel, setDeliveryModel] = useState(null);
  const [dataMaturity, setDataMaturity] = useState(null);
  const [securityFramework, setSecurityFramework] = useState(null);
  const [auditRequirements, setAuditRequirements] = useState(null);

  // UI state - current step tracking
  const [currentStep, setCurrentStep] = useState(1);

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({});

  // Toggle section function
  const toggleSection = (sectionName) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Auto-collapse function when selection is made
  const handleSectionSelection = (sectionName, selectionFn, value) => {
    selectionFn(value);
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: true
    }));
  };

  const handleContinue = () => {
    const selection = {
      scope: selectedScope,
      decision: selectedDecision,
      function: selectedScope === 'functional' ? selectedFunction : selectedCrossFunction,
      industry: selectedIndustry,
      aiEnabled: aiEnabled,
      companyStage: companyStage,
      regulatoryComplexity: regulatoryComplexity,
      integrationApproach: integrationApproach,
      systemRequirements: {
        teamSize, budgetTier, timeline, fundingSource,
        dataGovernance, itGovernance, securityFramework, auditRequirements,
        geographicScope, businessModel, performanceTier, dataResidency,
        internalExpertise, deliveryModel, dataMaturity
      }
    };

    console.log('Infrastructure selection:', selection);

    if (onSelectionComplete) {
      onSelectionComplete(selection);
    } else {
      const description = buildSelectionDescription({
        selectedScope, selectedFunction, selectedCrossFunction, selectedDecision,
        selectedIndustry, companyStage, regulatoryComplexity, integrationApproach, aiEnabled
      });
      alert(description);
    }
  };

  const canFinalize = selectedScope && (selectedFunction || selectedCrossFunction) && selectedDecision;

  // Get current selections for summary
  const selections = {
    selectedScope, selectedFunction, selectedCrossFunction, selectedDecision,
    selectedIndustry, companyStage, aiEnabled
  };

  return (
    <div className={styles.container}>

      {/* Left Sidebar - Navigation & Progress */}
      <div className={styles.sidebar}>

        {/* Header */}
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>
            Infrastructure Builder
          </h2>
          <p className={styles.sidebarSubtitle}>
            Configure the sophisticated infrastructure parameters that power your executive-ready system
          </p>
        </div>

        {/* Navigation Steps */}
        <div className={styles.navigationSteps}>
          {[1, 2, 3, 4, 5].map(step => {
            const status = getStepStatus(step, selectedScope, selectedFunction, selectedCrossFunction, selectedDecision, currentStep);
            const summary = getSelectedSummary(step, selections);
            const isClickable = step === 1 || canProceed(step, selectedScope, selectedFunction, selectedCrossFunction, selectedDecision);

            return (
              <div
                key={step}
                onClick={() => isClickable && setCurrentStep(step)}
                className={`${styles.stepItem} ${
                  status === 'active' ? styles.active : 
                  isClickable ? styles.inactive : styles.disabled
                }`}
              >
                <div className={styles.stepHeader}>
                  <div className={`${styles.stepNumber} ${styles[status]}`}>
                    {status === 'completed' ? '✓' : step}
                  </div>
                  <span className={styles.stepLabel}>
                    {stepTitles[step]}
                  </span>
                </div>
                {summary && (
                  <div className={styles.stepSummary}>
                    {summary}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Selection Summary */}
        {canFinalize && (
          <div className={styles.currentSelection}>
            <h4 className={styles.currentSelectionTitle}>
              Current Selection
            </h4>
            <div className={styles.currentSelectionText}>
              {selectedScope === 'functional' && selectedFunction &&
                functions.find(f => f.id === selectedFunction)?.name
              }
              {selectedScope === 'cross-functional' && selectedCrossFunction &&
                crossFunctions.find(f => f.id === selectedCrossFunction)?.name
              }
              {' '}infrastructure for{' '}
              {decisionLayers.find(d => d.id === selectedDecision)?.name.toLowerCase()} decisions
              {selectedIndustry && (
                <span> in {industries.find(i => i.id === selectedIndustry)?.name.toLowerCase()}</span>
              )}
              {aiEnabled && <span className={styles.aiHighlight}> with AI</span>}
            </div>
          </div>
        )}

        {/* Continue Button */}
        {canFinalize && (
          <button
            onClick={handleContinue}
            className={styles.continueButton}
          >
            Build This Infrastructure
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        <div className={styles.contentCard}>

          {/* Step 1: Scope Selection */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <h1 className={styles.stepTitle}>
                What's the scope of your infrastructure?
              </h1>
              <p className={styles.stepDescription}>
                Choose whether you're building for a single function or across multiple departments
              </p>

              <div className={`${styles.selectionGrid} ${styles.selectionGridLarge}`}>
                {scopes.map(scope => (
                  <button
                    key={scope.id}
                    onClick={() => {
                      setSelectedScope(scope.id);
                      setSelectedFunction(null);
                      setSelectedCrossFunction(null);
                      // Auto-progress to next step
                      setTimeout(() => setCurrentStep(2), 300);
                    }}
                    className={`${styles.selectionCard} ${selectedScope === scope.id ? styles.selected : ''}`}
                  >
                    <div className={styles.cardTitle}>{scope.name}</div>
                    <div className={styles.cardDescription}>{scope.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Function Selection */}
          {currentStep === 2 && selectedScope && (
            <div className={styles.stepContent}>
              <h1 className={styles.stepTitle}>
                {selectedScope === 'functional' ? 'Which business function?' : 'Which cross-functional area?'}
              </h1>
              <p className={styles.stepDescription}>
                Select the primary area where you'll be building infrastructure
              </p>

              <div className={`${styles.selectionGrid} ${styles.selectionGridMedium}`}>
                {(selectedScope === 'functional' ? functions : crossFunctions).map(func => (
                  <button
                    key={func.id}
                    onClick={() => {
                      if (selectedScope === 'functional') {
                        setSelectedFunction(func.id);
                      } else {
                        setSelectedCrossFunction(func.id);
                      }
                      // Auto-progress to next step
                      setTimeout(() => setCurrentStep(3), 300);
                    }}
                    className={`${styles.selectionCardMedium} ${
                      (selectedScope === 'functional' ? selectedFunction : selectedCrossFunction) === func.id ? styles.selected : ''
                    }`}
                  >
                    <div className={styles.cardTitleMedium}>{func.name}</div>
                    <div className={styles.cardDescriptionMedium}>{func.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Decision Layer */}
          {currentStep === 3 && selectedScope && (selectedFunction || selectedCrossFunction) && (
            <div className={styles.stepContent}>
              <h1 className={styles.stepTitle}>
                What type of decisions will this support?
              </h1>
              <p className={styles.stepDescription}>
                Choose the decision-making level this infrastructure will primarily serve
              </p>

              <div className={`${styles.selectionGrid} ${styles.selectionGridSmall}`}>
                {decisionLayers.map(layer => (
                  <button
                    key={layer.id}
                    onClick={() => {
                      setSelectedDecision(layer.id);
                      // Auto-progress to next step
                      setTimeout(() => setCurrentStep(4), 300);
                    }}
                    className={`${styles.selectionCardSmall} ${selectedDecision === layer.id ? styles.selected : ''}`}
                  >
                    <div className={styles.cardTitleSmall}>{layer.name}</div>
                    <div className={styles.cardDescriptionSmall}>{layer.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Context Filters */}
          {currentStep === 4 && canFinalize && (
            <div className={styles.stepContent}>
              <h1 className={styles.stepTitle}>
                Context & Customization
              </h1>
              <p className={styles.stepDescription}>
                Optional: Add specific context to customize your infrastructure approach
              </p>

              {/* Industry Filter */}
              <div className={`${styles.contextSection} ${collapsedSections.industry ? styles.contextSectionCollapsed : ''}`}>
                <div className={styles.contextSectionHeader} onClick={() => toggleSection('industry')}>
                  <div>
                    <h3 className={styles.contextTitle}>Industry</h3>
                    {collapsedSections.industry && selectedIndustry && (
                      <div className={styles.selectedValue}>
                        {industries.find(i => i.id === selectedIndustry)?.name}
                      </div>
                    )}
                  </div>
                  <button className={`${styles.toggleButton} ${!collapsedSections.industry ? styles.expanded : ''}`}>
                    ▼
                  </button>
                </div>
                <div className={`${styles.contextGrid} ${styles.contextGridSmall}`}>
                  {industries.map(industry => (
                    <button
                      key={industry.id}
                      onClick={() => handleSectionSelection('industry', setSelectedIndustry, selectedIndustry === industry.id ? null : industry.id)}
                      className={`${styles.contextCard} ${selectedIndustry === industry.id ? styles.selected : ''}`}
                    >
                      {industry.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Company Stage */}
              <div className={`${styles.contextSection} ${collapsedSections.companyStage ? styles.contextSectionCollapsed : ''}`}>
                <div className={styles.contextSectionHeader} onClick={() => toggleSection('companyStage')}>
                  <div>
                    <h3 className={styles.contextTitle}>Company Stage</h3>
                    {collapsedSections.companyStage && companyStage && (
                      <div className={styles.selectedValue}>
                        {contextFilters.companyStage.find(s => s.id === companyStage)?.name}
                      </div>
                    )}
                  </div>
                  <button className={`${styles.toggleButton} ${!collapsedSections.companyStage ? styles.expanded : ''}`}>
                    ▼
                  </button>
                </div>
                <div className={`${styles.contextGrid} ${styles.contextGridMedium}`}>
                  {contextFilters.companyStage.map(stage => (
                    <button
                      key={stage.id}
                      onClick={() => handleSectionSelection('companyStage', setCompanyStage, companyStage === stage.id ? null : stage.id)}
                      className={`${styles.contextCard} ${companyStage === stage.id ? styles.selected : ''}`}
                    >
                      {stage.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Regulatory Complexity */}
              <div className={`${styles.contextSection} ${collapsedSections.regulatory ? styles.contextSectionCollapsed : ''}`}>
                <div className={styles.contextSectionHeader} onClick={() => toggleSection('regulatory')}>
                  <div>
                    <h3 className={styles.contextTitle}>Regulatory Complexity</h3>
                    {collapsedSections.regulatory && regulatoryComplexity && (
                      <div className={styles.selectedValue}>
                        {contextFilters.regulatoryComplexity.find(r => r.id === regulatoryComplexity)?.name}
                      </div>
                    )}
                  </div>
                  <button className={`${styles.toggleButton} ${!collapsedSections.regulatory ? styles.expanded : ''}`}>
                    ▼
                  </button>
                </div>
                <div className={`${styles.contextGrid} ${styles.contextGridLarge}`}>
                  {contextFilters.regulatoryComplexity.map(regulatory => (
                    <button
                      key={regulatory.id}
                      onClick={() => handleSectionSelection('regulatory', setRegulatoryComplexity, regulatoryComplexity === regulatory.id ? null : regulatory.id)}
                      className={`${styles.contextCard} ${regulatoryComplexity === regulatory.id ? styles.selected : ''}`}
                    >
                      {regulatory.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Integration Approach */}
              <div className={`${styles.contextSection} ${collapsedSections.integration ? styles.contextSectionCollapsed : ''}`}>
                <div className={styles.contextSectionHeader} onClick={() => toggleSection('integration')}>
                  <div>
                    <h3 className={styles.contextTitle}>Integration Approach</h3>
                    {collapsedSections.integration && integrationApproach && (
                      <div className={styles.selectedValue}>
                        {contextFilters.integrationApproach.find(i => i.id === integrationApproach)?.name}
                      </div>
                    )}
                  </div>
                  <button className={`${styles.toggleButton} ${!collapsedSections.integration ? styles.expanded : ''}`}>
                    ▼
                  </button>
                </div>
                <div className={`${styles.contextGrid} ${styles.contextGridLarge}`}>
                  {contextFilters.integrationApproach.map(integration => (
                    <button
                      key={integration.id}
                      onClick={() => handleSectionSelection('integration', setIntegrationApproach, integrationApproach === integration.id ? null : integration.id)}
                      className={`${styles.contextCard} ${integrationApproach === integration.id ? styles.selected : ''}`}
                    >
                      {integration.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Enhancement */}
              <div className={styles.contextSection}>
                <h3 className={styles.contextTitle}>Enhancement</h3>
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

          {/* Step 5: System Requirements */}
          {currentStep === 5 && canFinalize && (
            <div className={styles.stepContent}>
              <h1 className={styles.stepTitle}>
                System Requirements
              </h1>
              <p className={styles.stepDescription}>
                Configure the sophisticated infrastructure parameters that power your executive-ready system
              </p>

              <div className={styles.systemRequirements}>

                {/* Scale & Resources */}
                <div className={styles.systemRequirementsGroup}>
                  <h3 className={styles.systemRequirementsGroupTitle}>
                    Scale & Resources
                  </h3>

                  <div className={`${styles.systemRequirementsGrid} ${styles.systemRequirementsGridSmall}`}>
                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Team Size</label>
                      <select
                        value={teamSize || ''}
                        onChange={(e) => setTeamSize(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.scaleResources.teamSize.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Budget Tier</label>
                      <select
                        value={budgetTier || ''}
                        onChange={(e) => setBudgetTier(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.scaleResources.budgetTier.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Timeline</label>
                      <select
                        value={timeline || ''}
                        onChange={(e) => setTimeline(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.scaleResources.timeline.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Funding Source</label>
                      <select
                        value={fundingSource || ''}
                        onChange={(e) => setFundingSource(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.scaleResources.fundingSource.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Governance & Compliance */}
                <div className={styles.systemRequirementsGroup}>
                  <h3 className={styles.systemRequirementsGroupTitle}>
                    Governance & Compliance
                  </h3>

                  <div className={`${styles.systemRequirementsGrid} ${styles.systemRequirementsGridMedium}`}>
                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Data Governance</label>
                      <select
                        value={dataGovernance || ''}
                        onChange={(e) => setDataGovernance(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.governanceCompliance.dataGovernance.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>IT Governance</label>
                      <select
                        value={itGovernance || ''}
                        onChange={(e) => setItGovernance(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.governanceCompliance.itGovernance.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Security Framework</label>
                      <select
                        value={securityFramework || ''}
                        onChange={(e) => setSecurityFramework(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.governanceCompliance.securityFramework.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Audit Requirements</label>
                      <select
                        value={auditRequirements || ''}
                        onChange={(e) => setAuditRequirements(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.governanceCompliance.auditRequirements.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Market & Operations */}
                <div className={styles.systemRequirementsGroup}>
                  <h3 className={styles.systemRequirementsGroupTitle}>
                    Market & Operations
                  </h3>

                  <div className={`${styles.systemRequirementsGrid} ${styles.systemRequirementsGridSmall}`}>
                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Geographic Scope</label>
                      <select
                        value={geographicScope || ''}
                        onChange={(e) => setGeographicScope(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.marketOperations.geographicScope.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Business Model</label>
                      <select
                        value={businessModel || ''}
                        onChange={(e) => setBusinessModel(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.marketOperations.businessModel.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Performance Tier</label>
                      <select
                        value={performanceTier || ''}
                        onChange={(e) => setPerformanceTier(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.marketOperations.performanceTier.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Data Residency</label>
                      <select
                        value={dataResidency || ''}
                        onChange={(e) => setDataResidency(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.marketOperations.dataResidency.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Technical Capability & Maturity */}
                <div className={styles.systemRequirementsGroup}>
                  <h3 className={styles.systemRequirementsGroupTitle}>
                    Technical Capability & Maturity
                  </h3>

                  <div className={`${styles.systemRequirementsGrid} ${styles.systemRequirementsGridMedium}`}>
                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Internal Expertise</label>
                      <select
                        value={internalExpertise || ''}
                        onChange={(e) => setInternalExpertise(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.technicalCapability.internalExpertise.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Delivery Model</label>
                      <select
                        value={deliveryModel || ''}
                        onChange={(e) => setDeliveryModel(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.technicalCapability.deliveryModel.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.systemRequirementsField}>
                      <label className={styles.systemRequirementsLabel}>Data Maturity</label>
                      <select
                        value={dataMaturity || ''}
                        onChange={(e) => setDataMaturity(e.target.value || null)}
                        className={styles.systemRequirementsSelect}
                      >
                        <option value="">Select</option>
                        {systemRequirements.technicalCapability.dataMaturity.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InfrastructureSelector;