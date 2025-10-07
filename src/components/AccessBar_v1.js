import React, {useContext, useState, useEffect, useRef} from 'react';
import ProjectContext from '../contexts/ProjectContext';
import folderLabelsByModule from '../constants/folderLabelsByModule';
import mainStyles from "./MainApp.module.css";
import styles from "./AccessBar.module.css";
import profiles from '../profiles';
import assignments from '../profiles/assignments.json';
import { HelpCircle } from 'lucide-react'; // question mark inside a circle

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
   tutorialMenuOpen,

}){
  const docsMenuRef = useRef(null);
  const { client, setClient, projectId, setProjectId, allClients, projectsByClient, getProjectTeam, selectedCompany, setSelectedCompany, selectedClientCompanies } = useContext(ProjectContext);
  const team = (getProjectTeam && getProjectTeam(projectId)) || [];
  const projectsForClient = (projectsByClient && projectsByClient[client]) || [];
  const selectedProject = projectsForClient.find(p => p.id === projectId);
  const projectName = selectedProject?.name || '';
  const [selectedUsername, setSelectedUsername] = useState(() => {
      return localStorage.getItem('selectedUsername') || team[0]?.username || '';
    });
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSelectorRef = useRef(null);
  const availableRoles = team.map(m => m.role);
  const defaultRole = availableRoles.includes('consultant') ? 'consultant' : availableRoles[0];
  const username = selectedUsername;
  const userProfile = profiles[username] || profiles.default;
  const getRoleOptions = () => {
      const user = getUserProfile(username, client, projectId);
      const roles = user.allowedRolesByModule?.[activeModule] || [];
      return roles.map(role => ({
        value: role,
        label: toTitleCase(role)
      }));
    };
    const roleOptions = getRoleOptions();
    const handleModuleChange = (newModule) => {
        setActiveModule(newModule);

        logSysAware('Module Change', `User switched to module: "${newModule}"`);

        // Reset role to first available option when switching modules
        const newRoleOptions =
            newModule === 'dealIntake'
              ? [{ value: 'associate' }, { value: 'vpPrincipal' }, { value: 'partnerExec' }]
            : newModule === 'utilities'
              ? [{ value: 'consultant' }, { value: 'engineer' }, { value: 'admin' }]
            : [{ value: 'executive' }, { value: 'partner' }, { value: 'consultant' }];


        // Check if current mode is valid for new module, if not reset to first option
        const currentModeValid = newRoleOptions.some(option => option.value === mode);
        if (!currentModeValid) {
            setMode(newRoleOptions[0].value);
        }
    };
    const handleUserSelect = (username) => {
        setSelectedUsername(username);
        setShowUserDropdown(false);
        logSysAware('User Switch', `Selected user: "${username}"`);
    };

    useEffect(() => {
      if (team.length > 0) {
        setSelectedUsername(prev => team.find(u => u.username === prev) ? prev : team[0].username);
      }
    }, [team]);
    useEffect(() => {
      const assigned = team.find(m => m.username === selectedUsername);
      if (assigned?.role && assigned.role !== mode) {
        setMode(assigned.role); // sync to assigned role
      }
    }, [selectedUsername, team]);
    useEffect(() => {
      const user = getUserProfile(selectedUsername, client, projectId);
      const roles = user.allowedRolesByModule?.[activeModule] || [];
      if (!roles.includes(mode) && roles.length > 0) {
        setMode(roles[0]); // fallback to first allowed role
      }
    }, [selectedUsername, activeModule]);
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (userSelectorRef.current && !userSelectorRef.current.contains(event.target)) {
          setShowUserDropdown(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, []);
    useEffect(() => {
      const user = getUserProfile(selectedUsername, client, projectId);

      if (!user.allowedModules?.includes(activeModule)) {
        // Find first module the user has access to
        const newModule = user.allowedModules?.[0];
        if (newModule) {
          setActiveModule(newModule);
          logSysAware('Auto Module Adjust', `Module "${activeModule}" not accessible by ${selectedUsername}. Switching to "${newModule}".`);

          // Also set mode to first allowed role for that module
          const newMode = user.allowedRolesByModule?.[newModule]?.[0];
          if (newMode) {
            setMode(newMode);
            logSysAware('Auto Role Adjust', `Role "${mode}" not valid for "${newModule}". Switching to "${newMode}".`);
          }
        }
      } else {
        // Check if mode is still valid for this module
        const roles = user.allowedRolesByModule?.[activeModule] || [];
        if (!roles.includes(mode) && roles.length > 0) {
          setMode(roles[0]);
          logSysAware('Role Fallback', `Role "${mode}" not allowed for module "${activeModule}". Switching to "${roles[0]}".`);
        }
      }
    }, [selectedUsername, client, projectId, activeModule]);
    useEffect(() => {
      if (!team.length) return;

      for (const member of team) {
        const userProfile = getUserProfile(member.username, client, projectId);
        for (const module of userProfile.allowedModules) {
          const roles = userProfile.allowedRolesByModule?.[module] || [];
          if (roles.length > 0) {
            // Found the first valid combination!
            setSelectedUsername(member.username);
            setActiveModule(module);
            setMode(roles[0]);

            logSysAware("Auto Init", `Selected ${member.username} -> ${module} -> ${roles[0]}`);
            return; // done
          }
        }
      }

      // fallback: if no valid combination found, keep as is
    }, [client, projectId]);
    useEffect(() => {
      if (team.length === 0 && allClients && projectsByClient) {
        // try to find first client/project that has a non-empty team
        for (const clientKey of allClients) {
          const projects = projectsByClient[clientKey] || [];
          for (const project of projects) {
            const teamForProject = getProjectTeam(project.id) || [];
            if (teamForProject.length > 0) {
              setClient(clientKey);
              setProjectId(project.id);
              logSysAware("Auto Fallback", `Switched to ${clientKey} -> ${project.name} because original had no team.`);
              return;
            }
          }
        }
        // If absolutely no projects have teams, maybe show a global error or fallback message
        console.error("No valid projects with team members found.");
      }
    }, [team, allClients, projectsByClient]);
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

    // htmlhtml
    return (

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
                    <select value={mode} onChange={(e) => {
                        const newMode = e.target.value;
                        setMode(newMode);
                        logSysAware('Access Mode Change', `Switched role to "${newMode}"`);
                    }}>
                        {roleOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={`${styles.accessGroup}`}>
                    <select value={activeModule} onChange={(e) => handleModuleChange(e.target.value)}>
                        {Object.entries(folderLabelsByModule).map(([key, value]) => {

                            const user = getUserProfile(selectedUsername, client, projectId);
                            const isAccessible = user.allowedModules?.includes(key);

                            // const label = customLabels[key] || toTitleCase(key);
                            const label = toTitleCase(key);

                            const icon = isAccessible ? '🔓' : '🔒';

                            return (
                                <option key={key} value={key} disabled={!isAccessible}>
                                    {icon} {label}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>
            <div className={styles.rightControls}>
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
                    )}</div>
                <div className={styles.accessGroup}>
                    <div
                        className={styles.userSelector}
                        // ref={userSelectorRef}
                    >
                        <img
                            src={userProfile.avatar}
                            alt={`${userProfile.displayName || username} headshot`}
                            className={styles.headshot}
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
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AccessBar;