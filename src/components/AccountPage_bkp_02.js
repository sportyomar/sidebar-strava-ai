// Key fixes applied:
// 1. Removed LLM prefetching from parent - let child handle it
// 2. Fixed dependency arrays to prevent unnecessary re-renders
// 3. Made effects more stable

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Settings, Users, FolderOpen, Plus, Edit, Trash2,
  CheckCircle, BarChart3, Globe, Database, Zap, FileText, Key
} from 'lucide-react';
import ProfileNavBar from './ProfileNavBar';
import styles from './AccountPage.module.css';
import ApiKeyManagement from './ApiKeyManagement';
import LLMManagement from './LLMManagement';
import AccountHeader from './AccountHeader';

// const AccountHeader = React.memo(() => (
//   <div className={styles.header}>
//     <h1 className={styles.title}>Account Management</h1>
//     <p className={styles.subtitle}>Manage your organization, workspaces, and team</p>
//   </div>
// ));

const TabsNav = React.memo(({ tabs, currentTab, onTabChange }) => {
  // Group tabs by their group property
  const groupedTabs = useMemo(() => {
    const groups = {};
    tabs.forEach(tab => {
      if (!groups[tab.group]) {
        groups[tab.group] = [];
      }
      groups[tab.group].push(tab);
    });
    return groups;
  }, [tabs]);

  const groupOrder = ['core', 'technical', 'content'];

  return (
    <div className={styles.tabsContainer}>
      <nav className={styles.tabsNav}>
        <div className={styles.tabGroups}>
          {groupOrder.map(groupKey => {
            const groupTabs = groupedTabs[groupKey];
            if (!groupTabs) return null;

            return (
              <div key={groupKey} className={styles.tabGroup}>
                {groupTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={`${styles.tab} ${currentTab === tab.id ? styles.active : styles.inactive}`}
                      data-group={tab.group}
                    >
                      <Icon className={styles.tabIcon} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
});

const TabPane = ({ active, children }) => (
  <div style={{ display: active ? 'block' : 'none' }}>{children}</div>
);

const AccountPage = ({
}) => {
  const navigate = useNavigate();

  // UI
  const [currentTab, setCurrentTab] = useState('organization');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Core data
  const [organization, setOrganization] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // Tab data
  const [teamMembers, setTeamMembers] = useState([]);
  const [availableAPIs, setAvailableAPIs] = useState([]);
  const [workspaceAPIs, setWorkspaceAPIs] = useState([]);
  const [workspaceProjects, setWorkspaceProjects] = useState([]);

  // Tab loading flags (scoped)
  const [loadingTab, setLoadingTab] = useState({
    organization: false,
    workspaces: false,
    apis: false,
    llms: false,
    projects: false,
    team: false
  });
  const [loadedTab, setLoadedTab] = useState({
    organization: false,
    workspaces: false,
    apis: false,
    llms: false,
    projects: false,
    team: false
  });

  // Modal
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '' });

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002';

  const tabs = useMemo(() => [
    // Core Group
    { id: 'organization', label: 'Organization', icon: Building2, group: 'core' },
    { id: 'workspaces', label: 'Workspaces', icon: FolderOpen, group: 'core' },
    { id: 'team', label: 'Team', icon: Users, group: 'core' },

    // Technical Group
    { id: 'apis', label: 'Integrations', icon: Settings, group: 'technical' },
    { id: 'llms', label: 'AI Models', icon: Zap, group: 'technical' },
    { id: 'apikeys', label: 'API Keys', icon: Key, group: 'technical' },

    // Content Group
    { id: 'projects', label: 'Projects', icon: FolderOpen, group: 'content' },
  ], []);

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  }, []);

  const getAPIIcon = useCallback((category) => {
    switch (category) {
      case 'content': return <FileText className={styles.cardIcon} />;
      case 'analytics': return <BarChart3 className={styles.cardIcon} />;
      case 'integration': return <Database className={styles.cardIcon} />;
      case 'tools': return <Zap className={styles.cardIcon} />;
      case 'admin': return <Settings className={styles.cardIcon} />;
      default: return <Globe className={styles.cardIcon} />;
    }
  }, []);

  // ---- Initial load: org + workspaces (once) ----
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoadingTab(t => ({ ...t, organization: true, workspaces: true }));
        const [orgRes, wsRes] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/api/account/organization`),
          fetchWithAuth(`${API_BASE_URL}/api/account/workspaces`)
        ]);

        if (!ignore) {
          if (orgRes.ok) setOrganization(await orgRes.json());
          if (wsRes.ok) {
            const ws = await wsRes.json();
            setWorkspaces(ws);
            if (!selectedWorkspace && ws.length > 0) setSelectedWorkspace(ws[0]);
          }
          setLoadedTab(l => ({ ...l, organization: true, workspaces: true }));
        }
      } catch (e) {
        if (!ignore) setError('Failed to load account data.');
      } finally {
        if (!ignore) setLoadingTab(t => ({ ...t, organization: false, workspaces: false }));
      }
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← only on mount

  // ---- Promise-cached prefetch to prevent race conditions ----
  const activePromises = useRef(new Map());

  const prefetchTab = useCallback(async (tabId, wsId) => {
    const requestKey = `${tabId}-${wsId || 'global'}`;
    console.log(`🔍 prefetchTab called: ${tabId}, workspace: ${wsId}`);

    // Skip unsupported tabs
    if (tabId === 'organization' || tabId === 'workspaces') return;
    if (!wsId && (tabId === 'apis' || tabId === 'llms' || tabId === 'projects')) return;

    // Skip if already loaded
    if (loadedTab[tabId]) {
      console.log(`⚠️ Already loaded ${tabId}, skipping`);
      return;
    }

    // FIXED: Skip LLMs tab - let the child component handle it completely
    if (tabId === 'llms') {
      console.log(`⚠️ Skipping LLMs prefetch - child component handles it`);
      return;
    }

    // Return existing promise if request is already in flight
    if (activePromises.current.has(requestKey)) {
      console.log(`⚠️ Request already in flight for ${requestKey}, returning existing promise`);
      return activePromises.current.get(requestKey);
    }

    // Create new promise and cache it
    const promise = (async () => {
      try {
        setLoadingTab(t => ({ ...t, [tabId]: true }));

        if (tabId === 'team') {
          const res = await fetchWithAuth(`${API_BASE_URL}/api/account/team`);
          if (res.ok) setTeamMembers(await res.json());
          setLoadedTab(l => ({ ...l, team: true }));
        }

        if (tabId === 'apis') {
          const [wsApisRes, availableRes] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/api/account/workspaces/${wsId}/apis`),
            fetchWithAuth(`${API_BASE_URL}/api/account/modules/available`)
          ]);
          if (wsApisRes.ok) setWorkspaceAPIs(await wsApisRes.json());
          if (availableRes.ok) setAvailableAPIs(await availableRes.json());
          setLoadedTab(l => ({ ...l, apis: true }));
        }

        if (tabId === 'projects') {
          const res = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces/${wsId}/projects`);
          if (res.ok) setWorkspaceProjects(await res.json());
          setLoadedTab(l => ({ ...l, projects: true }));
        }

        console.log(`✅ Finished loading ${tabId}`);
      } catch (e) {
        console.error(`❌ Error loading ${tabId}:`, e);
        setError('Failed to load tab data.');
      } finally {
        setLoadingTab(t => ({ ...t, [tabId]: false }));
        // Remove promise from cache when complete
        activePromises.current.delete(requestKey);
      }
    })();

    // Cache the promise
    activePromises.current.set(requestKey, promise);
    return promise;

  }, [API_BASE_URL, fetchWithAuth, loadedTab]);

  // Trigger prefetch when user switches tabs
  const handleTabChange = useCallback((newTab) => {
    if (newTab === currentTab) return;
    console.log(`🎯 User switched to ${newTab}`);
    setCurrentTab(newTab);
    setError('');
    setSuccess('');

    // Only prefetch if it's not the LLMs tab (child handles that)
    if (newTab !== 'llms') {
      prefetchTab(newTab, selectedWorkspace?.id);
    }
  }, [currentTab, prefetchTab, selectedWorkspace]);

  // FIXED: Split workspace effect - reset loaded flags when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) return;

    // Reset loaded flags for workspace-dependent tabs (excluding llms)
    setLoadedTab(l => ({
      ...l,
      apis: false,
      projects: false,
      // Note: We don't manage llms here since child component handles it completely
    }));
  }, [selectedWorkspace?.id]); // FIXED: Use selectedWorkspace.id instead of full object

  // FIXED: Prefetch data when needed (runs after flags are reset)
  useEffect(() => {
    if (selectedWorkspace && currentTab && !loadedTab[currentTab] && currentTab !== 'llms') {
      console.log(`🎯 Initial prefetch for ${currentTab}`);
      prefetchTab(currentTab, selectedWorkspace.id);
    }
  }, [selectedWorkspace?.id, currentTab, loadedTab, prefetchTab]); // FIXED: Use selectedWorkspace.id

  // Actions
  const createWorkspace = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces`, {
        method: 'POST',
        body: JSON.stringify(newWorkspace)
      });
      if (res.ok) {
        setSuccess('Workspace created successfully');
        setShowCreateWorkspace(false);
        setNewWorkspace({ name: '', description: '' });
        // refresh list
        const wsRes = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces`);
        if (wsRes.ok) {
          const ws = await wsRes.json();
          setWorkspaces(ws);
          if (!selectedWorkspace && ws.length > 0) setSelectedWorkspace(ws[0]);
        }
      } else {
        setError('Failed to create workspace');
      }
    } catch {
      setError('Network error');
    }
  }, [API_BASE_URL, fetchWithAuth, newWorkspace, selectedWorkspace]);

  const toggleWorkspaceAPI = useCallback(async (apiId, enabled) => {
    if (!selectedWorkspace) return;
    try {
      const method = enabled ? 'DELETE' : 'POST';
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/account/workspaces/${selectedWorkspace.id}/apis/${apiId}`,
        { method }
      );
      if (res.ok) {
        setSuccess(enabled ? 'API disabled' : 'API enabled');
        // refresh current workspace APIs
        const wsApisRes = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces/${selectedWorkspace.id}/apis`);
        if (wsApisRes.ok) setWorkspaceAPIs(await wsApisRes.json());
      } else {
        setError('Failed to update API');
      }
    } catch {
      setError('Network error');
    }
  }, [API_BASE_URL, fetchWithAuth, selectedWorkspace]);

  const handleWorkspaceChange = useCallback((e) => {
    const ws = workspaces.find(w => w.id === Number(e.target.value));
    setSelectedWorkspace(ws || null);
  }, [workspaces]);

  // ---- Render helpers ----
  const OrganizationTab = (
    <div className={styles.spaceY6}>
      <div className={styles.card}>
        <h3 className={`${styles.cardHeader} ${styles.cardTitle}`}>
          <Building2 className={styles.cardIcon} />
          Organization Settings
        </h3>
        {loadingTab.organization && !organization ? (
          <div className={styles.textGray500}>Loading...</div>
        ) : organization ? (
          <div className={styles.spaceY4}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Organization Name</label>
              <input type="text" value={organization.name || ''} className={styles.input} readOnly />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Billing Email</label>
              <input type="email" value={organization.billing_email || ''} className={styles.input} readOnly />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Subscription</label>
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>{organization.subscription_tier || 'Free'}</span>
            </div>
          </div>
        ) : (
          <p className={styles.textGray500}>No organization data available</p>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={`${styles.cardTitle} ${styles.mb4}`}>Workspaces Overview</h3>
        <div className={`${styles.grid} ${styles.gridCols1} ${styles.gridCols2} ${styles.gridCols3}`}>
          {workspaces.map(ws => (
            <div key={ws.id} className={styles.workspaceCard}>
              <h4 className={styles.workspaceCardTitle}>{ws.name}</h4>
              <p className={`${styles.workspaceCardDescription} ${styles.mt2}`}>{ws.description}</p>
              <div className={`${styles.workspaceCardMeta} ${styles.mt2}`}>{ws.project_count} projects</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const WorkspacesTab = (
    <div className={styles.spaceY6}>
      <div className={styles.flexBetween}>
        <h3 className={styles.cardTitle}>Workspace Management</h3>
        <button onClick={() => setShowCreateWorkspace(true)} className={`${styles.buttonPrimary} ${styles.flexCenter} ${styles.gap2}`}>
          <Plus className={styles.buttonIcon} /> Create Workspace
        </button>
      </div>

      <div className={styles.grid}>
        {workspaces.map(ws => (
          <div key={ws.id} className={styles.workspaceCard}>
            <div className={styles.workspaceCardHeader}>
              <div>
                <h4 className={styles.workspaceCardTitle}>{ws.name}</h4>
                <p className={styles.workspaceCardDescription}>{ws.description}</p>
                <div className={styles.workspaceCardMeta}>
                  Created {new Date(ws.created_at).toLocaleDateString()} • {ws.project_count} projects
                </div>
              </div>
              <div className={styles.workspaceCardActions}>
                <button className={styles.iconButton}><Edit className={styles.buttonIcon} /></button>
                <button className={`${styles.iconButton} ${styles.iconButtonDanger}`}><Trash2 className={styles.buttonIcon} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateWorkspace && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Create New Workspace</h3>
            <div className={styles.spaceY4}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Workspace Name</label>
                <input type="text" value={newWorkspace.name} onChange={(e) => setNewWorkspace(p => ({ ...p, name: e.target.value }))} className={styles.input} placeholder="e.g., Sales Operations" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea value={newWorkspace.description} onChange={(e) => setNewWorkspace(p => ({ ...p, description: e.target.value }))} className={styles.textarea} rows="3" placeholder="Describe the purpose of this workspace" />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowCreateWorkspace(false)} className={styles.modalCancel}>Cancel</button>
              <button onClick={createWorkspace} className={styles.buttonPrimary}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const APIsTab = (
    <div className={styles.spaceY6}>
      {!selectedWorkspace ? (
        <p className={styles.textGray500}>Select a workspace to manage APIs.</p>
      ) : loadingTab.apis && !loadedTab.apis ? (
        <p className={styles.textGray500}>Loading APIs…</p>
      ) : (
        <>
          <div>
            <h3 className={styles.cardTitle}>APIs & Services for {selectedWorkspace.name}</h3>
            <p className={styles.textGray600}>Manage which APIs are enabled for this workspace</p>
          </div>

          <div className={styles.grid}>
            {availableAPIs.map(api => {
              const isEnabled = workspaceAPIs.some(wa => wa.api_module_id === api.id);
              return (
                <div key={api.id} className={styles.apiCard}>
                  <div className={styles.apiCardContent}>
                    <div className={styles.apiCardLeft}>
                      {getAPIIcon(api.category)}
                      <div>
                        <h4 className={styles.apiCardTitle}>{api.name}</h4>
                        <p className={styles.apiCardDescription}>{api.description}</p>
                        <div className={styles.apiCardMeta}>{api.endpoints} endpoints • {api.quota_limit}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleWorkspaceAPI(api.id, isEnabled)}
                      className={`${isEnabled ? styles.buttonSuccess : styles.buttonSecondary} ${styles.flexCenter} ${styles.gap2}`}
                    >
                      {isEnabled ? (<><CheckCircle className={styles.buttonIcon} /> Enabled</>) : (<><Plus className={styles.buttonIcon} /> Enable</>)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  const ProjectsTab = (
    <div className={styles.spaceY6}>
      {!selectedWorkspace ? (
        <p className={styles.textGray500}>Select a workspace to view projects.</p>
      ) : loadingTab.projects && !loadedTab.projects ? (
        <p className={styles.textGray500}>Loading projects…</p>
      ) : (
        <>
          <div>
            <h3 className={styles.cardTitle}>Projects in {selectedWorkspace.name}</h3>
            <p className={styles.textGray600}>Manage projects within this workspace</p>
          </div>

          <div className={styles.grid}>
            {workspaceProjects.map(project => (
              <div key={project.id} className={styles.projectCard}>
                <div className={styles.projectCardHeader}>
                  <div>
                    <h4 className={styles.projectCardTitle}>{project.name}</h4>
                    <p className={styles.projectCardDescription}>{project.description}</p>
                    <div className={styles.projectCardMeta}>
                      Created by {project.created_by_name} • {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={styles.projectCardActions}>
                    <button className={styles.iconButton}><Edit className={styles.buttonIcon} /></button>
                    <button className={`${styles.iconButton} ${styles.iconButtonDanger}`}><Trash2 className={styles.buttonIcon} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const TeamTab = (
    <div className={styles.spaceY6}>
      {loadingTab.team && !loadedTab.team ? (
        <p className={styles.textGray500}>Loading team…</p>
      ) : (
        <>
          <div>
            <h3 className={styles.cardTitle}>Team Members</h3>
            <p className={styles.textGray600}>Manage organization team members and their roles</p>
          </div>

          <div className={styles.table}>
            <div className={styles.tableContainer}>
              <table>
                <thead className={styles.tableHeader}>
                  <tr>
                    <th className={styles.tableHeaderCell}>Member</th>
                    <th className={styles.tableHeaderCell}>Role</th>
                    <th className={styles.tableHeaderCell}>Joined</th>
                    <th className={styles.tableHeaderCell}>Actions</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {teamMembers.map(member => (
                    <tr key={member.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <div className={styles.memberInfo}>
                          <div className={styles.memberAvatar}>
                            {member.display_name?.charAt(0) || member.username.charAt(0)}
                          </div>
                          <div className={styles.memberDetails}>
                            <div className={styles.memberName}>
                              {member.display_name || member.username}
                            </div>
                            <div className={styles.memberEmail}>{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCell}><span className={styles.badge}>{member.role}</span></td>
                      <td className={`${styles.tableCell} ${styles.textGray500}`}>{new Date(member.joined_at).toLocaleDateString()}</td>
                      <td className={`${styles.tableCell} ${styles.textGray500}`}><button className={styles.tableAction}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div>
      <ProfileNavBar onBackToApp={() => navigate('/dashboard')} />

      <div className={styles.container}>
        <AccountHeader currentTab={currentTab} selectedWorkspace={selectedWorkspace} />

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        <TabsNav tabs={tabs} currentTab={currentTab} onTabChange={handleTabChange} />

        {['apis', 'llms', 'apikeys', 'projects',].includes(currentTab) && workspaces.length > 0 && (
          <div className={styles.workspaceSelector}>
            <label className={styles.workspaceSelectorLabel}>Select Workspace:</label>
            <select value={selectedWorkspace?.id || ''} onChange={handleWorkspaceChange} className={styles.workspaceSelectorSelect}>
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          </div>
        )}

        <div className={styles.tabContent}>
          <TabPane active={currentTab === 'organization'}>{OrganizationTab}</TabPane>
          <TabPane active={currentTab === 'workspaces'}>{WorkspacesTab}</TabPane>
          <TabPane active={currentTab === 'apis'}>{APIsTab}</TabPane>
          <TabPane active={currentTab === 'llms'}>
            <LLMManagement
              selectedWorkspace={selectedWorkspace}
              fetchWithAuth={fetchWithAuth}
              API_BASE_URL={API_BASE_URL}
              onError={setError}
              onSuccess={setSuccess}
            />
          </TabPane>
          <TabPane active={currentTab === 'apikeys'}>
          <ApiKeyManagement
            selectedWorkspace={selectedWorkspace}
            fetchWithAuth={fetchWithAuth}
            API_BASE_URL={API_BASE_URL}
            onError={setError}
            onSuccess={setSuccess}
          />
        </TabPane>
          <TabPane active={currentTab === 'projects'}>{ProjectsTab}</TabPane>
          <TabPane active={currentTab === 'team'}>{TeamTab}</TabPane>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;