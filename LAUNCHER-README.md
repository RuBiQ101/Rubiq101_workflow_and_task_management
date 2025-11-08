# 🚀 Workflo Launcher

One-click launcher scripts to start both frontend and backend servers simultaneously.

## Quick Start

### Option 1: Batch File (Recommended for Windows)

**Double-click:** `START-WORKFLO.bat`

This will:
1. ✅ Start the backend server (NestJS on port 3000)
2. ✅ Start the frontend server (Vite on port 5173)
3. ✅ Automatically open your browser to http://localhost:5173

### Option 2: PowerShell Script

**Right-click** `start-workflo.ps1` → **"Run with PowerShell"**

Or run in terminal:
```powershell
.\start-workflo.ps1
```

This provides a more interactive experience with:
- Port checking
- PostgreSQL connection verification
- Customizable browser launch prompt

## What Gets Started

### Backend Server (Port 3000)
- **Technology**: NestJS + Prisma
- **Location**: `apps/api`
- **Command**: `npm run start:dev`
- **Features**: REST API, WebSocket, PostgreSQL database

### Frontend Server (Port 5173/5174)
- **Technology**: React 19 + Vite
- **Location**: `apps/web`
- **Command**: `npm run dev`
- **Features**: Modern UI with Tailwind CSS 4, Framer Motion

## Prerequisites

Make sure you have:
- ✅ Node.js installed (v18+)
- ✅ Dependencies installed (`npm install` or `pnpm install` in both apps/api and apps/web)
- ✅ PostgreSQL running on port 5434
- ✅ `.env` files configured in both frontend and backend

## Demo Credentials

```
Email:    demo@example.com
Password: demo123
```

## Stopping the Servers

### Option 1: Close Windows (Recommended)
Simply **close the terminal windows** that were opened by the launcher.

### Option 2: Use Stop Script
**Double-click:** `STOP-WORKFLO.bat`

This will gracefully stop all Node.js processes.

### Option 3: Manual Stop
Press `Ctrl+C` in each terminal window.

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:
1. Check if servers are already running
2. Close any existing terminal windows
3. Try again

### Backend Won't Start

- Verify PostgreSQL is running: `psql -h localhost -p 5434 -U postgres`
- Check the `.env` file in `apps/api` has correct DATABASE_URL
- Run `npx prisma migrate dev` to apply migrations

### Frontend Won't Start

- Check if port 5173 is available
- Vite will automatically try port 5174 if 5173 is busy
- Verify dependencies are installed: `cd apps/web && npm install`

### Browser Doesn't Open

Manually open: http://localhost:5173 or http://localhost:5174

## Manual Start (Alternative)

If the launcher doesn't work, you can start manually:

### Terminal 1 - Backend
```bash
cd apps/api
npm run start:dev
```

### Terminal 2 - Frontend
```bash
cd apps/web
npm run dev
```

## Features After Launch

Once started, you can:
- 🔐 **Login** with demo credentials
- 📊 **Create Projects** and organize work
- ✅ **Manage Tasks** with drag-and-drop Kanban board
- 👥 **Collaborate** with team members
- 📝 **Comment** on tasks and projects
- 📎 **Attach Files** to tasks
- 🔔 **Get Notifications** for updates

## Development Servers

Both servers run in **development mode** with:
- 🔄 **Hot Reload**: Changes auto-refresh
- 🐛 **Debug Mode**: Full error messages
- 📝 **Watch Mode**: Files monitored for changes

## Need Help?

Check the main documentation:
- [KANBAN_IMPLEMENTATION.md](./KANBAN_IMPLEMENTATION.md) - Drag-and-drop Kanban board
- [README.md](./README.md) - Full project documentation
- Backend API: http://localhost:3000/api (Swagger docs if enabled)

---

**Enjoy using Workflo!** 🎉
