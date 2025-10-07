import React, {useContext, useState, useEffect, useRef} from 'react';
import {Link} from 'react-router-dom';
import ProjectContext from '../contexts/ProjectContext';
import folderLabelsByModule from '../constants/folderLabelsByModule';
import mainStyles from "./MainApp.module.css";
import styles from "./AccessBar.module.css";
import profiles from '../profiles';
import assignments from '../profiles/assignments.json';
import {
    HelpCircle,
    AlertTriangle,
    Settings,
    Bell,
    LogOut,
    User,
    Palette,
    Keyboard,
    FlaskConical,
    RotateCcw,
    LayoutDashboard
} from 'lucide-react'; // Added AlertTriangle for warnings

function logSysAware(label, message) {
  console.log(`Sys Aware (06-27-2025) ${label}: ${message}`);
}

function toTitleCase(str) {
  return str
    .replace(/([A-Z])/g, ' $1') // split camelCase
    .replace(/^./, s => s.toUpperCase()) // capitalize first
    .replace(/([a-z])([A-Z])/g, '$1 $2'); // handle things like "memoEditor"
}

function getUserProfile(username, client, projectId) {
  if (!username) return profiles.default;

  const projectMatch = assignments.projects.find(
    p => p.client === client && p.project === projectId
  );
  const role = projectMatch?.members.find(m => m.username === username)?.role;
  const baseProfile = profiles[username];

  return {
    ...(baseProfile || profiles.default),
    defaultRole: role || baseProfile?.defaultRole || 'consultant',
    activeRole: role
  };
}

function getUserByRole(role, client, projectId) {
  const projectMatch = assignments.projects.find(
    p => p.client === client && p.project === projectId
  );
  return projectMatch?.members.find(m => m.role === role)?.username;
}

// New validation functions to replace auto-switching
function validateUserAccess(username, client, projectId, activeModule, mode) {
  const user = getUserProfile(username, client, projectId);
  const issues = [];

  // Check module access
  if (!user.allowedModules?.includes(activeModule)) {
    issues.push({
      type: 'module_access',
      message: `${user.displayName || username} doesn't have access to ${toTitleCase(activeModule)}`,
      suggestion: `Available modules: ${user.allowedModules?.map(toTitleCase).join(', ') || 'None'}`
    });
  }

  // Check role access for module
  const allowedRoles = user.allowedRolesByModule?.[activeModule] || [];
  if (!allowedRoles.includes(mode)) {
    issues.push({
      type: 'role_access',
      message: `Role "${toTitleCase(mode)}" not available for ${toTitleCase(activeModule)}`,
      suggestion: `Available roles: ${allowedRoles.map(toTitleCase).join(', ') || 'None'}`
    });
  }

  return issues;
}

