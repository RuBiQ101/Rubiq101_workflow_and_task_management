# Workflow Management Web Interface

A modern, intuitive web interface for managing workflows, tasks, and team collaboration.

## 🎯 Features

### Dashboard
- **Overview Statistics**: View total projects, active tasks, completed tasks, and active workflows
- **Workspace Management**: Create and manage multiple workspaces
- **Recent Activity Feed**: Track team activities in real-time
- **Quick Actions**: Fast access to create projects, tasks, workflows, and view reports

### Workflow Management
- **Multiple View Modes**:
  - 📋 **Kanban Board**: Drag-and-drop task management with visual columns
  - 📝 **List View**: Detailed table view with sorting and filtering
  - 📅 **Calendar View**: Date-based task visualization

- **Workflow Templates**:
  - Blank Workflow
  - Agile Sprint (Backlog → To Do → In Progress → Review → Done)
  - Design Process (Ideas → Wireframe → Design → Review → Approved)
  - Content Creation (Ideas → Draft → Edit → Review → Published)

### Task Management
- Create, edit, and delete tasks
- Assign priorities (Low, Medium, High, Urgent)
- Set due dates
- Add descriptions and tags
- Assign team members
- Track task status across workflow stages

### Real-time Collaboration
- Live updates using WebSockets
- Activity tracking and notifications
- Multi-user workspace support

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database running
- Backend API server running (see backend setup)

### Installation

1. **Navigate to the web app directory**:
   ```powershell
   cd "c:\My Projects\Workflow management\workflow-platform\apps\web"
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Configure environment variables**:
   
   Create or update `.env` file:
   ```env
   VITE_API_BASE=http://localhost:3001
   VITE_WORKSPACE_ID=your-workspace-id
   ```

4. **Start the development server**:
   ```powershell
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
apps/web/src/
├── pages/
│   ├── DashboardPage.jsx          # Main dashboard
│   ├── WorkflowManagementPage.jsx # Workflow management interface
│   ├── WorkspacePage.jsx          # Workspace view
│   └── InviteAcceptPage.jsx       # Team invitation
├── components/
│   ├── KanbanBoard.jsx            # Drag-and-drop Kanban board
│   ├── ListView.jsx               # List/table view
│   ├── CalendarView.jsx           # Calendar view
│   ├── ProjectBoard.jsx           # Project board component
│   ├── TaskModal.jsx              # Task details modal
│   ├── CommentsThread.jsx         # Comments component
│   └── ActivityFeed.jsx           # Activity feed
├── api/
│   └── client.js                  # API client configuration
├── hooks/                         # Custom React hooks
├── App.jsx                        # Main app component
└── main.jsx                       # Entry point
```

## 🎨 Usage Guide

### Creating a Workspace
1. Click **"+ New Workspace"** on the dashboard
2. Enter workspace name and details
3. Click **"Create"**

### Creating a Workflow
1. Open a workspace
2. Click **"+ New Workflow"**
3. Choose a template or start blank
4. Customize columns and settings

### Managing Tasks

#### Kanban View
- Drag tasks between columns to update status
- Click **"+"** on any column to add a task
- Click a task card to view/edit details

#### List View
- Sort by: Due Date, Priority, Status, or Title
- Filter by Status or Priority
- Click any row to view task details

#### Calendar View
- View tasks by due date
- Navigate between months
- Click a task to view/edit
- Color-coded by priority

### Task Actions
- **Create**: Click "+ Add Task" or "+" in Kanban columns
- **Edit**: Click a task to open details, then "Edit Task"
- **Update Status**: Drag in Kanban or change in task modal
- **Set Priority**: Choose Low, Medium, High, or Urgent
- **Assign**: Select team member from dropdown
- **Delete**: Open task modal and click "Delete"

## 🔧 Customization

### Workflow Templates
Edit `WorkflowManagementPage.jsx` to add custom templates:

```javascript
const templates = [
  { 
    id: 'custom', 
    name: 'Custom Workflow', 
    columns: ['Stage 1', 'Stage 2', 'Stage 3'] 
  },
  // Add more templates...
];
```

### Theme Colors
Modify `tailwind.config.js` to customize colors:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
        // ...
      },
    },
  },
};
```

## 🌐 API Integration

The interface communicates with the backend API. Key endpoints:

- `GET /workspaces` - List workspaces
- `POST /workspaces` - Create workspace
- `GET /workspaces/:id/workflows` - Get workflows
- `POST /workspaces/:id/workflows` - Create workflow
- `GET /workflows/:id/tasks` - Get tasks
- `POST /workflows/:id/tasks` - Create task
- `PATCH /tasks/:id` - Update task
- `GET /dashboard/stats` - Dashboard statistics
- `GET /activities/recent` - Recent activity

## 🐛 Troubleshooting

### Development Server Won't Start
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules; npm install`

### API Connection Issues
- Verify backend is running on `http://localhost:3001`
- Check `.env` file has correct `VITE_API_BASE`
- Check browser console for CORS errors

### Drag and Drop Not Working
- Clear browser cache
- Check console for @dnd-kit errors
- Ensure tasks have unique IDs

## 📦 Building for Production

```powershell
npm run build
```

Output will be in `dist/` directory. Deploy to:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag `dist/` folder to Netlify
- **Static Server**: Serve `dist/` with any web server

## 🎓 Learning Resources

- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [@dnd-kit Documentation](https://docs.dndkit.com/)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with React 19, Tailwind CSS 4, and modern web technologies**
