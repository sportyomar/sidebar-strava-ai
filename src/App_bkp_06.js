// App.js
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from 'react';
import MainApp from "./components/MainApp";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
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

  // useEffect(() => {
  //   if (!isLoggedIn) return;
  //   let cancelled = false;
  //
  //   const pickWorkspaceFromList = (list) => {
  //     const arr = Array.isArray(list) ? list : (list?.workspaces || []);
  //     if (!arr.length) return null;
  //     const byDefault = arr.find(w => w.is_default || w.isDefault);
  //     return (byDefault?.id ?? arr[0].id) ?? null;
  //   };
  //
  //   const loadInitialWorkspace = async () => {
  //     try {
  //       let res = await fetchWithAuth(`${API_BASE_URL}/api/account/workspaces`);
  //       if (!cancelled && res.ok) {
  //         const list = await res.json().catch(() => ([]));
  //         const id = pickWorkspaceFromList(list);
  //         if (id != null) {
  //           setSelectedWorkspaceId(id);
  //           localStorage.setItem('selectedWorkspaceId', String(id));
  //           return;
  //         }
  //       }
  //
  //       res = await fetchWithAuth(`${API_BASE_URL}/api/workspaces`);
  //       if (!cancelled && res.ok) {
  //         const list = await res.json().catch(() => ([]));
  //         const id = pickWorkspaceFromList(list);
  //         if (id != null) {
  //           setSelectedWorkspaceId(id);
  //           localStorage.setItem('selectedWorkspaceId', String(id));
  //         }
  //       }
  //     } catch {
  //       // swallow
  //     }
  //   };
  //
  //   if (selectedWorkspaceId == null) loadInitialWorkspace();
  //   return () => { cancelled = true; };
  // }, [isLoggedIn, selectedWorkspaceId, API_BASE_URL, fetchWithAuth]);

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

  const handleWorkspaceChange = useCallback((id) => {
    setSelectedWorkspaceId(id);
    if (id !== null && id !== undefined) {
      localStorage.setItem('selectedWorkspaceId', String(id));
    } else {
      localStorage.removeItem('selectedWorkspaceId');
    }
  }, []);

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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup/business" element={<BusinessSignupForm />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
