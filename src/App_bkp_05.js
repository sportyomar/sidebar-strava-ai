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

  const [hasInfrastructureSelection, setHasInfrastructureSelection] = useState(() => {
    const selection = localStorage.getItem('infrastructureSelection');
    return !!selection;
  });

  // Persist and share active workspace across pages
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => {
    const stored = localStorage.getItem('selectedWorkspaceId');
    return stored ? Number(stored) : null;
  });

  // Central API configuration
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002';

  // Authenticated fetch helper (shared across pages)
  const fetchWithAuth = useCallback((url, init = {}) => {
    const token = localStorage.getItem('authToken');
    return fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
    });
  }, []);

  // Keep infra selection flag in sync
  useEffect(() => {
    const selection = localStorage.getItem('infrastructureSelection');
    setHasInfrastructureSelection(!!selection);
  }, []);

  // Persist workspace selection changes
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
            {/* Infrastructure Selector */}
            <Route
              path="/infrastructure"
              element={
                <ProtectedInfrastructureSelector
                  onSelectionComplete={handleInfrastructureSelection}
                />
              }
            />

            {/* Project Templates */}
            <Route
              path="/projects"
              element={
                hasInfrastructureSelection
                  ? <ProtectedProjectTemplates />
                  : <Navigate to="/infrastructure" replace />
              }
            />

            {/* Dashboard */}
            <Route
              path="/dashboard/*"
              element={<MainApp />}
            />

            {/* Executive Gantt Chart */}
            <Route
              path="/analysis"
              element={
                hasInfrastructureSelection
                  ? <AnalysisPage />
                  : <Navigate to="/infrastructure" replace />
              }
            />

            {/* Profile */}
            <Route path="/profile" element={<UserProfile />} />

            {/* Platform Documentation */}
            <Route path="/platform-docs" element={<PlatformDocumentation />} />

            {/* Model Config / Chat Interface (uses LLM blueprint) */}
            <Route
              path="/model-config"
              element={
                <ChatInterface
                  workspaceId={selectedWorkspaceId}
                  API_BASE_URL={API_BASE_URL}
                  fetchWithAuth={fetchWithAuth}
                />
              }
            />

            {/* Module Management */}
            <Route
              path="/modules"
              element={
                <ModuleManagement />
              }
            />

            {/* Account Management — pass props so it can manage keys/models and set workspace */}
            <Route
              path="/account"
              element={
                <AccountPage
                  API_BASE_URL={API_BASE_URL}
                  fetchWithAuth={fetchWithAuth}
                  selectedWorkspaceId={selectedWorkspaceId}
                  onWorkspaceChange={handleWorkspaceChange}
                />
              }
            />

            {/* Home */}
            <Route
              path="/"
              element={
                hasInfrastructureSelection
                  ? <Navigate to="/dashboard" replace />
                  : <Navigate to="/infrastructure" replace />
              }
            />

            {/* Catch-all */}
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

          {/* Floating chat helper bubble (unchanged) */}
          <ChatBubble />
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
