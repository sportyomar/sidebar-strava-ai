import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainApp from "./components/MainApp";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import { ProjectProvider } from "./contexts/ProjectContext";
import BusinessSignupForm from './components/BusinessSignupForm';
import UserProfile from './components/UserProfile'; // adjust path if needed
import ChatBubble from './components/ChatBubble';
import InfrastructureSelector from './components/InfrastructureSelector';


function App() {
  const isLoggedIn = localStorage.getItem('authToken');

  return (
    <BrowserRouter>
        {/* Protected routes */}
        {isLoggedIn ? (
          <>
              <Routes>
                  <Route
                  path="/profile"
                  element={
                      <ProjectProvider>
                          <UserProfile/>
                      </ProjectProvider>
                  }
              />
                  <Route
                      path="*"
                      element={
                          <ProjectProvider>
                              <MainApp/>
                          </ProjectProvider>
                      }
                  />
              </Routes>
            <ChatBubble />
          </>
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
