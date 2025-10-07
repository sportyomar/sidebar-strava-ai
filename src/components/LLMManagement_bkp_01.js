// Key fixes applied:
// 1. Use consistent API endpoints (/api/account/workspaces/...)
// 2. Removed selectedModelId from loadModels dependencies to prevent thrashing
// 3. Made workspace change effect more stable
// 4. Added abort controller for race condition protection

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Settings, Play, CheckCircle, Plus, Trash2, Shield, Eye, EyeOff } from 'lucide-react';

const LLMManagement = ({ selectedWorkspace, fetchWithAuth, API_BASE_URL, onError, onSuccess }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [configForm, setConfigForm] = useState({
    temperature: 0.7,
    max_tokens: 1000,
    system_prompt: '',
    tool_choice: 'auto'
  });
  const [testForm, setTestForm] = useState({
    prompt: 'Hello! Please introduce yourself.',
    testing: false,
    result: null
  });

  // FIXED: Add ref to track abort controller
  const abortControllerRef = useRef(null);

  // FIXED: Removed selectedModelId from dependencies to prevent recreation
  const loadModels = useCallback(async () => {
    if (!selectedWorkspace) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    try {
      // FIXED: Use correct API endpoint (no /account prefix for LLMs)
      const res = await fetchWithAuth(`${API_BASE_URL}/api/workspaces/${selectedWorkspace.id}/llms`, {
        signal // Add abort signal
      });

      if (signal.aborted) return; // Don't process if aborted

      if (res.ok) {
        const data = await res.json();

        // Handle both legacy array format and new object format
        const modelsList = Array.isArray(data) ? data : data.models || [];
        setModels(modelsList);

        // Auto-select first enabled model or first model (only if no model selected)
        if (!selectedModelId && modelsList.length > 0) {
          const firstEnabled = modelsList.find(m => m.enabled);
          const firstModel = modelsList[0];
          if (firstEnabled || firstModel) {
            setSelectedModelId((firstEnabled || firstModel).modelId);
          }
        }
      } else {
        onError('Failed to load models');
      }
    } catch (error) {
      if (!signal.aborted) {
        onError('Network error loading models');
        console.error('Error loading models:', error);
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
      // Clean up the abort controller reference
      if (abortControllerRef.current === signal.signal) {
        abortControllerRef.current = null;
      }
    }
  }, [selectedWorkspace, fetchWithAuth, API_BASE_URL, onError]); // FIXED: Removed selectedModelId

  // FIXED: More stable workspace change effect
  useEffect(() => {
    // Clear state when workspace changes to prevent leakage
    setModels([]);
    setSelectedModelId(null);
    setConfigForm({
      temperature: 0.7,
      max_tokens: 1000,
      system_prompt: '',
      tool_choice: 'auto'
    });
    setTestForm({
      prompt: 'Hello! Please introduce yourself.',
      testing: false,
      result: null
    });

    // Load models for new workspace
    if (selectedWorkspace) {
      loadModels();
    }

    // Cleanup function to abort requests when workspace changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [selectedWorkspace?.id, loadModels]); // FIXED: Use workspace.id instead of full object

  // Update form when selected model changes
  useEffect(() => {
    const selectedModel = models.find(m => m.modelId === selectedModelId);
    if (selectedModel && selectedModel.effectiveConfig) {
      setConfigForm({
        temperature: selectedModel.effectiveConfig.temperature || 0.7,
        max_tokens: selectedModel.effectiveConfig.max_tokens || 1000,
        system_prompt: selectedModel.effectiveConfig.system_prompt || '',
        tool_choice: selectedModel.effectiveConfig.tool_choice || 'auto'
      });
    }
  }, [selectedModelId, models]);

  const toggleModelEnabled = useCallback(async (modelId, enabled) => {
    try {
      // FIXED: Use correct API endpoint
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/workspaces/${selectedWorkspace.id}/llms/${modelId}/enable`,
        {
          method: 'PATCH',
          body: JSON.stringify({ enabled: !enabled })
        }
      );

      if (res.ok) {
        onSuccess(enabled ? 'Model disabled' : 'Model enabled');
        loadModels(); // Refresh the list
      } else {
        const error = await res.json();
        onError(error.error || 'Failed to update model');
      }
    } catch (error) {
      onError('Network error updating model');
    }
  }, [selectedWorkspace, fetchWithAuth, API_BASE_URL, onSuccess, onError, loadModels]);

  const setModelAsDefault = useCallback(async (modelId, isDefault) => {
    try {
      // FIXED: Use correct API endpoint
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/workspaces/${selectedWorkspace.id}/llms/${modelId}/default`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isDefault: !isDefault })
        }
      );

      if (res.ok) {
        onSuccess(isDefault ? 'Removed as default' : 'Set as default');
        loadModels(); // Refresh the list
      } else {
        const error = await res.json();
        onError(error.error || 'Failed to update default model');
      }
    } catch (error) {
      onError('Network error updating default model');
    }
  }, [selectedWorkspace, fetchWithAuth, API_BASE_URL, onSuccess, onError, loadModels]);

  const saveConfig = useCallback(async () => {
    if (!selectedModelId) return;

    try {
      // FIXED: Use correct API endpoint
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/workspaces/${selectedWorkspace.id}/llms/${selectedModelId}/config`,
        {
          method: 'PUT',
          body: JSON.stringify(configForm)
        }
      );

      if (res.ok) {
        onSuccess('Configuration saved');
        loadModels(); // Refresh to get updated effective config
      } else {
        const error = await res.json();
        onError(error.error || 'Failed to save configuration');
      }
    } catch (error) {
      onError('Network error saving configuration');
    }
  }, [selectedModelId, selectedWorkspace, configForm, fetchWithAuth, API_BASE_URL, onSuccess, onError, loadModels]);

  const testModel = useCallback(async () => {
    if (!selectedModelId || !testForm.prompt.trim()) return;

    setTestForm(prev => ({ ...prev, testing: true, result: null }));

    try {
      // FIXED: Use correct API endpoint
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/workspaces/${selectedWorkspace.id}/llms/validate`,
        {
          method: 'POST',
          body: JSON.stringify({
            modelId: selectedModelId,
            prompt: testForm.prompt,
            settingsOverride: configForm
          })
        }
      );

      if (res.ok) {
        const result = await res.json();
        setTestForm(prev => ({ ...prev, result }));
        if (result.success) {
          onSuccess('Model test completed');
        } else {
          onError(result.provider_error || 'Model test failed');
        }
      } else {
        const error = await res.json();
        onError(error.error || 'Failed to test model');
      }
    } catch (error) {
      onError('Network error testing model');
    } finally {
      setTestForm(prev => ({ ...prev, testing: false }));
    }
  }, [selectedModelId, selectedWorkspace, testForm.prompt, configForm, fetchWithAuth, API_BASE_URL, onSuccess, onError]);

  const selectedModel = models.find(m => m.modelId === selectedModelId);

  if (!selectedWorkspace) {
    return <p style={{ color: '#6b7280' }}>Select a workspace to manage LLMs.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
          LLMs & Models for {selectedWorkspace.name}
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          Manage language models and their configurations for this workspace
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading models...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left Panel: Models List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>Available Models</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {models.map(model => (
                <div
                  key={model.modelId}
                  onClick={() => setSelectedModelId(model.modelId)}
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${selectedModelId === model.modelId ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    backgroundColor: selectedModelId === model.modelId ? '#eff6ff' : 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={16} style={{ color: '#6b7280' }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        {model.modelId}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {model.modelInfo?.provider} • {model.modelInfo?.cap} tokens
                        {model.isDefault && <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>• Default</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Default Radio */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModelAsDefault(model.modelId, model.isDefault);
                      }}
                      disabled={!model.enabled}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: model.isDefault ? '#10b981' : '#d1d5db',
                        backgroundColor: model.isDefault ? '#10b981' : 'white',
                        cursor: model.enabled ? 'pointer' : 'not-allowed',
                        opacity: model.enabled ? 1 : 0.5
                      }}
                      title={model.enabled ? 'Set as default' : 'Enable model first'}
                    />

                    {/* Enable Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModelEnabled(model.modelId, model.enabled);
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        borderRadius: '0.25rem',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: model.enabled ? '#10b981' : '#6b7280',
                        color: 'white'
                      }}
                    >
                      {model.enabled ? 'Enabled' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedModel ? (
              <>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                  Configure {selectedModel.modelId}
                </h4>

                {/* Configuration Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                      Temperature ({configForm.temperature})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={configForm.temperature}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Controls randomness. Lower = more focused, Higher = more creative
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedModel.modelInfo?.cap || 4000}
                      value={configForm.max_tokens}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 1000 }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Maximum response length (1-{selectedModel.modelInfo?.cap || 4000})
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                      System Prompt
                    </label>
                    <textarea
                      value={configForm.system_prompt}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, system_prompt: e.target.value }))}
                      placeholder="Optional instructions for the model..."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                      Tool Choice
                    </label>
                    <select
                      value={configForm.tool_choice}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, tool_choice: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="auto">Auto</option>
                      <option value="none">None</option>
                      <option value="required">Required</option>
                    </select>
                  </div>

                  <button
                    onClick={saveConfig}
                    disabled={!selectedModel.enabled}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: selectedModel.enabled ? '#3b82f6' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: selectedModel.enabled ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Save Configuration
                  </button>

                  {!selectedModel.enabled && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                      Enable the model first to save configuration
                    </div>
                  )}
                </div>

                {/* Test Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
                  <h5 style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Play size={16} />
                    Test Model
                  </h5>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                      Test Prompt
                    </label>
                    <textarea
                      value={testForm.prompt}
                      onChange={(e) => setTestForm(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Enter a test prompt..."
                      rows="2"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <button
                    onClick={testModel}
                    disabled={testForm.testing || !selectedModel.enabled || !testForm.prompt.trim()}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: (testForm.testing || !selectedModel.enabled) ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: (testForm.testing || !selectedModel.enabled) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      justifyContent: 'center'
                    }}
                  >
                    {testForm.testing ? 'Testing...' : 'Run Test'}
                  </button>

                  {testForm.result && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: testForm.result.success ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${testForm.result.success ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: '0.25rem'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                        Test Result ({testForm.result.latency_ms}ms • {testForm.result.total_tokens} tokens)
                      </div>
                      <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                        {testForm.result.truncated_output}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <Zap size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <p>Select a model to configure</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMManagement;