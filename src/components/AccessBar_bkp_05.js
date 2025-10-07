import React, {useContext, useState, useEffect, useRef} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import ProjectContext from '../contexts/ProjectContext';
import folderLabelsByModule from '../constants/folderLabelsByModule';
import mainStyles from "./MainApp.module.css";
import styles from "./AccessBar.module.css";
import profiles from '../profiles';
import assignments from '../profiles/assignments.json';
import ProjectSelectorModal from './ProjectSelectorModal';
import WorkspaceSelectorModal from './WorkspaceSelectorModal';
import { getActiveWorkspaces } from '../constants/workspaceStructure';
import { getWorkspaceInfo } from '../constants/workspaceStructure';
import DocumentationSearch from "./DocumentationSearch";
import { Search } from 'lucide-react'; // Add Search icon
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
    LayoutDashboard,
    Wrench,
    BarChart3
} from 'lucide-react';

function logSysAware(label, message) {
  console.log(`Sys Aware (06-27-2025) ${label}: ${message}`);
}

function toTitleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}


function getUserProfile(username, client, projectId) {
  if (!username) return profiles.default;
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002';

    // What is project
    // What is assignment
  const projectMatch = assignments.projects.find(
    // Is client like KKR?
    p => p.client === client && p.project === projectId
    // Is project id like project name?
  );
  const role = projectMatch?.members.find(m => m.username === username)?.role;
    // Is role like MD, VP, etc.?
  const baseProfile = profiles[username];
    // Is baseline like (default profile?)
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

function validateUserAccess(username, client, projectId, activeWorkspace, mode) {
  const user = getUserProfile(username, client, projectId);
  const issues = [];

  if (!user.allowedModules?.includes(activeWorkspace)) {
    issues.push({
      type: 'module_access',
      message: `${user.displayName || username} doesn't have access to ${activeWorkspace ? toTitleCase(activeWorkspace) : 'Select Workspace'}`,
      suggestion: `Available modules: ${user.allowedModules?.map(toTitleCase).join(', ') || 'None'}`
    });
  }

  const allowedRoles = user.allowedRolesByModule?.[activeWorkspace] || [];
  if (!allowedRoles.includes(mode)) {
    issues.push({
      type: 'role_access',
      message: `Role "${toTitleCase(mode)}" not available for ${activeWorkspace ? toTitleCase(activeWorkspace) : 'Select Workspace'}`,
      suggestion: `Available roles: ${allowedRoles.map(toTitleCase).join(', ') || 'None'}`
    });
  }

  return issues;
}

function AccessBar({
   mode,
   setMode,
   activeWorkspace,
   setActiveWorkspace,
   extraContent,
   showDocsPanel,
   setShowDocsPanel,
   setDocsMenuOpen,
   setShowLayoutPanel,
   showLayoutPanel,
   docsMenuOpen,
   setShowTutorialPanel,
   setTutorialMenuOpen,
   tutorialMenuOpen,
   showProjectSelector,
   setShowProjectSelector,
   selectedProject
}){
    const [showSearch, setShowSearch] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const docsMenuRef = useRef(null);
  const realUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  const {
      client,
      setClient,
      projectId,
      setProjectId,
      allClients,
      projectsByClient,
      getProjectTeam,
      selectedCompany,
      setSelectedCompany,
      selectedClientCompanies
  } = useContext(ProjectContext);

  let team = (getProjectTeam && getProjectTeam(projectId)) || [];
  if (realUser && !team.find(u => u.username === realUser.username)) {
      team = [...team, { username: realUser.username, role: 'partner' }];
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
  const projectName = selectedProject?.name || '';
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  const [selectedUsername, setSelectedUsername] = useState(() => {
      return localStorage.getItem('selectedUsername') || team[0]?.username || '';
  });
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [accessIssues, setAccessIssues] = useState([]);
  const [showAccessWarning, setShowAccessWarning] = useState(false);

  const userSelectorRef = useRef(null);
  const availableRoles = team.map(m => m.role);
  const defaultRole = availableRoles.includes('consultant') ? 'consultant' : availableRoles[0];
  const username = selectedUsername;
  const userProfile = profiles[username] || profiles.default;

  // Get infrastructure settings from localStorage
  const hasInfrastructureSettings = localStorage.getItem('infrastructureSelection') !== null;


  const handleProjectSelect = (project) => {
      setProjectId(project.id);
      setShowProjectSelector(false);
      logSysAware('Project Select', `Selected project: ${project.name}`);
    };


  const getRoleOptions = () => {
      const user = getUserProfile(username, client, projectId);
      const roles = user.allowedRolesByModule?.[activeWorkspace] || [];
      const allPossibleRoles = ['associate', 'consultant', 'engineer', 'admin', 'vpPrincipal', 'partnerExec', 'executive', 'partner'];

      return allPossibleRoles
        .filter(role => {
          return roles.includes(role) || role === mode;
        })
        .map(role => ({
          value: role,
          label: toTitleCase(role),
          isValid: roles.includes(role)
        }));
  };

  const roleOptions = getRoleOptions();

  // Navigation to infrastructure settings
  const handleInfrastructureSettings = () => {
    navigate('/infrastructure');
  };

  // Navigation to Gantt chart analysis
  const handleAnalysisView = () => {
    navigate('/analysis');
  };

  useEffect(() => {
    fetch('/notifications.json')
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(err => console.error('Failed to load notifications:', err));
  }, []);


  // useEffect(() => {
  //     const storedWorkspace = localStorage.getItem('activeWorkspace');
  //     if (storedWorkspace) {
  //       setActiveWorkspace(storedWorkspace);
  //     }
  // }, []);

  useEffect(() => {
      if (activeWorkspace) {
        localStorage.setItem('activeWorkspace', activeWorkspace);
      }
  }, [activeWorkspace]);


  const handleWorkspaceChange = (newWorkspace) => {
      setActiveWorkspace(newWorkspace);
      logSysAware('Module Change', `User switched to module: "${newWorkspace}"`);
  };

  const handleUserSelect = (username) => {
      setSelectedUsername(username);
      setShowUserDropdown(false);
      logSysAware('User Switch', `Selected user: "${username}"`);
  };

  const handleRoleChange = (newRole) => {
      setMode(newRole);
      logSysAware('Role Change', `Switched role to "${newRole}"`);
  };

  const handleSearch = (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      // Replace with your actual search logic
      // For now, this is a placeholder
      setTimeout(() => {
        // Your search implementation here
        // Example: const results = searchDocumentation(query);
        // setSearchResults(results);
        setIsSearching(false);
      }, 300);
    };

  useEffect(() => {
    if (team.length > 0 && !selectedUsername) {
      setSelectedUsername(team[0].username);
      logSysAware('Init', `Set initial user: ${team[0].username}`);
    }
  }, [team, selectedUsername]);

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
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getAccessSuggestions = () => {
    const user = getUserProfile(selectedUsername, client, projectId);
    const suggestions = [];

    if (user.allowedModules?.length > 0) {
      suggestions.push({
        type: 'switch_module',
        message: `Switch to: ${user.allowedModules.map(toTitleCase).join(', ')}`
      });
    }

    const rolesForCurrentModule = user.allowedRolesByModule?.[activeWorkspace] || [];
    if (rolesForCurrentModule.length > 0) {
      suggestions.push({
        type: 'switch_role',
        message: `Switch role to: ${rolesForCurrentModule.map(toTitleCase).join(', ')}`
      });
    }

    return suggestions;
  };

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

  console.log("🔥 Active Workspace:", activeWorkspace);
  return (
      <>
        <AccessWarning />
        <div className={styles.accessFlex}>
          <div className={styles.leftControls}>
              <div className={`${styles.accessGroup} ${styles.module}`}>
                <button
                  className={`${styles.moduleButton} ${accessIssues.some(i => i.type === 'module_access') ? styles.hasError : ''}`}
                  onClick={() => setShowWorkspaceModal(true)}
                >
                  {getWorkspaceInfo(activeWorkspace)?.label || 'Select Workspace'}
                </button>
            </div>
              <div className={`${styles.accessGroup} ${styles.module}`}>
                <button
                  className={styles.moduleButton}
                  onClick={() => setShowProjectSelector(true)}
                >
                  {projectName || "Select Project"}
                </button>
            </div>
              <div className={`${styles.accessGroup} ${styles.module}`}>
                <button
                  className={styles.moduleButton}
                  onClick={() => setShowSearch(true)}
                  title="Search Documentation"
                >
                    <Search size={16} />
                </button>
            </div>



          </div>
          <div className={styles.rightControls}>
              {/* Analysis Timeline Button */}
              <button
                className={styles.analysisButton}
                onClick={handleAnalysisView}
                title="View Timeline Analysis"
              >
                <BarChart3 size={16} />
                <span>Analysis</span>
              </button>

              {/* Infrastructure Settings Button */}
              <button
                className={styles.infrastructureSettingsButton}
                onClick={handleInfrastructureSettings}
                title="Infrastructure Settings"
              >
                <Wrench size={16} />
                <span>Infrastructure</span>
              </button>

              <div className={styles.notificationsContainer} ref={notificationsRef}>
                <button
                  className={styles.notificationsButton}
                  onClick={() => setShowNotifications(prev => !prev)}
                  title="Notifications"
                >
                  <Bell size={16} />
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
                      <HelpCircle size={16} />
                  </button>
                  {docsMenuOpen && (
                      <div className={styles.docsMenu}>
                          <Link
                          to="/platform-docs"
                          className={styles.docsMenuItem} // Optional: if you want styling
                          onClick={() => setDocsMenuOpen(false)} // Close menu after click
                        >
                          Platform Documentation
                        </Link>
                        <Link
                          to="/model-config"
                          className={styles.docsMenuItem}
                          onClick={() => setDocsMenuOpen(false)}
                        >
                          Model Configuration
                        </Link>
                          <button
                              onClick={() => {
                                  setShowDocsPanel(true);
                                  setShowTutorialPanel(false);
                                  setDocsMenuOpen(false);
                              }}
                          >
                              Project Documentation
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

              <div className={styles.settingsButtonContainer} ref={settingsMenuRef}>
                  <button
                    className={styles.settingsButton}
                    onClick={() => setSettingsMenuOpen(prev => !prev)}
                    title="Settings"
                  >
                    <Settings size={16} />
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
                                  className={styles.userOption}
                              >
                                <User size={16} />
                                My Profile
                              </Link>
                              <div className={styles.userOption}>
                                <Bell size={16} />
                                Notification Preferences
                              </div>
                              <div
                                  className={styles.userOption}
                                  onClick={() => {
                                    console.log("🔍 Layout Tools clicked! Current state:", showLayoutPanel);
                                    setShowLayoutPanel(true);
                                    console.log("🔍 Called setShowLayoutPanel(true)");
                                    setShowUserDropdown(false);
                                  }}
                                >
                                  <LayoutDashboard size={16} />
                                  Layout Tools
                                </div>
                              <div
                                  className={styles.userOption}
                                  onClick={() => {
                                    localStorage.removeItem('authToken');
                                    localStorage.removeItem('currentUser');
                                    window.location.href = '/login';
                                  }}
                              >
                                <LogOut size={16} />
                                Log Out
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
        </div>
      {showWorkspaceModal && (
          <WorkspaceSelectorModal
            workspaces={getActiveWorkspaces().map(workspace => {
              return {
                key: workspace.id,
                label: workspace.label,
                description: workspace.description
              };
            })}
            selectedWorkspace={activeWorkspace}
            onSelect={(ws) => {
              if (typeof setActiveWorkspace === 'function') {
                setActiveWorkspace(ws);
                logSysAware('Module Change', `User switched to module: "${ws}"`);
              } else {
                console.error('❌ setActiveWorkspace is not a function', { setActiveWorkspace });
              }
              setShowWorkspaceModal(false);
            }}
            onClose={() => setShowWorkspaceModal(false)}
          />
      )}
      {showProjectSelector && (
          <ProjectSelectorModal
            instanceName="projects-db"
            userInfo={{
              name: userProfile.displayName || username,
              email: realUser?.email || `${username}@company.com`
            }}
            onClose={() => setShowProjectSelector(false)}
            onSelect={handleProjectSelect}
          />
      )}
      {showSearch && (
          <DocumentationSearch
            onClose={() => setShowSearch(false)}
            onSearch={handleSearch}
            results={searchResults}
            isSearching={isSearching}
          />
      )}
    </>
  );
}

export default AccessBar;