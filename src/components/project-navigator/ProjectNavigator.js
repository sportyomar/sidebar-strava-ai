import React, { useContext, useEffect, useState } from 'react';
import ProjectContext from '../contexts/ProjectContext';
import styles from './ProjectNavigator.module.css';

/**
 * ProjectNavigator - Handles the hierarchical selection of Client > Company > Project
 *
 * Hierarchy:
 * - Private Equity Company (Client) has multiple portfolio Companies
 * - Each Company can have multiple Projects
 * - Selection flows: Client ID -> Company ID -> Project ID
 */
function ProjectNavigator({
  clientId,
  setClientId,
  companyId,
  setCompanyId,
  projectId,
  setProjectId,
  onSelectionChange,
  className = ''
}) {
  const {
    allClients = [],
    companiesByClient = {},
    projectsByCompany = {},
    loadingClients = false,
    loadingCompanies = false,
    loadingProjects = false
  } = useContext(ProjectContext);

  // Local state for managing cascading selections
  const [isUpdatingSelections, setIsUpdatingSelections] = useState(false);

  // Get available options based on current selections
  const availableCompanies = clientId ? (companiesByClient[clientId] || []) : [];
  const availableProjects = companyId ? (projectsByCompany[companyId] || []) : [];

  // Get display names for selected items
  const selectedClient = allClients.find(client => client.id === clientId);
  const selectedCompany = availableCompanies.find(company => company.id === companyId);
  const selectedProject = availableProjects.find(project => project.id === projectId);

  /**
   * Handle client selection and cascade changes
   */
  const handleClientChange = (newClientId) => {
    setIsUpdatingSelections(true);

    setClientId(newClientId);

    // Clear downstream selections when client changes
    if (companyId) {
      setCompanyId('');
    }
    if (projectId) {
      setProjectId('');
    }

    // Notify parent of selection change
    if (onSelectionChange) {
      onSelectionChange({
        clientId: newClientId,
        companyId: '',
        projectId: ''
      });
    }

    setIsUpdatingSelections(false);
  };

  /**
   * Handle company selection and cascade changes
   */
  const handleCompanyChange = (newCompanyId) => {
    setIsUpdatingSelections(true);

    setCompanyId(newCompanyId);

    // Clear project selection when company changes
    if (projectId) {
      setProjectId('');
    }

    // Notify parent of selection change
    if (onSelectionChange) {
      onSelectionChange({
        clientId,
        companyId: newCompanyId,
        projectId: ''
      });
    }

    setIsUpdatingSelections(false);
  };

  /**
   * Handle project selection
   */
  const handleProjectChange = (newProjectId) => {
    setProjectId(newProjectId);

    // Notify parent of selection change
    if (onSelectionChange) {
      onSelectionChange({
        clientId,
        companyId,
        projectId: newProjectId
      });
    }
  };

  /**
   * Validate current selections and clear invalid ones
   */
  useEffect(() => {
    if (isUpdatingSelections) return;

    let needsUpdate = false;
    const updates = {};

    // Validate company selection
    if (companyId && clientId) {
      const companyExists = availableCompanies.some(company => company.id === companyId);
      if (!companyExists) {
        updates.companyId = '';
        updates.projectId = '';
        needsUpdate = true;
      }
    }

    // Validate project selection
    if (projectId && companyId) {
      const projectExists = availableProjects.some(project => project.id === projectId);
      if (!projectExists) {
        updates.projectId = '';
        needsUpdate = true;
      }
    }

    // Apply updates if needed
    if (needsUpdate) {
      if (updates.companyId !== undefined) setCompanyId(updates.companyId);
      if (updates.projectId !== undefined) setProjectId(updates.projectId);

      if (onSelectionChange) {
        onSelectionChange({
          clientId,
          companyId: updates.companyId !== undefined ? updates.companyId : companyId,
          projectId: updates.projectId !== undefined ? updates.projectId : projectId
        });
      }
    }
  }, [clientId, companyId, projectId, availableCompanies, availableProjects, isUpdatingSelections, onSelectionChange, setCompanyId, setProjectId]);

  return (
    <div className={`${styles.projectNavigator} ${className}`}>
      {/* Private Equity Company (Client) Selection */}
      <div className={styles.selectorGroup}>
        <label className={styles.selectorLabel}>Private Equity Firm</label>
        <select
          value={clientId || ''}
          onChange={(e) => handleClientChange(e.target.value)}
          disabled={loadingClients}
          className={`${styles.selector} ${!clientId ? styles.placeholder : ''}`}
          title={selectedClient?.name || 'Select a Private Equity Firm'}
        >
          <option value="" disabled>
            {loadingClients ? 'Loading firms...' : 'Select Private Equity Firm'}
          </option>
          {allClients.map(client => (
            <option
              key={client.id}
              value={client.id}
              title={client.description || client.name}
            >
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Portfolio Company Selection */}
      <div className={styles.selectorGroup}>
        <label className={styles.selectorLabel}>Portfolio Company</label>
        <select
          value={companyId || ''}
          onChange={(e) => handleCompanyChange(e.target.value)}
          disabled={!clientId || loadingCompanies || availableCompanies.length === 0}
          className={`${styles.selector} ${!companyId ? styles.placeholder : ''}`}
          title={selectedCompany?.name || 'Select a Portfolio Company'}
        >
          <option value="" disabled>
            {!clientId
              ? 'Select PE firm first'
              : loadingCompanies
                ? 'Loading companies...'
                : availableCompanies.length === 0
                  ? 'No companies available'
                  : 'Select Portfolio Company'
            }
          </option>
          {availableCompanies.map(company => (
            <option
              key={company.id}
              value={company.id}
              title={company.description || company.name}
            >
              {company.name}
              {company.industry && ` (${company.industry})`}
            </option>
          ))}
        </select>
      </div>

      {/* Project Selection */}
      <div className={`${styles.selectorGroup} ${styles.projectGroup}`}>
        <label className={styles.selectorLabel}>Project</label>
        <select
          value={projectId || ''}
          onChange={(e) => handleProjectChange(e.target.value)}
          disabled={!companyId || loadingProjects || availableProjects.length === 0}
          className={`${styles.selector} ${styles.projectSelector} ${!projectId ? styles.placeholder : ''}`}
          title={selectedProject?.name || 'Select a Project'}
        >
          <option value="" disabled>
            {!companyId
              ? 'Select company first'
              : loadingProjects
                ? 'Loading projects...'
                : availableProjects.length === 0
                  ? 'No projects available'
                  : 'Select Project'
            }
          </option>
          {availableProjects.map(project => (
            <option
              key={project.id}
              value={project.id}
              title={`${project.name}${project.status ? ` (${project.status})` : ''}`}
            >
              {project.name}
              {project.status && project.status !== 'active' && ` [${project.status}]`}
            </option>
          ))}
        </select>
      </div>

      {/* Selection Summary (optional, for debugging or display) */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.selectionSummary}>
          <small>
            Selected: {selectedClient?.name || 'None'} → {selectedCompany?.name || 'None'} → {selectedProject?.name || 'None'}
          </small>
        </div>
      )}
    </div>
  );
}

export default ProjectNavigator;