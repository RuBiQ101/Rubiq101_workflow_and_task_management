import React from 'react';
import ProjectBoard from '../components/ProjectBoard';

export default function WorkspacePage({ workspaceId }) {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <ProjectBoard workspaceId={workspaceId} />
      </div>
    </div>
  );
}
