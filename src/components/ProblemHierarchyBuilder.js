import React, { useState, useEffect } from 'react';
import styles from './ProblemHierarchyBuilder.module.css';

const ProblemHierarchyBuilder = ({ industryId, selectedIndustry }) => {
  // State management
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState(null);
  const [selectedUseCase, setSelectedUseCase] = useState(null);
  const [templates, setTemplates] = useState({});
  const [dropdownOptions, setDropdownOptions] = useState({});
  const [userSelections, setUserSelections] = useState({});
  const [generatedHierarchy, setGeneratedHierarchy] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize with first team when industry data loads
  useEffect(() => {
    if (selectedIndustry?.teams?.length > 0) {
      const firstTeam = selectedIndustry.teams[0];
      setSelectedTeamId(firstTeam.id);
      setSelectedTeam(firstTeam);

      // Set first use case if available
      if (firstTeam.use_cases?.length > 0) {
        const firstUseCase = firstTeam.use_cases[0];
        setSelectedUseCaseId(firstUseCase.id);
        setSelectedUseCase(firstUseCase);
      } else {
        setSelectedUseCaseId(null);
        setSelectedUseCase(null);
      }
    }
  }, [selectedIndustry]);

  // Update selected team when team ID changes
  useEffect(() => {
    if (selectedTeamId && selectedIndustry?.teams) {
      const team = selectedIndustry.teams.find(t => t.id === selectedTeamId);
      setSelectedTeam(team || null);

      // Reset use case selection
      if (team?.use_cases?.length > 0) {
        const firstUseCase = team.use_cases[0];
        setSelectedUseCaseId(firstUseCase.id);
        setSelectedUseCase(firstUseCase);
      } else {
        setSelectedUseCaseId(null);
        setSelectedUseCase(null);
      }
    }
  }, [selectedTeamId, selectedIndustry]);

  // Fetch templates and dropdown options when use case changes
  useEffect(() => {
    if (industryId && selectedUseCaseId) {
      fetchProblemHierarchyData();
    }
  }, [industryId, selectedUseCaseId]);

  const fetchProblemHierarchyData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5002/api/problem-hierarchy/templates/${industryId}/${selectedUseCaseId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates || {});
        setDropdownOptions(data.dropdown_options || {});

        // Initialize user selections with empty objects for each stage
        const initialSelections = {};
        Object.keys(data.templates || {}).forEach(stage => {
          initialSelections[stage] = {};
        });
        setUserSelections(initialSelections);

        // Clear previous generated hierarchy
        setGeneratedHierarchy({});
      } else {
        setError(data.error || 'Failed to fetch problem hierarchy data');
      }
    } catch (err) {
      console.error('Error fetching problem hierarchy data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle team selection
  const handleTeamChange = (e) => {
    const teamId = parseInt(e.target.value);
    setSelectedTeamId(teamId);
  };

  // Handle use case selection
  const handleUseCaseChange = (e) => {
    const useCaseId = parseInt(e.target.value);
    setSelectedUseCaseId(useCaseId);
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

  // Generate complete hierarchy from selections
  const generateHierarchy = async () => {
    if (!industryId || !selectedUseCaseId) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/problem-hierarchy/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry_id: industryId,
          use_case_id: selectedUseCaseId,
          selections: userSelections
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setGeneratedHierarchy(data.generated_hierarchy || {});
      } else {
        setError(data.error || 'Failed to generate hierarchy');
      }
    } catch (err) {
      console.error('Error generating hierarchy:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
                  <option key={optionIndex} value={option.text}>
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
    problem: 'Problem',
    problem_detail: 'Current Manual Solution',
    ai_solution: 'AI Solution',
    ai_risk: 'AI Risk',
    our_solution: 'Your Complete Solution'
  };

  const stageOrder = ['problem', 'problem_detail', 'ai_solution', 'ai_risk', 'our_solution'];

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
        <h1 className={styles.mainTitle}>Enterprise AI for {selectedIndustry?.name || 'M&A / Investing'}</h1>

        {/* Team Selection */}
        {selectedIndustry?.teams?.length > 0 && (
          <div className={styles.selectionRow}>
            <label className={styles.selectionLabel}>Team:</label>
            <select
              value={selectedTeamId || ''}
              onChange={handleTeamChange}
              className={styles.teamDropdown}
            >
              {selectedIndustry.teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Use Case Selection */}
        {selectedTeam?.use_cases?.length > 0 && (
          <div className={styles.selectionRow}>
            <label className={styles.selectionLabel}>Use Case:</label>
            <select
              value={selectedUseCaseId || ''}
              onChange={handleUseCaseChange}
              className={styles.useCaseDropdown}
            >
              {selectedTeam.use_cases.map(useCase => (
                <option key={useCase.id} value={useCase.id}>
                  {useCase.text}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className={styles.loading}>
          Loading problem hierarchy...
        </div>
      )}

      {/* Interactive Template Builder */}
      {Object.keys(templates).length > 0 && (
        <div className={styles.templateBuilder}>
          <h2 className={styles.builderTitle}>Customize Your Problem Hierarchy</h2>

          {stageOrder.map(stage => {
            if (!templates[stage]) return null;

            return (
              <div key={stage} className={styles.stageSection}>
                <h3 className={styles.stageTitle}>{stageLabels[stage]}</h3>
                {renderInteractiveTemplate(stage, templates[stage].template)}
              </div>
            );
          })}

          <button
            onClick={generateHierarchy}
            className={styles.generateButton}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Complete Hierarchy'}
          </button>
        </div>
      )}

      {/* Generated Results */}
      {Object.keys(generatedHierarchy).length > 0 && (
        <div className={styles.results}>
          <h2 className={styles.resultsTitle}>Your Problem Hierarchy</h2>

          {stageOrder.map(stage => {
            if (!generatedHierarchy[stage]) return null;

            return (
              <div key={stage} className={styles.resultSection}>
                <h4 className={styles.resultStageTitle}>{stageLabels[stage]}</h4>
                <p className={styles.resultText}>{generatedHierarchy[stage]}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Hint */}
      {Object.keys(templates).length > 0 && (
        <div className={styles.hintContainer}>
          <p className={styles.hintText}>
            Select options from the dropdowns above to customize your problem hierarchy, then generate the complete version.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProblemHierarchyBuilder;