import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WorkspacePage from './pages/WorkspacePage';
import InviteAcceptPage from './pages/InviteAcceptPage';

// Simple demo app: pass workspace id via env or change here
const DEMO_WORKSPACE = import.meta.env.VITE_WORKSPACE_ID || 'replace-workspace-id';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Invite acceptance page (no header) */}
        <Route path="/invite/accept" element={<InviteAcceptPage />} />
        
        {/* Main app with header */}
        <Route
          path="/*"
          element={
            <div>
              <header className="bg-white shadow-sm p-4">
                <div className="max-w-7xl mx-auto">My Workflow</div>
              </header>
              <Routes>
                <Route path="/" element={<WorkspacePage workspaceId={DEMO_WORKSPACE} />} />
                <Route path="/dashboard" element={<WorkspacePage workspaceId={DEMO_WORKSPACE} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

