import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import styles from './AccountPage.module.css';

const ApiKeyManagement = ({ selectedWorkspace, fetchWithAuth, API_BASE_URL, onError, onSuccess }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState(new Set());

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

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

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

  if (!selectedWorkspace) {
    return <p className={styles.textGray500}>Select a workspace to manage API keys.</p>;
  }

  if (loading) {
    return <p className={styles.textGray500}>Loading API keys...</p>;
  }

  return (
    <div className={styles.spaceY6}>
      <div className={styles.flexBetween}>
        <div>
          <h3 className={styles.cardTitle}>API Keys for {selectedWorkspace.name}</h3>
          <p className={styles.textGray600}>Manage API keys for accessing workspace resources</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`${styles.buttonPrimary} ${styles.flexCenter} ${styles.gap2}`}
        >
          <Plus className={styles.buttonIcon} /> Create API Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
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
    </div>
  );
};

export default ApiKeyManagement;