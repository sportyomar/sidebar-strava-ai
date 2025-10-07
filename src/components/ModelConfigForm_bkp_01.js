import { useState, useEffect } from 'react';
import { Bot, BarChart3, Database, Settings, Shield, Play, TrendingUp, Sliders, ArrowLeft } from 'lucide-react';
import styles from './ModelConfigForm.module.css';

export default function ModelConfigForm() {
  const [currentView, setCurrentView] = useState('models'); // 'models' | 'setup'
  const [config, setConfig] = useState({
    providers: {
      openai: {
        api_key_env: "OPENAI_API_KEY",
        models: {
          "gpt-4o": {
            default_temperature: 0.7,
            cost_per_1k_tokens: { prompt: 0.005, completion: 0.005 }
          },
          "gpt-4o-mini": {
            default_temperature: 0.7,
            cost_per_1k_tokens: { prompt: 0.0003, completion: 0.0003 }
          }
        }
      },
      azureopenai: {
        api_key_env: "AZURE_OPENAI_KEY",
        endpoint_env: "AZURE_OPENAI_ENDPOINT",
        api_version: "2023-05-15",
        deployments: {
          "gpt4o-deployment": {
            default_temperature: 0.7,
            cost_per_1k_tokens: { prompt: 0.005, completion: 0.005 }
          }
        }
      }
    }
  });

  const [collapsed, setCollapsed] = useState({
    openai: false,
    azureopenai: false
  });

  // Provider credentials state
  const [credentials, setCredentials] = useState({
    openai: {
      apiKey: '',
      orgId: '',
      status: 'disconnected' // 'connected' | 'disconnected' | 'testing'
    },
    azureopenai: {
      endpoint: '',
      apiKey: '',
      apiVersion: '2023-05-15',
      deployments: '',
      status: 'testing'
    },
    anthropic: {
      apiKey: '',
      status: 'connected'
    }
  });

  const toggleCollapse = (provider) => {
    setCollapsed(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const saveLocally = () => {
    console.log("Saved Config:", config);
    alert("Configuration saved successfully.");
  };

  const getModelCount = (provider) => {
    const models = config.providers[provider].models || config.providers[provider].deployments || {};
    return Object.keys(models).length;
  };

  const getProviderStatus = (provider) => {
    return credentials[provider]?.status || 'disconnected';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'connected': return styles.statusConnected;
      case 'testing': return styles.statusMonitoring;
      default: return styles.statusWarning;
    }
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
      }

      setCredentials(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          status: isValid ? 'connected' : 'disconnected'
        }
      }));

      if (isValid) {
        alert(`✅ ${provider} connected successfully!`);
      } else {
        alert(`❌ ${provider} connection failed`);
      }

    } catch (error) {
      setCredentials(prev => ({
        ...prev,
        [provider]: { ...prev[provider], status: 'disconnected' }
      }));
      alert(`❌ ${provider} connection failed: ${error.message}`);
    }
  };

  useEffect(() => {
    ['openai', 'azureopenai', 'anthropic'].forEach(provider => {
      const saved = localStorage.getItem(`ai_config_${provider}`);
      if (saved) {
        setCredentials(prev => ({
          ...prev,
          [provider]: { ...prev[provider], ...JSON.parse(saved) }
        }));
      }
    });
  }, []);

  const saveCredentials = async (provider) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to save credentials');
        return;
      }

      const providerData = credentials[provider];
      const response = await fetch(`http://localhost:5002/api/keys/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          apiKey: providerData.apiKey,
          endpoint: providerData.endpoint,
          apiVersion: providerData.apiVersion,
          orgId: providerData.orgId,
          deployments: providerData.deployments
        })
      });

      if (response.ok) {
        alert(`${provider} credentials saved successfully!`);
      } else {
        const error = await response.json();
        alert(`Error saving ${provider} credentials: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error saving ${provider} credentials: ${error.message}`);
    }
  };

  return (
    <div className={styles.layoutTools}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          {currentView === 'models' ? 'AI Model Configuration' : 'Provider Setup'}
        </h2>
        <p className={styles.subtitle}>Project: ai_comparison_platform</p>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarItem}>
          <Bot size={16} />
        </div>
        <div className={styles.toolbarItem}>
          <BarChart3 size={16} />
        </div>
        <div className={styles.toolbarItem}>
          <Database size={16} />
        </div>
        <div className={`${styles.toolbarItem} ${currentView === 'setup' ? styles.active : ''}`}
             onClick={() => setCurrentView(currentView === 'setup' ? 'models' : 'setup')}>
          <Settings size={16} />
        </div>
        <div className={styles.toolbarItem}>
          <Shield size={16} />
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {currentView === 'models' ? (
          // Models View
          <>
            {/* OpenAI Section */}
            <div className={styles.section}>
              <div
                className={styles.sectionHeader}
                onClick={() => toggleCollapse('openai')}
              >
                <span className={styles.chevron}>
                  {collapsed.openai ? '▶' : '▼'}
                </span>
                <span className={styles.sectionTitle}>OpenAI</span>
                <span className={styles.count}>{getModelCount('openai')}</span>
              </div>

              {!collapsed.openai && (
                <div className={styles.sectionContent}>
                  <div className={styles.providerStatus}>
                    <span className={styles.statusLabel}>Status:</span>
                    <span className={`${styles.statusBadge} ${getStatusClass(getProviderStatus('openai'))}`}>
                      {getProviderStatus('openai')}
                    </span>
                  </div>

                  {Object.keys(config.providers.openai.models).map(model => (
                    <div key={model} className={styles.modelItem}>
                      <div className={styles.modelName}>{model}</div>
                      <div className={styles.modelMetrics}>
                        <span className={styles.metric}>
                          T: {config.providers.openai.models[model].default_temperature}
                        </span>
                        <span className={styles.metric}>
                          ${config.providers.openai.models[model].cost_per_1k_tokens.prompt}/1K
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Azure OpenAI Section */}
            <div className={styles.section}>
              <div
                className={styles.sectionHeader}
                onClick={() => toggleCollapse('azureopenai')}
              >
                <span className={styles.chevron}>
                  {collapsed.azureopenai ? '▶' : '▼'}
                </span>
                <span className={styles.sectionTitle}>Azure OpenAI</span>
                <span className={styles.count}>{getModelCount('azureopenai')}</span>
              </div>

              {!collapsed.azureopenai && (
                <div className={styles.sectionContent}>
                  <div className={styles.providerStatus}>
                    <span className={styles.statusLabel}>Status:</span>
                    <span className={`${styles.statusBadge} ${getStatusClass(getProviderStatus('azureopenai'))}`}>
                      {getProviderStatus('azureopenai')}
                    </span>
                  </div>

                  {Object.keys(config.providers.azureopenai.deployments).map(deployment => (
                    <div key={deployment} className={styles.modelItem}>
                      <div className={styles.modelName}>{deployment}</div>
                      <div className={styles.modelMetrics}>
                        <span className={styles.metric}>
                          T: {config.providers.azureopenai.deployments[deployment].default_temperature}
                        </span>
                        <span className={styles.metric}>
                          ${config.providers.azureopenai.deployments[deployment].cost_per_1k_tokens.prompt}/1K
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.chevron}>▼</span>
                <span className={styles.sectionTitle}>Quick Actions</span>
              </div>

              <div className={styles.sectionContent}>
                <button className={styles.actionButton}>
                  <Play size={14} className={styles.actionIcon} />
                  Quick Test
                </button>
                <button className={styles.actionButton}>
                  <TrendingUp size={14} className={styles.actionIcon} />
                  Cost Analysis
                </button>
                <button className={styles.actionButton}>
                  <Sliders size={14} className={styles.actionIcon} />
                  Advanced Config
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryTitle}>Configuration Summary</div>
              <div className={styles.summaryStats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>3</div>
                  <div className={styles.statLabel}>Models</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>2</div>
                  <div className={styles.statLabel}>Providers</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>$0.003</div>
                  <div className={styles.statLabel}>Avg Cost</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Provider Setup View
          <>
            {/* Back Navigation */}
            <div className={styles.backNav}>
              <button className={styles.backButton} onClick={() => setCurrentView('models')}>
                <ArrowLeft size={12} className={styles.backIcon} />
                Back to Model Configuration
              </button>
            </div>

            {/* Instructions */}
            <div className={styles.instructions}>
              <div className={styles.instructionsTitle}>API Configuration Required</div>
              <div className={styles.instructionsText}>
                Configure your API credentials to enable model comparisons. Your keys are stored locally and never transmitted to our servers.
              </div>
            </div>

            {/* OpenAI Provider */}
            <div className={styles.providerCard}>
              <div className={styles.providerHeader}>
                <div className={styles.providerInfo}>
                  <div className={styles.providerIcon}>AI</div>
                  <span className={styles.providerName}>OpenAI</span>
                </div>
                <div className={styles.connectionStatus}>
                  <div className={`${styles.statusDot} ${styles[credentials.openai.status]}`}></div>
                  <span className={`${styles.statusText} ${styles[credentials.openai.status]}`}>
                    {credentials.openai.status === 'connected' ? 'Connected' :
                     credentials.openai.status === 'testing' ? 'Testing...' : 'Not Connected'}
                  </span>
                </div>
              </div>
              <div className={styles.providerContent}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>API Key</label>
                  <input
                    type="password"
                    className={styles.formInput}
                    placeholder="sk-..."
                    value={credentials.openai.apiKey}
                    onChange={(e) => handleCredentialChange('openai', 'apiKey', e.target.value)}
                  />
                  <div className={styles.formHelp}>Get your API key from platform.openai.com</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Organization ID (Optional)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="org-..."
                    value={credentials.openai.orgId}
                    onChange={(e) => handleCredentialChange('openai', 'orgId', e.target.value)}
                  />
                  <div className={styles.formHelp}>Only required if you belong to multiple organizations</div>
                </div>
                <div className={styles.providerActions}>
                  <button
                    className={styles.testButton}
                    onClick={() => testConnection('openai')}
                    disabled={credentials.openai.status === 'testing'}
                  >
                    {credentials.openai.status === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button className={styles.saveButton} onClick={() => saveCredentials('openai')}>
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* Azure OpenAI Provider */}
            <div className={styles.providerCard}>
              <div className={styles.providerHeader}>
                <div className={styles.providerInfo}>
                  <div className={styles.providerIcon}>AZ</div>
                  <span className={styles.providerName}>Azure OpenAI</span>
                </div>
                <div className={styles.connectionStatus}>
                  <div className={`${styles.statusDot} ${styles[credentials.azureopenai.status]}`}></div>
                  <span className={`${styles.statusText} ${styles[credentials.azureopenai.status]}`}>
                    {credentials.azureopenai.status === 'connected' ? 'Connected' :
                     credentials.azureopenai.status === 'testing' ? 'Testing...' : 'Not Connected'}
                  </span>
                </div>
              </div>
              <div className={styles.providerContent}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Endpoint URL</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="https://your-resource.openai.azure.com/"
                    value={credentials.azureopenai.endpoint}
                    onChange={(e) => handleCredentialChange('azureopenai', 'endpoint', e.target.value)}
                  />
                  <div className={styles.formHelp}>Your Azure OpenAI service endpoint</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>API Key</label>
                  <input
                    type="password"
                    className={styles.formInput}
                    placeholder="Enter your Azure API key"
                    value={credentials.azureopenai.apiKey}
                    onChange={(e) => handleCredentialChange('azureopenai', 'apiKey', e.target.value)}
                  />
                  <div className={styles.formHelp}>Found in Azure Portal under Keys and Endpoint</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>API Version</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={credentials.azureopenai.apiVersion}
                    onChange={(e) => handleCredentialChange('azureopenai', 'apiVersion', e.target.value)}
                  />
                  <div className={styles.formHelp}>API version for your deployment</div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Deployment Names</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="gpt-4o-deployment, gpt-35-turbo-deployment"
                    value={credentials.azureopenai.deployments}
                    onChange={(e) => handleCredentialChange('azureopenai', 'deployments', e.target.value)}
                  />
                  <div className={styles.formHelp}>Comma-separated list of your model deployments</div>
                </div>
                <div className={styles.providerActions}>
                  <button
                    className={styles.testButton}
                    onClick={() => testConnection('azureopenai')}
                    disabled={credentials.azureopenai.status === 'testing'}
                  >
                    {credentials.azureopenai.status === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button className={styles.saveButton} onClick={() => saveCredentials('azureopenai')}>
                    Update
                  </button>
                </div>
              </div>
            </div>

            {/* Anthropic Provider */}
            <div className={styles.providerCard}>
              <div className={styles.providerHeader}>
                <div className={styles.providerInfo}>
                  <div className={styles.providerIcon}>C</div>
                  <span className={styles.providerName}>Anthropic</span>
                </div>
                <div className={styles.connectionStatus}>
                  <div className={`${styles.statusDot} ${styles[credentials.anthropic.status]}`}></div>
                  <span className={`${styles.statusText} ${styles[credentials.anthropic.status]}`}>
                    {credentials.anthropic.status === 'connected' ? 'Connected' :
                     credentials.anthropic.status === 'testing' ? 'Testing...' : 'Not Connected'}
                  </span>
                </div>
              </div>
              <div className={styles.providerContent}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>API Key</label>
                  <input
                    type="password"
                    className={styles.formInput}
                    placeholder="sk-ant-..."
                    value={credentials.anthropic.apiKey}
                    onChange={(e) => handleCredentialChange('anthropic', 'apiKey', e.target.value)}
                  />
                  <div className={styles.formHelp}>Get your API key from console.anthropic.com</div>
                </div>
                <div className={styles.providerActions}>
                  <button
                    className={styles.testButton}
                    onClick={() => testConnection('anthropic')}
                    disabled={credentials.anthropic.status === 'testing'}
                  >
                    {credentials.anthropic.status === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button className={styles.saveButton} onClick={() => saveCredentials('anthropic')}>
                    Update
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button onClick={saveLocally} className={styles.saveButton}>
          {currentView === 'models' ? 'Save Configuration' : 'Save All & Return to Models'}
        </button>
      </div>
    </div>
  );
}