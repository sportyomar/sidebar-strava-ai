import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Settings, Shield } from 'lucide-react';
import styles from './AccountPage.module.css';

const ApiKeyManagement = ({ selectedWorkspace, fetchWithAuth, API_BASE_URL, onError, onSuccess }) => {
  const [activeSection, setActiveSection] = useState('workspace'); // 'workspace' | 'providers'

  // Workspace API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState(new Set());

  // Provider credentials state
  const [credentials, setCredentials] = useState({
    openai: {
      apiKey: '',
      orgId: '',
      status: 'disconnected'
    },
    azureopenai: {
      endpoint: '',
      apiKey: '',
      apiVersion: '2023-05-15',
      deployments: '',
      status: 'disconnected'
    },
    anthropic: {
      apiKey: '',
      status: 'disconnected'
    }
  });

  const loadApiKeys = useCallback(async () => {
    if (!selectedWorkspace) return;

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces/${selectedWorkspace.id}/api-keys`);
      if (res.ok) {
        setApiKeys(await res.json());
      } else {
        onError('Failed to load API keys');
      }
    } catch {
      onError('Network error loading API keys');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspace, fetchWithAuth, API_BASE_URL, onError]);

  const loadProviderCredentials = useCallback(async () => {
    if (!selectedWorkspace) return;

    try {
      const providers = ['openai', 'azureopenai', 'anthropic'];
      const results = await Promise.all(
        providers.map(provider =>
          fetchWithAuth(`${API_BASE_URL}/api/account/workspaces/${selectedWorkspace.id}/provider-credentials/${provider}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        )
      );

      providers.forEach((provider, index) => {
        if (results[index]) {
          setCredentials(prev => ({
            ...prev,
            [provider]: {
              ...prev[provider],
              ...results[index],
              status: 'connected'
            }
          }));
        }
      });
    } catch {
      // Silent fail - credentials may not exist yet
    }
  }, [selectedWorkspace, fetchWithAuth, API_BASE_URL]);

  useEffect(() => {
    if (activeSection === 'workspace') {
      loadApiKeys();
    } else {
      loadProviderCredentials();
    }
  }, [activeSection, loadApiKeys, loadProviderCredentials]);

  const createApiKey = useCallback(async () => {
    if (!newKeyName.trim() || !selectedWorkspace) return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces/${selectedWorkspace.id}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName.trim() })
      });

      if (res.ok) {
        onSuccess('API key created successfully');
        setShowCreateModal(false);
        setNewKeyName('');
        loadApiKeys();
      } else {
        onError('Failed to create API key');
      }
    } catch {
      onError('Network error creating API key');
    }
  }, [newKeyName, selectedWorkspace, fetchWithAuth, API_BASE_URL, onSuccess, onError, loadApiKeys]);

  const deleteApiKey = useCallback(async (keyId) => {
    if (!selectedWorkspace) return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces/${selectedWorkspace.id}/api-keys/${keyId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        onSuccess('API key deleted');
        loadApiKeys();
      } else {
        onError('Failed to delete API key');
      }
    } catch {
      onError('Network error deleting API key');
    }
  }, [selectedWorkspace, fetchWithAuth, API_BASE_URL, onSuccess, onError, loadApiKeys]);

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      onSuccess('API key copied to clipboard');
    } catch {
      onError('Failed to copy to clipboard');
    }
  }, [onSuccess, onError]);

  const toggleKeyVisibility = useCallback((keyId) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  }, []);

  const maskKey = (key) => {
    if (!key) return '';
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  const handleCredentialChange = (provider, field, value) => {
    setCredentials(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const testConnection = async (provider) => {
    setCredentials(prev => ({
      ...prev,
      [provider]: { ...prev[provider], status: 'testing' }
    }));

    try {
      let isValid = false;

      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${credentials.openai.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        isValid = response.ok;
      } else if (provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': credentials.anthropic.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          })
        });
        isValid = response.status !== 401;
      }

      setCredentials(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          status: isValid ? 'connected' : 'disconnected'
        }
      }));

      if (isValid) {
        onSuccess(`${provider} connected successfully!`);
      } else {
        onError(`${provider} connection failed`);
      }

    } catch (error) {
      setCredentials(prev => ({
        ...prev,
        [provider]: { ...prev[provider], status: 'disconnected' }
      }));
      onError(`${provider} connection failed: ${error.message}`);
    }
  };

  const saveCredentials = async (provider) => {
    try {
      const providerData = credentials[provider];
      const response = await fetchWithAuth(`${API_BASE_URL}/api/keys/${provider}`, {
        method: 'POST',
        body: JSON.stringify({
          apiKey: providerData.apiKey,
          endpoint: providerData.endpoint,
          apiVersion: providerData.apiVersion,
          orgId: providerData.orgId,
          deployments: providerData.deployments
        })
      });

      if (response.ok) {
        onSuccess(`${provider} credentials saved successfully!`);
        setCredentials(prev => ({
          ...prev,
          [provider]: { ...prev[provider], status: 'connected' }
        }));
      } else {
        const error = await response.json();
        onError(`Error saving ${provider} credentials: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      onError(`Error saving ${provider} credentials: ${error.message}`);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'connected': return styles.badgeSuccess;
      case 'testing': return styles.badge;
      default: return styles.badge;
    }
  };

  if (!selectedWorkspace) {
    return <p className={styles.textGray500}>Select a workspace to manage API keys.</p>;
  }

  return (
    <div className={styles.spaceY6}>
      <div>
        <h3 className={styles.cardTitle}>API Keys & Provider Credentials for {selectedWorkspace.name}</h3>
        <p className={styles.textGray600}>Manage workspace API keys and external AI provider credentials</p>
      </div>

      {/* Section Tabs */}
      <div className={styles.tabsContainer} style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <div className={styles.tabsNav}>
          <button
            onClick={() => setActiveSection('workspace')}
            className={`${styles.tab} ${activeSection === 'workspace' ? styles.active : styles.inactive}`}
          >
            <Key className={styles.tabIcon} />
            Workspace API Keys
          </button>
          <button
            onClick={() => setActiveSection('providers')}
            className={`${styles.tab} ${activeSection === 'providers' ? styles.active : styles.inactive}`}
          >
            <Settings className={styles.tabIcon} />
            AI Provider Credentials
          </button>
        </div>
      </div>

      {activeSection === 'workspace' ? (
        // Workspace API Keys Section
        <>
          <div className={styles.flexBetween}>
            <div>
              <h4 className={styles.cardTitle} style={{ fontSize: '1rem' }}>Workspace API Keys</h4>
              <p className={styles.textGray600} style={{ fontSize: '0.875rem' }}>Keys for accessing your workspace API</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`${styles.buttonPrimary} ${styles.flexCenter} ${styles.gap2}`}
            >
              <Plus className={styles.buttonIcon} /> Create API Key
            </button>
          </div>

          {loading ? (
            <p className={styles.textGray500}>Loading API keys...</p>
          ) : apiKeys.length === 0 ? (
            <div className={styles.card}>
              <div className={styles.flexCenter} style={{ flexDirection: 'column', padding: '2rem' }}>
                <Key className={styles.cardIcon} style={{ width: '3rem', height: '3rem', color: '#9ca3af', marginBottom: '1rem' }} />
                <p className={styles.textGray500}>No API keys created yet</p>
                <p className={styles.textGray500} style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Create your first API key to start using the API
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.table}>
              <div className={styles.tableContainer}>
                <table>
                  <thead className={styles.tableHeader}>
                    <tr>
                      <th className={styles.tableHeaderCell}>Name</th>
                      <th className={styles.tableHeaderCell}>Key</th>
                      <th className={styles.tableHeaderCell}>Created</th>
                      <th className={styles.tableHeaderCell}>Last Used</th>
                      <th className={styles.tableHeaderCell}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={styles.tableBody}>
                    {apiKeys.map(key => (
                      <tr key={key.id} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <div className={styles.flexCenter} style={{ gap: '0.5rem' }}>
                            <Key className={styles.buttonIcon} />
                            {key.name}
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                          <div className={styles.flexCenter} style={{ gap: '0.5rem' }}>
                            <code style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                              {visibleKeys.has(key.id) ? key.key : maskKey(key.key)}
                            </code>
                            <button
                              onClick={() => toggleKeyVisibility(key.id)}
                              className={styles.iconButton}
                            >
                              {visibleKeys.has(key.id) ? <EyeOff className={styles.buttonIcon} /> : <Eye className={styles.buttonIcon} />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(key.key)}
                              className={styles.iconButton}
                            >
                              <Copy className={styles.buttonIcon} />
                            </button>
                          </div>
                        </td>
                        <td className={`${styles.tableCell} ${styles.textGray500}`}>
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className={`${styles.tableCell} ${styles.textGray500}`}>
                          {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className={styles.tableCell}>
                          <button
                            onClick={() => deleteApiKey(key.id)}
                            className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                          >
                            <Trash2 className={styles.buttonIcon} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showCreateModal && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>Create API Key</h3>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Key Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className={styles.input}
                    placeholder="e.g., Production API Key"
                    autoFocus
                  />
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className={styles.modalCancel}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createApiKey}
                    disabled={!newKeyName.trim()}
                    className={styles.buttonPrimary}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        // AI Provider Credentials Section
        <>
          <div>
            <h4 className={styles.cardTitle} style={{ fontSize: '1rem' }}>AI Provider Credentials</h4>
            <p className={styles.textGray600} style={{ fontSize: '0.875rem' }}>Configure API credentials for external AI services</p>
          </div>

          {/* OpenAI Provider */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.flexCenter} style={{ gap: '0.75rem' }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: '#10a37f',
                  color: 'white',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  AI
                </div>
                <span className={styles.cardTitle}>OpenAI</span>
              </div>
              <span className={`${styles.badge} ${getStatusClass(credentials.openai.status)}`}>
                {credentials.openai.status === 'connected' ? 'Connected' :
                 credentials.openai.status === 'testing' ? 'Testing...' : 'Not Connected'}
              </span>
            </div>
            <div className={styles.spaceY4}>
              <div className={styles.formGroup}>
                <label className={styles.label}>API Key</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="sk-..."
                  value={credentials.openai.apiKey}
                  onChange={(e) => handleCredentialChange('openai', 'apiKey', e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Get your API key from platform.openai.com
                </p>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Organization ID (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="org-..."
                  value={credentials.openai.orgId}
                  onChange={(e) => handleCredentialChange('openai', 'orgId', e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Only required if you belong to multiple organizations
                </p>
              </div>
              <div className={styles.flexCenter} style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => testConnection('openai')}
                  disabled={credentials.openai.status === 'testing'}
                  className={styles.buttonSecondary}
                >
                  {credentials.openai.status === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => saveCredentials('openai')}
                  className={styles.buttonPrimary}
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Azure OpenAI Provider */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.flexCenter} style={{ gap: '0.75rem' }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: '#0078d4',
                  color: 'white',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  AZ
                </div>
                <span className={styles.cardTitle}>Azure OpenAI</span>
              </div>
              <span className={`${styles.badge} ${getStatusClass(credentials.azureopenai.status)}`}>
                {credentials.azureopenai.status === 'connected' ? 'Connected' :
                 credentials.azureopenai.status === 'testing' ? 'Testing...' : 'Not Connected'}
              </span>
            </div>
            <div className={styles.spaceY4}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Endpoint URL</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="https://your-resource.openai.azure.com/"
                  value={credentials.azureopenai.endpoint}
                  onChange={(e) => handleCredentialChange('azureopenai', 'endpoint', e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Your Azure OpenAI service endpoint
                </p>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>API Key</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="Enter your Azure API key"
                  value={credentials.azureopenai.apiKey}
                  onChange={(e) => handleCredentialChange('azureopenai', 'apiKey', e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Found in Azure Portal under Keys and Endpoint
                </p>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>API Version</label>
                <input
                  type="text"
                  className={styles.input}
                  value={credentials.azureopenai.apiVersion}
                  onChange={(e) => handleCredentialChange('azureopenai', 'apiVersion', e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  API version for your deployment
                </p>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Deployment Names</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="gpt-4o-deployment, gpt-35-turbo-deployment"
                  value={credentials.azureopenai.deployments}
                  onChange={(e) => handleCredentialChange('azureopenai', 'deployments', e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Comma-separated list of your model deployments
                </p>
              </div>
              <div className={styles.flexCenter} style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => testConnection('azureopenai')}
                  disabled={credentials.azureopenai.status === 'testing'}
                  className={styles.buttonSecondary}
                >
                  {credentials.azureopenai.status === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => saveCredentials('azureopenai')}
                  className={styles.buttonPrimary}
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Anthropic Provider */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.flexCenter} style={{ gap: '0.75rem' }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: '#d97706',
                  color: 'white',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  C
                </div>
                <span className={styles.cardTitle}>Anthropic</span>
              </div>
              <span className={`${styles.badge} ${getStatusClass(credentials.anthropic.status)}`}>
                {credentials.anthropic.status === 'connected' ? 'Connected' :
                 credentials.anthropic.status === 'testing' ? 'Testing...' : 'Not Connected'}
              </span>
            </div>
            <div className={styles.spaceY4}>
              <div className={styles.formGroup}>
                <label className={styles.label}>API Key</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="sk-ant-..."
                  value={credentials.anthropic.apiKey}
                  onChange={(e) => handleCredentialChange('anthropic', 'apiKey', e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Get your API key from console.anthropic.com
                </p>
              </div>
              <div className={styles.flexCenter} style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => testConnection('anthropic')}
                  disabled={credentials.anthropic.status === 'testing'}
                  className={styles.buttonSecondary}
                >
                  {credentials.anthropic.status === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => saveCredentials('anthropic')}
                  className={styles.buttonPrimary}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ApiKeyManagement;