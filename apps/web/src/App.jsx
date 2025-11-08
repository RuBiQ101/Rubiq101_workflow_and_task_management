import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkflowManagementPage from './pages/WorkflowManagementPage';
import WorkspacePage from './pages/WorkspacePage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import OnboardingPage from './pages/OnboardingPage';
import AppLayout from './components/layout/AppLayout';

// Simple demo app: pass workspace id via env or change here
const DEMO_WORKSPACE = import.meta.env.VITE_WORKSPACE_ID || 'replace-workspace-id';

// Enhanced auth check with validation
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  // Debug logging
  console.log('PrivateRoute check:', {
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
    currentPath: window.location.pathname
  });

  if (!token) {
    console.log('No token found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  // Debug logging for app initialization
  console.log('App initialized with:', {
    hasToken: !!localStorage.getItem('token'),
    apiBase: import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:3000',
    demoWorkspace: DEMO_WORKSPACE,
    currentPath: window.location.pathname
  });

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/accept" element={<InviteAcceptPage />} />
        
        {/* Onboarding route (protected but no layout) */}
        <Route
          path="/onboarding"
          element={
            <PrivateRoute>
              <OnboardingPage />
            </PrivateRoute>
          }
        />
        
        {/* Protected routes with layout */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <PrivateRoute>
              <AppLayout>
                <ProjectDetailPage />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId"
          element={
            <PrivateRoute>
              <AppLayout>
                <WorkflowManagementPage />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace"
          element={
            <PrivateRoute>
              <AppLayout>
                <WorkspacePage workspaceId={DEMO_WORKSPACE} />
              </AppLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

