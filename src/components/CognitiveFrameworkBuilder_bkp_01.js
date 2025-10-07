import React, { useState, useEffect } from 'react';
import styles from './CognitiveFrameworkBuilder.module.css';

const CognitiveFrameworkBuilder = ({ domainId, selectedDomain }) => {
  // State management
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [templates, setTemplates] = useState({});
  const [dropdownOptions, setDropdownOptions] = useState({});
  const [userSelections, setUserSelections] = useState({});
  const [generatedFramework, setGeneratedFramework] = useState({});
  const [semanticMappings, setSemanticMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize with first strategy when domain data loads
  useEffect(() => {
    if (selectedDomain?.strategies?.length > 0) {
      const firstStrategy = selectedDomain.strategies[0];
      setSelectedStrategyId(firstStrategy.id);
      setSelectedStrategy(firstStrategy);

      // Set first scenario if available
      if (firstStrategy.scenarios?.length > 0) {
        const firstScenario = firstStrategy.scenarios[0];
        setSelectedScenarioId(firstScenario.id);
        setSelectedScenario(firstScenario);
      } else {
        setSelectedScenarioId(null);
        setSelectedScenario(null);
      }
    }
  }, [selectedDomain]);

  // Update selected strategy when strategy ID changes
  useEffect(() => {
    if (selectedStrategyId && selectedDomain?.strategies) {
      const strategy = selectedDomain.strategies.find(s => s.id === selectedStrategyId);
      setSelectedStrategy(strategy || null);

      // Reset scenario selection
      if (strategy?.scenarios?.length > 0) {
        const firstScenario = strategy.scenarios[0];
        setSelectedScenarioId(firstScenario.id);
        setSelectedScenario(firstScenario);
      } else {
        setSelectedScenarioId(null);
        setSelectedScenario(null);
      }
    }
  }, [selectedStrategyId, selectedDomain]);

  // Fetch templates and dropdown options when scenario changes
  useEffect(() => {
    if (domainId && selectedScenarioId) {
      fetchCognitiveFrameworkData();
      fetchSemanticMappings();
    }
  }, [domainId, selectedScenarioId]);

  const fetchCognitiveFrameworkData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch templates
      const templatesResponse = await fetch(
        `/api/cognitive-frameworks/scenarios/${selectedScenarioId}/templates`
      );

      if (!templatesResponse.ok) {
        throw new Error(`HTTP error! status: ${templatesResponse.status}`);
      }

      const templatesData = await templatesResponse.json();

      if (templatesData.success) {
        setTemplates(templatesData.templates || {});

        // Fetch dropdown options
        const optionsResponse = await fetch(
          `/api/cognitive-frameworks/dropdown-options?framework_id=${Object.values(templatesData.templates)[0]?.id || ''}&context_filter=healthcare_distribution`
        );

        if (optionsResponse.ok) {
          const optionsData = await optionsResponse.json();
          if (optionsData.success) {
            setDropdownOptions(optionsData.dropdown_options || {});
          }
        }

        // Initialize user selections with empty objects for each stage
        const initialSelections = {};
        Object.keys(templatesData.templates || {}).forEach(stage => {
          initialSelections[stage] = {};
        });
        setUserSelections(initialSelections);

        // Clear previous generated framework
        setGeneratedFramework({});
      } else {
        setError(templatesData.error || 'Failed to fetch cognitive framework data');
      }
    } catch (err) {
      console.error('Error fetching cognitive framework data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSemanticMappings = async () => {
    try {
      const response = await fetch(`/api/cognitive-frameworks/semantic-mappings/${domainId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSemanticMappings(data.semantic_mappings || {});
        }
      }
    } catch (err) {
      console.error('Error fetching semantic mappings:', err);
    }
  };

  // Handle strategy selection
  const handleStrategyChange = (e) => {
    const strategyId = parseInt(e.target.value);
    setSelectedStrategyId(strategyId);
  };

  // Handle scenario selection
  const handleScenarioChange = (e) => {
    const scenarioId = parseInt(e.target.value);
    setSelectedScenarioId(scenarioId);
  };

  // Handle dropdown selection for placeholders
  const handlePlaceholderSelection = (stage, placeholderKey, selectedValue) => {
    setUserSelections(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [placeholderKey]: selectedValue
      }
    }));
  };

  // Generate complete framework from selections
  const generateFramework = async () => {
    if (!domainId || !selectedScenarioId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/cognitive-frameworks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain_id: domainId,
          scenario_id: selectedScenarioId,
          selections: userSelections
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setGeneratedFramework(data.generated_framework || {});
      } else {
        setError(data.error || 'Failed to generate framework');
      }
    } catch (err) {
      console.error('Error generating framework:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get display label with semantic mapping
  const getDisplayLabel = (universalTerm) => {
    const mapping = semanticMappings[universalTerm];
    return mapping ? mapping.domain_term : universalTerm;
  };

  // Render a sentence template with interactive placeholders
  const renderInteractiveTemplate = (stage, template) => {
    if (!template) return null;

    const placeholderRegex = /\[([^\]]+)\]/g;
    const parts = template.split(placeholderRegex);

    return (
      <div className={styles.interactiveTemplate}>
        {parts.map((part, index) => {
          if (index % 2 === 0) {
            // Regular text
            return <span key={index}>{part}</span>;
          } else {
            // Placeholder
            const placeholderKey = part;
            const options = dropdownOptions[stage]?.[placeholderKey] || [];
            const selectedValue = userSelections[stage]?.[placeholderKey] || '';

            return (
              <select
                key={index}
                value={selectedValue}
                onChange={(e) => handlePlaceholderSelection(stage, placeholderKey, e.target.value)}
                className={styles.placeholderDropdown}
              >
                <option value="">[{placeholderKey}]</option>
                {options.map((option, optionIndex) => (
                  <option key={optionIndex} value={option.value || option.text}>
                    {option.text}
                  </option>
                ))}
              </select>
            );
          }
        })}
      </div>
    );
  };

  const stageLabels = {
    challenge: 'Challenge',
    current_approach: 'Current Approach',
    proposed_solution: 'Proposed Solution',
    risk_factors: 'Risk Factors',
    implementation_plan: 'Implementation Plan'
  };

  const stageOrder = ['challenge', 'current_approach', 'proposed_solution', 'risk_factors', 'implementation_plan'];

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.mainTitle}>
          Cognitive Framework Builder - {selectedDomain?.name || 'Healthcare Distribution'}
        </h1>

        {/* Strategy Selection */}
        {selectedDomain?.strategies?.length > 0 && (
          <div className={styles.selectionRow}>
            <label className={styles.selectionLabel}>
              {getDisplayLabel('strategy')}:
            </label>
            <select
              value={selectedStrategyId || ''}
              onChange={handleStrategyChange}
              className={styles.strategyDropdown}
            >
              {selectedDomain.strategies.map(strategy => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
            {selectedStrategy && (
              <div className={styles.selectionDescription}>
                <span className={styles.strategyType}>{selectedStrategy.strategy_type}</span>
                <span className={styles.priority}>{selectedStrategy.priority_level} priority</span>
                <span className={styles.timeframe}>{selectedStrategy.timeframe} term</span>
              </div>
            )}
          </div>
        )}

        {/* Scenario Selection */}
        {selectedStrategy?.scenarios?.length > 0 && (
          <div className={styles.selectionRow}>
            <label className={styles.selectionLabel}>
              {getDisplayLabel('scenario')}:
            </label>
            <select
              value={selectedScenarioId || ''}
              onChange={handleScenarioChange}
              className={styles.scenarioDropdown}
            >
              {selectedStrategy.scenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
            {selectedScenario && (
              <div className={styles.selectionDescription}>
                <span className={styles.complexityLevel}>{selectedScenario.complexity_level}</span>
                <span className={styles.outcomeType}>{selectedScenario.outcome_type}</span>
                <span className={styles.riskProfile}>{selectedScenario.risk_profile} risk</span>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className={styles.loading}>
          Loading cognitive framework...
        </div>
      )}

      {/* Interactive Template Builder */}
      {Object.keys(templates).length > 0 && (
        <div className={styles.templateBuilder}>
          <h2 className={styles.builderTitle}>Customize Your Framework</h2>

          {stageOrder.map(stage => {
            if (!templates[stage]) return null;

            return (
              <div key={stage} className={styles.stageSection}>
                <h3 className={styles.stageTitle}>
                  {getDisplayLabel(stage) || stageLabels[stage]}
                </h3>
                <div className={styles.stageContent}>
                  {renderInteractiveTemplate(stage, templates[stage].template)}
                  {semanticMappings[stage] && (
                    <div className={styles.semanticHint}>
                      <small>{semanticMappings[stage].description}</small>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <button
            onClick={generateFramework}
            className={styles.generateButton}
            disabled={loading}
          >
            {loading ? 'Generating...' : `Generate Complete ${getDisplayLabel('framework') || 'Framework'}`}
          </button>
        </div>
      )}

      {/* Generated Results */}
      {Object.keys(generatedFramework).length > 0 && (
        <div className={styles.results}>
          <h2 className={styles.resultsTitle}>
            Your {getDisplayLabel('framework') || 'Cognitive Framework'}
          </h2>

          {stageOrder.map(stage => {
            if (!generatedFramework[stage]) return null;

            return (
              <div key={stage} className={styles.resultSection}>
                <h4 className={styles.resultStageTitle}>
                  {getDisplayLabel(stage) || stageLabels[stage]}
                </h4>
                <p className={styles.resultText}>{generatedFramework[stage]}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Context Information */}
      {selectedScenario && (
        <div className={styles.contextInfo}>
          <h3>Context</h3>
          <div className={styles.contextGrid}>
            <div className={styles.contextItem}>
              <strong>Domain:</strong> {selectedDomain?.name}
            </div>
            <div className={styles.contextItem}>
              <strong>Strategy:</strong> {selectedStrategy?.name}
            </div>
            <div className={styles.contextItem}>
              <strong>Scenario:</strong> {selectedScenario?.name}
            </div>
            <div className={styles.contextItem}>
              <strong>Outcome Focus:</strong> {selectedScenario?.outcome_type}
            </div>
            <div className={styles.contextItem}>
              <strong>Risk Level:</strong> {selectedScenario?.risk_profile}
            </div>
            <div className={styles.contextItem}>
              <strong>Stakeholder Impact:</strong> {selectedScenario?.stakeholder_impact}
            </div>
          </div>
        </div>
      )}

      {/* Hint */}
      {Object.keys(templates).length > 0 && (
        <div className={styles.hintContainer}>
          <p className={styles.hintText}>
            Select options from the dropdowns above to customize your {getDisplayLabel('framework') || 'framework'},
            then generate the complete version. Use the semantic mappings to understand domain-specific terminology.
          </p>
        </div>
      )}
    </div>
  );
};

export default CognitiveFrameworkBuilder;