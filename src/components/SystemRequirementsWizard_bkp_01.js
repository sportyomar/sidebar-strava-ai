// SystemRequirementsWizard.js
import React, { useState } from 'react';
import styles from './SystemRequirementsWizard.module.css';
import {
  templates,
  systemRequirements,
  stepInfo,
  fieldLabels,
  fieldDescriptions
} from '../utils/systemRequirementsConfig';

const SystemRequirementsWizard = ({
  onComplete,
  onBack,
  initialValues = {}
}) => {
  // Current wizard step
  const [currentStep, setCurrentStep] = useState(1);

  // Selections state
  const [selections, setSelections] = useState({
    // Project Settings
    teamSize: null,
    budgetTier: null,
    timeline: null,
    fundingSource: null,

    // Organizational Settings
    dataGovernance: null,
    itGovernance: null,
    securityFramework: null,
    auditRequirements: null,

    // Market Settings
    geographicScope: null,
    businessModel: null,
    performanceTier: null,
    dataResidency: null,

    // Technical Settings
    internalExpertise: null,
    deliveryModel: null,
    dataMaturity: null,

    // Override with any initial values
    ...initialValues
  });

  // Individual field skip state
  const [skippedFields, setSkippedFields] = useState({});

  // Template usage state
  const [useTemplate, setUseTemplate] = useState({});

  // Show more state for each field
  const [showMore, setShowMore] = useState({});

  // Show template selection for skipped first field
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);

  const handleSelection = (field, value) => {
    setSelections(prev => ({
      ...prev,
      [field]: prev[field] === value ? null : value
    }));

    // Remove skip status when making a selection
    if (skippedFields[field]) {
      setSkippedFields(prev => ({
        ...prev,
        [field]: false
      }));
    }
  };

  const handleSkipField = (field) => {
    setSkippedFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));

    // Clear selection when skipping
    if (!skippedFields[field]) {
      setSelections(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // If skipping the first field, show template selection
    const currentFields = stepInfo[currentStep].fields;
    if (field === currentFields[0] && !skippedFields[field]) {
      setShowTemplateSelection(true);
    }
  };

  const handleUseTemplate = (category, templateKey) => {
    const template = templates[category][templateKey];
    if (template) {
      setSelections(prev => ({
        ...prev,
        ...template.values
      }));

      // Clear any skipped fields that are in the template
      setSkippedFields(prev => {
        const newSkipped = { ...prev };
        Object.keys(template.values).forEach(field => {
          newSkipped[field] = false;
        });
        return newSkipped;
      });

      setShowTemplateSelection(false);
    }
  };

  const handleSkipAllSection = () => {
    const currentFields = stepInfo[currentStep].fields;
    setSkippedFields(prev => {
      const newSkipped = { ...prev };
      currentFields.forEach(field => {
        newSkipped[field] = true;
      });
      return newSkipped;
    });

    setSelections(prev => {
      const newSelections = { ...prev };
      currentFields.forEach(field => {
        newSelections[field] = null;
      });
      return newSelections;
    });

    setShowTemplateSelection(false);
  };

  const toggleShowMore = (field) => {
    setShowMore(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getSelectedLabel = (field) => {
    const value = selections[field];
    if (!value) return null;

    const category = stepInfo[currentStep].category;
    const fieldData = systemRequirements[category][field];
    const allOptions = [...fieldData.common, ...fieldData.edge];
    const option = allOptions.find(opt => opt.value === value);
    return option?.label;
  };

  const getSuggestedTemplate = () => {
    const category = stepInfo[currentStep].category;
    const currentFields = stepInfo[currentStep].fields;
    const firstField = currentFields[0];
    const firstSelection = selections[firstField];

    if (!firstSelection) return null;

    // Find matching template based on first selection
    const categoryTemplates = templates[category];
    for (const [key, template] of Object.entries(categoryTemplates)) {
      if (template.values[firstField] === firstSelection) {
        return { key, ...template };
      }
    }

    return null;
  };

  const canProceed = () => {
    const currentFields = stepInfo[currentStep]?.fields || [];
    return currentFields.some(field => selections[field] !== null || skippedFields[field]);
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      setShowTemplateSelection(false);
    } else {
      // Complete the wizard
      const result = {
        selections: { ...selections },
        skippedFields: { ...skippedFields }
      };
      if (onComplete) {
        onComplete(result);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setShowTemplateSelection(false);
    } else {
      // Back to main infrastructure selector
      if (onBack) {
        onBack();
      }
    }
  };

  const handleStepClick = (step) => {
    // Only allow clicking on current, previous, or next step
    if (step === currentStep || step === currentStep - 1 || (step === currentStep + 1 && canProceed())) {
      setCurrentStep(step);
      setShowTemplateSelection(false);
    }
  };

  const getStepStatus = (step) => {
    const stepFields = stepInfo[step]?.fields || [];
    const hasSelections = stepFields.some(field => selections[field] !== null);
    const hasSkipped = stepFields.some(field => skippedFields[field]);
    const isCompleted = stepFields.every(field => selections[field] !== null || skippedFields[field]);

    if (step === currentStep) return 'current';
    if (isCompleted) return 'completed';
    if (hasSelections || hasSkipped) return 'partial';
    return 'pending';
  };

  const getNavigationLabel = (direction) => {
    if (direction === 'back' && currentStep > 1) {
      return `← ${stepInfo[currentStep - 1].title}`;
    }
    if (direction === 'back' && currentStep === 1) {
      return '← Infrastructure Settings';
    }
    if (direction === 'next' && currentStep < 4) {
      return `${stepInfo[currentStep + 1].title} →`;
    }
    if (direction === 'next' && currentStep === 4) {
      return 'Complete';
    }
    return direction === 'back' ? '← Back' : 'Next →';
  };

  const renderField = (field) => {
    const category = stepInfo[currentStep].category;
    const fieldData = systemRequirements[category][field];
    const isShowingMore = showMore[field];
    const hasEdgeCases = fieldData.edge.length > 0;
    const currentSelection = selections[field];
    const selectedLabel = getSelectedLabel(field);
    const isSkipped = skippedFields[field];

    if (isSkipped) {
      return (
        <div key={field} className={styles.fieldContainer}>
          <div className={styles.fieldHeaderSkipped}>
            <div>
              <label className={styles.fieldLabelSkipped}>
                {fieldLabels[field]}
              </label>
              <div className={styles.skippedIndicator}>
                Skipped
              </div>
            </div>
            <button
              onClick={() => handleSkipField(field)}
              className={styles.configureButton}
            >
              Configure
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={field} className={styles.fieldContainer}>
        <div className={styles.fieldHeader}>
          <div className={styles.fieldTitleSection}>
            <div>
              <label className={styles.fieldLabel}>
                {fieldLabels[field]}
              </label>
              {selectedLabel && (
                <div className={styles.selectedIndicator}>
                  Selected: {selectedLabel}
                </div>
              )}
            </div>
            <button
              onClick={() => handleSkipField(field)}
              className={styles.skipButton}
            >
              Skip
            </button>
          </div>
          <p className={styles.fieldDescription}>
            {fieldDescriptions[field]}
          </p>
        </div>

        <div className={styles.optionsContainer}>
          {fieldData.common.map(option => (
            <button
              key={option.value}
              onClick={() => handleSelection(field, option.value)}
              className={`${styles.optionButton} ${
                currentSelection === option.value ? styles.optionButtonSelected : ''
              }`}
            >
              <span className={styles.optionLabel}>
                {option.label}
              </span>
            </button>
          ))}

          {hasEdgeCases && (
            <div>
              {!isShowingMore ? (
                <button
                  onClick={() => toggleShowMore(field)}
                  className={styles.showMoreButton}
                >
                  Show more options ({fieldData.edge.length})
                </button>
              ) : (
                <div className={styles.edgeOptionsContainer}>
                  {fieldData.edge.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleSelection(field, option.value)}
                      className={`${styles.optionButton} ${
                        currentSelection === option.value ? styles.optionButtonSelected : ''
                      }`}
                    >
                      <span className={styles.optionLabel}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => toggleShowMore(field)}
                    className={styles.showFewerButton}
                  >
                    Show fewer options
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNavigationButtons = () => (
    <div className={styles.navigationContainer}>
      <button
        onClick={handleBack}
        className={`${styles.navButton} ${styles.backButton} ${
          currentStep === 1 ? styles.navButtonDisabled : ''
        }`}
      >
        {getNavigationLabel('back')}
      </button>

      <button
        onClick={handleNext}
        className={`${styles.navButton} ${
          currentStep === 4 
            ? styles.completeButton
            : canProceed()
            ? styles.nextButton
            : styles.navButtonDisabled
        }`}
      >
        {getNavigationLabel('next')}
      </button>
    </div>
  );

  const renderStatusSummary = () => {
    const allFields = Object.keys(fieldLabels);
    const selectedFields = allFields.filter(field => selections[field] !== null);
    const skippedFieldsList = allFields.filter(field => skippedFields[field]);

    if (selectedFields.length === 0 && skippedFieldsList.length === 0) return null;

    return (
      <div className={styles.statusSummary}>
        <h4 className={styles.statusTitle}>Current Status:</h4>

        {selectedFields.length > 0 && (
          <div className={styles.statusSection}>
            <h5 className={styles.selectedHeader}>✓ Selected ({selectedFields.length}):</h5>
            <div className={styles.statusList}>
              {selectedFields.map(field => (
                <div key={field} className={styles.statusItem}>
                  <span className={styles.statusFieldName}>{fieldLabels[field]}:</span> {selections[field]}
                </div>
              ))}
            </div>
          </div>
        )}

        {skippedFieldsList.length > 0 && (
          <div className={styles.statusSection}>
            <h5 className={styles.skippedHeader}>⏭ Skipped ({skippedFieldsList.length}):</h5>
            <div className={styles.statusList}>
              {skippedFieldsList.map(field => fieldLabels[field]).join(', ')}
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentCategory = stepInfo[currentStep].category;
  const suggestedTemplate = getSuggestedTemplate();
  const currentFields = stepInfo[currentStep].fields;
  const firstField = currentFields[0];
  const hasFirstSelection = selections[firstField] && !skippedFields[firstField];

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            System Requirements
          </h1>
          <p className={styles.subtitle}>
            Configure your infrastructure with intelligent templates
          </p>

          {/* Clickable Step Navigation */}
          <div className={styles.stepNavigation}>
            {[1, 2, 3, 4].map((step, index) => (
              <React.Fragment key={step}>
                <button
                  onClick={() => handleStepClick(step)}
                  disabled={step > currentStep + 1 || (step === currentStep + 1 && !canProceed())}
                  className={`${styles.stepButton} ${styles[`stepButton${getStepStatus(step).charAt(0).toUpperCase() + getStepStatus(step).slice(1)}`]}`}
                >
                  {stepInfo[step].title}
                </button>
                {index < 3 && (
                  <div className={styles.stepArrow}>→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Top Navigation */}
        <div className={styles.topNavigation}>
          {renderNavigationButtons()}
        </div>

        {/* Current Step */}
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>
            {stepInfo[currentStep].title}
          </h2>
          <p className={styles.stepDescription}>
            {stepInfo[currentStep].description}
          </p>

          {/* Template suggestion after first selection */}
          {hasFirstSelection && suggestedTemplate && !useTemplate[currentCategory] && (
            <div className={styles.templateSuggestion}>
              <div className={styles.templateSuggestionContent}>
                <div>
                  <h4 className={styles.templateSuggestionTitle}>Use Template: {suggestedTemplate.name}</h4>
                  <p className={styles.templateSuggestionDescription}>{suggestedTemplate.description}</p>
                </div>
                <div className={styles.templateSuggestionActions}>
                  <button
                    onClick={() => handleUseTemplate(currentCategory, suggestedTemplate.key)}
                    className={styles.useTemplateButton}
                  >
                    Use Template
                  </button>
                  <button
                    onClick={() => setUseTemplate(prev => ({ ...prev, [currentCategory]: true }))}
                    className={styles.continueManuallyButton}
                  >
                    Continue Manually
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template selection for skipped first field */}
          {showTemplateSelection && (
            <div className={styles.templateSelection}>
              <h4 className={styles.templateSelectionTitle}>Choose a template or skip all settings:</h4>
              <div className={styles.templateSelectionOptions}>
                {Object.entries(templates[currentCategory]).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => handleUseTemplate(currentCategory, key)}
                    className={styles.templateOption}
                  >
                    <div className={styles.templateOptionName}>{template.name}</div>
                    <div className={styles.templateOptionDescription}>{template.description}</div>
                  </button>
                ))}
                <button
                  onClick={handleSkipAllSection}
                  className={styles.skipAllButton}
                >
                  Skip All {stepInfo[currentStep].title}
                </button>
              </div>
            </div>
          )}

          {/* Fields for current step */}
          {!showTemplateSelection &&
            stepInfo[currentStep].fields.map(field => renderField(field))
          }
        </div>

        {/* Bottom Navigation */}
        <div className={styles.bottomNavigation}>
          {renderNavigationButtons()}
        </div>

        {/* Enhanced Status Summary */}
        {renderStatusSummary()}
      </div>
    </div>
  );
};

export default SystemRequirementsWizard;