import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkflowManagementPage from './pages/WorkflowManagementPage';
import WorkspacePage from './pages/WorkspacePage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import OnboardingPage from './pages/OnboardingPage';
import DebugPage from './pages/DebugPage';
import AppLayout from './components/layout/AppLayout';
import { checkAPIHealth } from './api/client';

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
  const [apiHealthy, setApiHealthy] = useState(null);

  useEffect(() => {
    // Comprehensive debug logging on app start
    console.log('=== APP START DEBUG INFO ===');
    console.log('Token exists:', !!localStorage.getItem('token'));
    console.log('Token value:', localStorage.getItem('token'));
    console.log('Token length:', localStorage.getItem('token')?.length);
    console.log('API Base URL:', import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:3000');
    console.log('Demo Workspace:', DEMO_WORKSPACE);
    console.log('Current path:', window.location.pathname);
    console.log('Environment mode:', import.meta.env.MODE);
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('============================');

    // Check API health
    checkAPIHealth().then(isHealthy => {
      console.log('API Health Check:', isHealthy ? '✅ Healthy' : '❌ Unhealthy');
      setApiHealthy(isHealthy);
      if (!isHealthy) {
        console.error('⚠️ Backend server is not responding! Check if it\'s running on port 3000.');
      }
    });
  }, []);

  return (
    <Router>
      {/* API Health Warning Banner */}
      {apiHealthy === false && (
        <div className="bg-red-600 text-white px-4 py-3 text-center font-medium">
          ⚠️ Backend server is not responding. Please check if it's running on port 3000. 
          <a href="/debug" className="ml-2 underline font-bold">Open Debug Console</a>
        </div>
      )}
      
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/accept" element={<InviteAcceptPage />} />
        
        {/* Debug route - public for easy access */}
        <Route path="/debug" element={<DebugPage />} />
        
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

