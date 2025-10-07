// App.js
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from 'react';
import PEWelcome from "./components/PEWelcome";
import MainApp from "./components/MainApp";
import TemplateManager from "./components/TemplateManager";
import LoginPageCentered from "./components/LoginPageCentered";
import LoginPageTemplate from "./components/LoginPageTemplate";
import SignupPage from "./components/SignupPage";
import WelcomePage from './components/WelcomePage';
import WelcomeDeals from "./components/WelcomeDeals";
import MarkdownTestPage from "./components/MarkdownTestPage";

import { ProjectProvider } from "./contexts/ProjectContext";
import BusinessSignupForm from './components/BusinessSignupForm';
import UserProfile from './components/UserProfile';
import ChatBubble from './components/ChatBubble';
import InfrastructureSelector from './components/InfrastructureSelector';
import ProjectTemplates from "./components/ProjectTemplates";
import ExecutiveGanttChart from './components/ExecutiveGanttChart';
import AnalysisPage from "./components/AnalysisPage";
import PlatformDocumentation from "./components/PlatformDocumentation";
import ChatInterface from "./components/ChatInterface";
import ModuleManagement from "./components/ModuleManagement";
import AccountPage from "./components/AccountPage";
import NewWelcome from "./components/NewWelcome";
import PricingPage from "./components/PricingPage";

// === Protected Infrastructure Selector ===
function ProtectedInfrastructureSelector({ onSelectionComplete }) {
  const handleSelection = (selection) => {
    onSelectionComplete(selection);
    window.location.href = '/projects';
  };
  return <InfrastructureSelector onSelectionComplete={handleSelection} />;
}

// === Protected Project Templates ===
function ProtectedProjectTemplates() {
  const getStoredSelection = () => {
    const stored = localStorage.getItem('infrastructureSelection');
    return stored ? JSON.parse(stored) : null;
  };

  const infrastructureSelection = getStoredSelection();

  const handleProjectSelect = (project) => {
    localStorage.setItem('selectedProject', JSON.stringify(project));
    window.location.href = '/dashboard';
  };

  return (
    <ProjectTemplates
      infrastructureSelection={infrastructureSelection}
      onProjectSelect={handleProjectSelect}
    />
  );
}

// === Protected Executive Gantt Chart ===
function ProtectedGanttChart() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <ExecutiveGanttChart />
    </div>
  );
}