function AccessBar({
   mode,
   setMode,
   activeModule,
   setActiveModule,
   extraContent,
   showDocsPanel,
   setShowDocsPanel,
   setDocsMenuOpen,
   docsMenuOpen,
   setShowTutorialPanel,
   setTutorialMenuOpen,
   tutorialMenuOpen
}){
  const docsMenuRef = useRef(null);
  const realUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  const { client, setClient, projectId, setProjectId, allClients, projectsByClient, getProjectTeam, selectedCompany, setSelectedCompany, selectedClientCompanies } = useContext(ProjectContext);
  let team = (getProjectTeam && getProjectTeam(projectId)) || [];
  if (realUser && !team.find(u => u.username === realUser.username)) {
      team = [...team, { username: realUser.username, role: 'partner' }]; // Default role
    }

  if (realUser && !profiles[realUser.username]) {
      profiles[realUser.username] = {
        username: realUser.username,
        displayName: realUser.display_name,
        avatar: realUser.avatar || '/avatars/default.jpg',
        defaultModule: 'memoEditor',
        defaultRole: 'partner',
        allowedModules: ['memoEditor', 'dealIntake', 'connectors', 'utilities'],
        allowedRolesByModule: {
          memoEditor: ['partner'],
          dealIntake: ['partner'],
          connectors: ['partner'],
          utilities: ['partner']
        }
      };
    }
  const projectsForClient = (projectsByClient && projectsByClient[client]) || [];
  const selectedProject = projectsForClient.find(p => p.id === projectId);
  const projectName = selectedProject?.name || '';
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  const [selectedUsername, setSelectedUsername] = useState(() => {
      return localStorage.getItem('selectedUsername') || team[0]?.username || '';
    });
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [accessIssues, setAccessIssues] = useState([]); // New state for validation issues
  const [showAccessWarning, setShowAccessWarning] = useState(false); // New state for warning display

  const userSelectorRef = useRef(null);
  const availableRoles = team.map(m => m.role);
  const defaultRole = availableRoles.includes('consultant') ? 'consultant' : availableRoles[0];
  const username = selectedUsername;
  const userProfile = profiles[username] || profiles.default;

  // Get role options - now returns all roles, we'll show validation instead of filtering
  const getRoleOptions = () => {
      const user = getUserProfile(username, client, projectId);
      const roles = user.allowedRolesByModule?.[activeModule] || [];

      // Return all possible roles but mark which are valid
      const allPossibleRoles = ['associate', 'consultant', 'engineer', 'admin', 'vpPrincipal', 'partnerExec', 'executive', 'partner'];

      return allPossibleRoles
        .filter(role => {
          // Show roles that are either allowed OR currently selected (to avoid breaking state)
          return roles.includes(role) || role === mode;
        })
        .map(role => ({
          value: role,
          label: toTitleCase(role),
          isValid: roles.includes(role)
        }));
    };

    const roleOptions = getRoleOptions();

    // Validation effect - replaces auto-switching with validation
    useEffect(() => {
      if (!selectedUsername || !client || !projectId || !activeModule || !mode) return;

      const issues = validateUserAccess(selectedUsername, client, projectId, activeModule, mode);
      setAccessIssues(issues);
      setShowAccessWarning(issues.length > 0);

      if (issues.length > 0) {
        logSysAware('Access Validation', `Issues found: ${issues.map(i => i.type).join(', ')}`);
      }
    }, [selectedUsername, client, projectId, activeModule, mode]);

    useEffect(() => {
      fetch('/notifications.json')
        .then(res => res.json())
        .then(data => setNotifications(data))
        .catch(err => console.error('Failed to load notifications:', err));
    }, []);

    const handleModuleChange = (newModule) => {
        setActiveModule(newModule);
        logSysAware('Module Change', `User switched to module: "${newModule}"`);

        // NO AUTO-SWITCHING - let validation catch issues instead
    };

    const handleUserSelect = (username) => {
        setSelectedUsername(username);
        setShowUserDropdown(false);
        logSysAware('User Switch', `Selected user: "${username}"`);

        // NO AUTO-SWITCHING - let validation catch issues instead
    };

    const handleRoleChange = (newRole) => {
        setMode(newRole);
        logSysAware('Role Change', `Switched role to "${newRole}"`);

        // NO AUTO-SWITCHING - let validation catch issues instead
    };

    // Basic initialization - only set defaults if nothing is selected
    useEffect(() => {
      if (team.length > 0 && !selectedUsername) {
        setSelectedUsername(team[0].username);
        logSysAware('Init', `Set initial user: ${team[0].username}`);
      }
    }, [team, selectedUsername]);

    // Click outside handlers
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (userSelectorRef.current && !userSelectorRef.current.contains(event.target)) {
          setShowUserDropdown(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(()=> {
        const handleClickOutside = (event) => {
            if (userSelectorRef.current && !userSelectorRef.current.contains(event.target)) {
              setShowUserDropdown(false);
            }
            if (docsMenuRef.current && !docsMenuRef.current.contains(event.target)) {
              setDocsMenuOpen(false);
            }
          };
          document.addEventListener('click', handleClickOutside);
          return () => document.removeEventListener('click', handleClickOutside);
    },[]);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (userSelectorRef.current && !userSelectorRef.current.contains(event.target)) {
          setShowUserDropdown(false);
        }
        if (docsMenuRef.current && !docsMenuRef.current.contains(event.target)) {
          setDocsMenuOpen(false);
        }
        if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
          setSettingsMenuOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, []);


    // REMOVED ALL AUTO-SWITCHING USEEFFECTS:
    // - Auto role switching when switching modules
    // - Auto user switching when team changes
    // - Auto module switching when user lacks access
    // - Auto client/project fallbacks

    // Helper function to get suggestions for fixing access issues
    const getAccessSuggestions = () => {
      const user = getUserProfile(selectedUsername, client, projectId);
      const suggestions = [];

      if (user.allowedModules?.length > 0) {
        suggestions.push({
          type: 'switch_module',
          message: `Switch to: ${user.allowedModules.map(toTitleCase).join(', ')}`
        });
      }

      const rolesForCurrentModule = user.allowedRolesByModule?.[activeModule] || [];
      if (rolesForCurrentModule.length > 0) {
        suggestions.push({
          type: 'switch_role',
          message: `Switch role to: ${rolesForCurrentModule.map(toTitleCase).join(', ')}`
        });
      }

      return suggestions;
    };

    // Access Warning Component
    const AccessWarning = () => {
      if (!showAccessWarning || accessIssues.length === 0) return null;

      return (
        <div className={styles.accessWarning}>
          <div className={styles.warningHeader}>
            <AlertTriangle className={styles.warningIcon} />
            <span>Access Issues Detected</span>
            <button
              onClick={() => setShowAccessWarning(false)}
              className={styles.warningClose}
            >
              ×
            </button>
          </div>
          <div className={styles.warningContent}>
            {accessIssues.map((issue, idx) => (
              <div key={idx} className={styles.warningItem}>
                <div className={styles.warningMessage}>{issue.message}</div>
                <div className={styles.warningSuggestion}>{issue.suggestion}</div>
              </div>
            ))}
            <div className={styles.warningSuggestions}>
              {getAccessSuggestions().map((suggestion, idx) => (
                <div key={idx} className={styles.suggestionItem}>
                  {suggestion.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    return (
        <>
          <AccessWarning />
          <div className={styles.accessFlex}>
            <div className={styles.leftControls}>
                <div className={styles.accessGroup}>
                    <select value={client} onChange={e => setClient(e.target.value)}>
                        {(allClients || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className={styles.accessGroup}>
                    <select
                        value={selectedCompany || ''}
                        onChange={e => setSelectedCompany(e.target.value)}
                    >
                        <option value="" disabled>Select a company</option>
                        {selectedClientCompanies.map(company => (
                            <option key={company} value={company}>
                                {company}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={`${styles.accessGroup}`}>
                    <select
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        title={projectName}
                    >
                        {projectsForClient.map(p => (
                            <option
                                key={p.id}
                                value={p.id}
                                title={p.name}
                            >
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.accessGroup}>
                    <select
                        value={mode}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className={accessIssues.some(i => i.type === 'role_access') ? styles.hasError : ''}
                    >
                        {roleOptions.map(option => (
                            <option
                                key={option.value}
                                value={option.value}
                                className={!option.isValid ? styles.invalidOption : ''}
                            >
                                {option.isValid ? option.label : `${option.label} (No Access)`}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={`${styles.accessGroup}`}>
                    <select
                        value={activeModule}
                        onChange={(e) => handleModuleChange(e.target.value)}
                        className={accessIssues.some(i => i.type === 'module_access') ? styles.hasError : ''}
                    >
                        {Object.entries(folderLabelsByModule).map(([key, value]) => {
                            const user = getUserProfile(selectedUsername, client, projectId);
                            const isAccessible = user.allowedModules?.includes(key);
                            const label = toTitleCase(key);
                            const icon = isAccessible ? '🔓' : '🔒';

                            return (
                                <option key={key} value={key}>
                                    {icon} {label} {!isAccessible ? '(No Access)' : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>
            <div className={styles.rightControls}>
                <div className={styles.notificationsContainer} ref={notificationsRef}>
                  <button
                    className={styles.notificationsButton}
                    onClick={() => setShowNotifications(prev => !prev)}
                    title="Notifications"
                  >
                    <Bell />
                  </button>
                  {showNotifications && (
                    <div className={styles.notificationsDropdown}>
                      {notifications.length === 0 ? (
                        <div className={styles.notificationItem}>No new notifications</div>
                      ) : (
                        notifications.map(note => (
                          <div key={note.id} className={styles.notificationItem}>
                            <strong>{note.type}</strong>: {note.message}
                            <div className={styles.notificationTime}>{note.time}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className={styles.docsToggleContainer} ref={docsMenuRef}>
                    <button
                        className={styles.docsToggle}
                        onClick={() => setDocsMenuOpen(prev => !prev)}
                        title="Help"
                    >
                        <HelpCircle/>
                    </button>
                    {docsMenuOpen && (
                        <div className={styles.docsMenu}>
                            <button
                                onClick={() => {
                                    setShowDocsPanel(true);
                                    setShowTutorialPanel(false);
                                    setDocsMenuOpen(false);
                                }}
                            >
                                Documentation
                            </button>

                            <button
                                onClick={() => {
                                    setShowTutorialPanel(true);
                                    setShowDocsPanel(false);
                                    setDocsMenuOpen(false);
                                }}
                            >
                                Tutorials
                            </button>
                        </div>
                    )}
                </div>
                <div className={styles.settingsButtonContainer}>
                    <button
                      className={styles.settingsButton}
                      onClick={() => setSettingsMenuOpen(prev => !prev)}
                      title="Settings"
                      ref={settingsMenuRef}
                    >
                      <Settings />
                    </button>
                    {settingsMenuOpen && (
                      <div className={styles.settingsDropdown}>
                        <div className={styles.settingsOption}>
                          <Palette size={16} className={styles.menuIcon} />
                          <span>Theme</span>
                        </div>
                        <div className={styles.settingsOption}>
                          <LayoutDashboard size={16} className={styles.menuIcon} />
                          <span>Default View</span>
                        </div>
                        <div className={styles.settingsOption}>
                          <Keyboard size={16} className={styles.menuIcon} />
                          <span>Keyboard Shortcuts</span>
                        </div>
                        <div className={styles.settingsOption}>
                          <FlaskConical size={16} className={styles.menuIcon} />
                          <span>Beta Features</span>
                        </div>
                        <div className={styles.settingsOption}>
                          <RotateCcw size={16} className={styles.menuIcon} />
                          <span>Reset Layout</span>
                        </div>
                      </div>
                    )}
                </div>
                <div className={styles.accessGroup}>
                    <div
                        className={styles.userSelector}
                        ref={userSelectorRef}
                    >
                        <img
                            src={userProfile.avatar}
                            alt={`${userProfile.displayName || username} headshot`}
                            className={`${styles.headshot} ${accessIssues.length > 0 ? styles.hasError : ''}`}
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                        />
                        {showUserDropdown && (
                            <div className={styles.userDropdown}>
                                {team.map(member => {
                                    const profile = profiles[member.username] || profiles.default;
                                    return (
                                        <div
                                            key={member.username}
                                            className={`${styles.userOption} ${member.username === selectedUsername ? styles.selected : ''}`}
                                            onClick={() => handleUserSelect(member.username)}
                                        >
                                            <img
                                                src={profile.avatar}
                                                alt={`${profile.displayName || member.username} headshot`}
                                                className={styles.optionAvatar}
                                            />
                                            <span className={styles.optionName}>
                                              {profile.displayName || member.username}
                                            </span>
                                        </div>
                                    );
                                })}
                                <Link
                                    to="/profile"
                                    className={styles.userOption}>
                                  <User size={16} style={{ marginRight: '8px' }} />
                                    My Profile
                                </Link>
                                <div className={styles.userOption}>
                                  <Bell size={16} style={{ marginRight: '8px' }} /> Notification Preferences
                                </div>
                                <div
                                    className={styles.userOption}
                                    onClick={() => {
                                      localStorage.removeItem('authToken');
                                      localStorage.removeItem('currentUser');
                                      window.location.href = '/login'; // or use `navigate('/login')` if using hooks
                                    }}
                                >
                                  <LogOut size={16} style={{ marginRight: '8px' }} /> Log Out
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </>
    )
}

export default AccessBar;