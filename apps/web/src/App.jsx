import React from 'react';
import WorkspacePage from './pages/WorkspacePage';

// Simple demo app: pass workspace id via env or change here
const DEMO_WORKSPACE = import.meta.env.VITE_WORKSPACE_ID || 'replace-workspace-id';

export default function App() {
  return (
    <div>
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto">My Workflow</div>
      </header>
      <WorkspacePage workspaceId={DEMO_WORKSPACE} />
    </div>
  );
}