function App() {
  const isLoggedIn = localStorage.getItem('authToken');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeTemplates, setActiveTemplates] = useState({});

  const [hasInfrastructureSelection, setHasInfrastructureSelection] = useState(() => {
    const selection = localStorage.getItem('infrastructureSelection');
    return !!selection;
  });

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => {
    const stored = localStorage.getItem('selectedWorkspaceId');
    return stored ? Number(stored) : null;
  });

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002';

  const fetchWithAuth = useCallback((url, init = {}) => {
    const token = localStorage.getItem('authToken');
    return fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
  }, []);

  const fetchActiveTemplate = useCallback(async (templateType) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/templates/active/${templateType}`);
      if (response.ok) {
        const data = await response.json();
        setActiveTemplates(prev => ({
          ...prev,
          [templateType]: data.template
        }));
        return data.template;
      }
    } catch (error) {
      console.error(`Failed to fetch active ${templateType} template:`, error);
    }
    return null;
  }, [API_BASE_URL]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/user/workspaces`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const workspacesList = await response.json();
          setWorkspaces(workspacesList);
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error);
      }
    };

    if (isLoggedIn) {
      fetchWorkspaces();
    }
  }, [isLoggedIn, API_BASE_URL]);

  useEffect(() => {
    const fetchLastWorkspace = async () => {
      const token = localStorage.getItem('authToken'); // ✅ Get token properly
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/user/last-workspace`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const workspace = await response.json();
          if (workspace) {
            setSelectedWorkspace(workspace);
            // Also sync the selectedWorkspaceId state
            setSelectedWorkspaceId(workspace.id);
            localStorage.setItem('selectedWorkspaceId', String(workspace.id));
          }
        }
      } catch (error) {
        console.error('Failed to fetch last workspace:', error);
      }
    };

    if (isLoggedIn) {
      fetchLastWorkspace();
    }
  }, [isLoggedIn, API_BASE_URL]);

  useEffect(() => {
    const selection = localStorage.getItem('infrastructureSelection');
    setHasInfrastructureSelection(!!selection);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setUser(data);
          setIsAuthenticated(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      fetchActiveTemplate('login');
    }
  }, [isLoggedIn, fetchActiveTemplate]);

  const handleWorkspaceChange = useCallback(async (id) => {
    // Update local state immediately for UI responsiveness
    setSelectedWorkspaceId(id);

    if (id !== null && id !== undefined) {
      localStorage.setItem('selectedWorkspaceId', String(id));

      // Find and set the full workspace object
      const workspace = workspaces.find(w => w.id === id);
      if (workspace) {
        setSelectedWorkspace(workspace);
      }

      // Save to API as user's last used workspace
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          await fetch(`${API_BASE_URL}/api/user/last-workspace`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ workspace_id: id })
          });
        }
      } catch (error) {
        console.error('Failed to save last workspace:', error);
      }
    } else {
      localStorage.removeItem('selectedWorkspaceId');
      setSelectedWorkspace(null);
    }
  }, [workspaces, API_BASE_URL]);

  const handleInfrastructureSelection = (selection) => {
    localStorage.setItem('infrastructureSelection', JSON.stringify(selection));
    setHasInfrastructureSelection(true);
  };

  return (
    <BrowserRouter>
      {isLoggedIn ? (
        <ProjectProvider>
          <Routes>
            <Route
              path="/infrastructure"
              element={
                <ProtectedInfrastructureSelector
                  onSelectionComplete={handleInfrastructureSelection}
                />
              }
            />

            <Route
              path="/projects"
              element={
                hasInfrastructureSelection
                  ? <ProtectedProjectTemplates />
                  : <Navigate to="/infrastructure" replace />
              }
            />

            <Route path="/dashboard/*" element={<MainApp />} />

            <Route
              path="/analysis"
              element={
                hasInfrastructureSelection
                  ? <AnalysisPage />
                  : <Navigate to="/infrastructure" replace />
              }
            />

            <Route path="/profile" element={<UserProfile />} />
            <Route
                path="/platform-docs"
                element={
                  <PlatformDocumentation
                      user={user}
                      isAuthenticated={isAuthenticated}
                    />
                } />

            <Route
              path="/model-config"
              element={
                <ChatInterface
                  key={selectedWorkspaceId ?? 'no-ws'}
                  workspaceId={selectedWorkspaceId}
                  API_BASE_URL={API_BASE_URL}
                  fetchWithAuth={fetchWithAuth}
                  selectedWorkspace={selectedWorkspace}
                />
              }
            />

            <Route path="/modules" element={<ModuleManagement />} />

            <Route
              path="/account"
              element={
                <AccountPage
                  API_BASE_URL={API_BASE_URL}
                  fetchWithAuth={fetchWithAuth}
                  selectedWorkspaceId={selectedWorkspaceId}
                  onWorkspaceChange={handleWorkspaceChange}
                  selectedWorkspace={selectedWorkspace}
                  setSelectedWorkspace={setSelectedWorkspace}
                  workspaces={workspaces}
                />
              }
            />

            <Route
              path="/"
              element={
                hasInfrastructureSelection
                  ? <Navigate to="/dashboard" replace />
                  : <Navigate to="/infrastructure" replace />
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to={hasInfrastructureSelection ? "/dashboard" : "/infrastructure"}
                  replace
                />
              }
            />
          </Routes>

          {/*<ChatBubble />*/}
        </ProjectProvider>
      ) : (
        <Routes>
          <Route path="/login" element={
            <LoginPageTemplate
              layout={activeTemplates.login?.layout || "top"}
              template={activeTemplates.login}
            />
          } />
          <Route path="/admin/templates" element={<TemplateManager />} />
          {/*<Route path="/welcome" element={<WelcomePage />} />*/}
          <Route path="/welcome" element={<PEWelcome/>} />
          <Route path="/markdown-test" element={<MarkdownTestPage />} />
          <Route path="/pricing" element={<PricingPage/>} />
          <Route path="/login/top" element={<LoginPageTemplate layout="top" />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup/business" element={<BusinessSignupForm />} />
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
