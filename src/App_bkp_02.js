import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import MainApp from "./components/MainApp";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import { ProjectProvider } from "./contexts/ProjectContext";
import BusinessSignupForm from './components/BusinessSignupForm';
import UserProfile from './components/UserProfile';
import ChatBubble from './components/ChatBubble';
import InfrastructureSelector from './components/InfrastructureSelector';
import ProjectTemplates from "./components/ProjectTemplates";

// ✅ Wrapper so we can use useNavigate inside a routed component
function ProtectedInfrastructureSelector({ onSelectionComplete }) {
  const navigate = useNavigate();

  const handleSelection = (selection) => {
    onSelectionComplete(selection);

    // Navigate to project templates after infrastructure selection
    navigate('/projects');
  };

  return <InfrastructureSelector onSelectionComplete={handleSelection} />;
}

// ✅ Wrapper for ProjectTemplates with navigation
function ProtectedProjectTemplates() {
  const navigate = useNavigate();

  const getStoredSelection = () => {
    const stored = localStorage.getItem('infrastructureSelection');
    return stored ? JSON.parse(stored) : null;
  };

  const handleProjectSelect = (project) => {
    console.log('Selected project:', project);

    // Store selected project
    localStorage.setItem('selectedProject', JSON.stringify(project));

    // Navigate to dashboard with project context
    navigate('/dashboard');
  };

  const infrastructureSelection = getStoredSelection();

  return (
    <ProjectTemplates
      infrastructureSelection={infrastructureSelection}
      onProjectSelect={handleProjectSelect}
    />
  );
}

function App() {
  const isLoggedIn = localStorage.getItem('authToken');
  const [hasInfrastructureSelection, setHasInfrastructureSelection] = useState(false);

  useEffect(() => {
    const selection = localStorage.getItem('infrastructureSelection');
    setHasInfrastructureSelection(!!selection);
  }, []);

  const handleInfrastructureSelection = (selection) => {
    localStorage.setItem('infrastructureSelection', JSON.stringify(selection));
    setHasInfrastructureSelection(true);
  };

  return (
    <BrowserRouter>
      {isLoggedIn ? (
        <>
          <Routes>
            {/* ✅ Step 1: Infrastructure Selector */}
            <Route
              path="/infrastructure"
              element={
                <ProtectedInfrastructureSelector
                  onSelectionComplete={handleInfrastructureSelection}
                />
              }
            />

            {/* ✅ Step 2: Project Templates - requires infrastructure selection */}
            <Route
              path="/projects"
              element={
                hasInfrastructureSelection ? (
                  <ProtectedProjectTemplates />
                ) : (
                  <Navigate to="/infrastructure" replace />
                )
              }
            />

            {/* ✅ Step 3: Dashboard - accessible after infrastructure selection */}
            <Route
              path="/dashboard/*"
              element={
                hasInfrastructureSelection ? (
                  <ProjectProvider>
                    <MainApp />
                  </ProjectProvider>
                ) : (
                  <Navigate to="/infrastructure" replace />
                )
              }
            />

            {/* ✅ Profile always accessible */}
            <Route
              path="/profile"
              element={
                <ProjectProvider>
                  <UserProfile />
                </ProjectProvider>
              }
            />

            {/* ✅ Smart redirect based on infra state */}
            <Route
              path="*"
              element={
                <Navigate
                  to={hasInfrastructureSelection ? "/projects" : "/infrastructure"}
                  replace
                />
              }
            />
          </Routes>
          <ChatBubble />
        </>
      ) : (
        // ❌ Unauthenticated routes
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