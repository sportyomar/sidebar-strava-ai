import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileNavBar from './ProfileNavBar';
import styles from './ModuleManagement.module.css';

const ModuleManagement = () => {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState('modules');
  const [userModules, setUserModules] = useState({
    enabled: [],
    pending: [],
    available: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const moduleDefinitions = {
    memoEditor: {
      label: 'Memo Editor',
      description: 'Create and edit business memos and documents',
      icon: '📝',
      category: 'Content',
      requiresApproval: false,
      features: ['Document creation', 'Rich text editing', 'Template library', 'Version control']
    },
    dealIntake: {
      label: 'Deal Intake',
      description: 'Track and manage deal flow and pipeline',
      icon: '💼',
      category: 'Sales',
      requiresApproval: true,
      features: ['Deal tracking', 'Pipeline management', 'Contact management', 'Reporting']
    },
    connectors: {
      label: 'Data Connectors',
      description: 'Integrate with external data sources and APIs',
      icon: '🔗',
      category: 'Integration',
      requiresApproval: true,
      features: ['API integrations', 'Data sync', 'Custom connectors', 'Real-time updates']
    },
    utilities: {
      label: 'Utilities',
      description: 'General purpose tools and productivity features',
      icon: '🛠️',
      category: 'Tools',
      requiresApproval: false,
      features: ['File conversion', 'Data export', 'Bulk operations', 'Automation tools']
    },
    adminConsole: {
      label: 'Admin Console',
      description: 'Administrative tools and system management',
      icon: '⚙️',
      category: 'Administration',
      requiresApproval: true,
      features: ['User management', 'System settings', 'Access control', 'Audit logs']
    },
    metrics: {
      label: 'Analytics & Metrics',
      description: 'Performance analytics and business intelligence',
      icon: '📊',
      category: 'Analytics',
      requiresApproval: false,
      features: ['Custom dashboards', 'Performance metrics', 'Data visualization', 'Export reports']
    },
    manifest: {
      label: 'Manifest',
      description: 'Project and resource management',
      icon: '📋',
      category: 'Management',
      requiresApproval: true,
      features: ['Project tracking', 'Resource allocation', 'Timeline management', 'Collaboration']
    }
  };

  useEffect(() => {
    loadUserModules();
  }, []);

  const loadUserModules = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5002/api/user/modules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserModules({
          enabled: data.enabled || [],
          pending: data.pending || [],
          available: data.available || Object.keys(moduleDefinitions)
        });
      } else {
        setError('Failed to load module information');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Module load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleRequest = async (moduleKey) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5002/api/user/request-module-access', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          moduleKey,
          reason: 'User requested access from module management page'
        })
      });

      if (response.ok) {
        setSuccess(`Access request submitted for ${moduleDefinitions[moduleKey].label}`);
        // Move module from available to pending
        setUserModules(prev => ({
          ...prev,
          pending: [...prev.pending, moduleKey],
          available: prev.available.filter(m => m !== moduleKey)
        }));
      } else {
        setError('Failed to submit request');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleModuleEnable = async (moduleKey) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5002/api/user/enable-module', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ moduleKey })
      });

      if (response.ok) {
        setSuccess(`${moduleDefinitions[moduleKey].label} enabled successfully`);
        // Move module from available to enabled
        setUserModules(prev => ({
          ...prev,
          enabled: [...prev.enabled, moduleKey],
          available: prev.available.filter(m => m !== moduleKey)
        }));
      } else {
        setError('Failed to enable module');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleModuleDisable = async (moduleKey) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5002/api/user/disable-module', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ moduleKey })
      });

      if (response.ok) {
        setSuccess(`${moduleDefinitions[moduleKey].label} disabled`);
        // Move module from enabled to available
        setUserModules(prev => ({
          ...prev,
          enabled: prev.enabled.filter(m => m !== moduleKey),
          available: [...prev.available, moduleKey]
        }));
      } else {
        setError('Failed to disable module');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const cancelRequest = async (moduleKey) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5002/api/user/cancel-module-request/${moduleKey}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSuccess(`Request cancelled for ${moduleDefinitions[moduleKey].label}`);
        // Move module from pending back to available
        setUserModules(prev => ({
          ...prev,
          pending: prev.pending.filter(m => m !== moduleKey),
          available: [...prev.available, moduleKey]
        }));
      } else {
        setError('Failed to cancel request');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const ModuleCard = ({ moduleKey, status }) => {
    const module = moduleDefinitions[moduleKey];
    if (!module) return null;

    return (
      <div className={`${styles.moduleCard} ${styles[status]}`}>
        <div className={styles.moduleHeader}>
          <div className={styles.moduleIcon}>{module.icon}</div>
          <div className={styles.moduleInfo}>
            <h3 className={styles.moduleName}>{module.label}</h3>
            <span className={styles.moduleCategory}>{module.category}</span>
            <p className={styles.moduleDescription}>{module.description}</p>
          </div>
          <div className={styles.moduleStatus}>
            {status === 'enabled' && <span className={styles.enabledBadge}>Enabled</span>}
            {status === 'pending' && <span className={styles.pendingBadge}>Pending</span>}
            {status === 'available' && <span className={styles.availableBadge}>Available</span>}
          </div>
        </div>

        <div className={styles.moduleFeatures}>
          <h4>Key Features:</h4>
          <ul>
            {module.features.map((feature, idx) => (
              <li key={idx}>{feature}</li>
            ))}
          </ul>
        </div>

        <div className={styles.moduleActions}>
          {status === 'enabled' && (
            <button
              onClick={() => handleModuleDisable(moduleKey)}
              className={styles.disableButton}
            >
              Disable
            </button>
          )}

          {status === 'pending' && (
            <button
              onClick={() => cancelRequest(moduleKey)}
              className={styles.cancelButton}
            >
              Cancel Request
            </button>
          )}

          {status === 'available' && (
            <button
              onClick={() => module.requiresApproval ? handleModuleRequest(moduleKey) : handleModuleEnable(moduleKey)}
              className={styles.enableButton}
            >
              {module.requiresApproval ? 'Request Access' : 'Enable'}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div>
        <ProfileNavBar
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          onBackToApp={() => navigate('/app')}
        />
        <div className={styles.container}>
          <div className={styles.loadingSpinner}>Loading modules...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ProfileNavBar
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        onBackToApp={() => navigate('/app')}
      />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Module Management</h1>
          <p className={styles.pageDescription}>
            Manage your access to different platform modules and features
          </p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        <div className={styles.content}>
          {/* Enabled Modules */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Enabled Modules ({userModules.enabled.length})
            </h2>
            {userModules.enabled.length === 0 ? (
              <p className={styles.emptyState}>No modules enabled yet</p>
            ) : (
              <div className={styles.moduleGrid}>
                {userModules.enabled.map(moduleKey => (
                  <ModuleCard key={moduleKey} moduleKey={moduleKey} status="enabled" />
                ))}
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {userModules.pending.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Pending Requests ({userModules.pending.length})
              </h2>
              <div className={styles.moduleGrid}>
                {userModules.pending.map(moduleKey => (
                  <ModuleCard key={moduleKey} moduleKey={moduleKey} status="pending" />
                ))}
              </div>
            </div>
          )}

          {/* Available Modules */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Available Modules ({userModules.available.length})
            </h2>
            {userModules.available.length === 0 ? (
              <p className={styles.emptyState}>All modules are enabled or requested</p>
            ) : (
              <div className={styles.moduleGrid}>
                {userModules.available.map(moduleKey => (
                  <ModuleCard key={moduleKey} moduleKey={moduleKey} status="available" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleManagement;