# 🚀 Workflow Management Platform

A full-stack workflow and task management platform with real-time collaboration capabilities, built with modern technologies.

## ✨ Features

- **🔐 Authentication & Authorization**: JWT-based authentication with secure password hashing
- **🏢 Multi-tenancy**: Organizations, workspaces, and role-based access control
- **📋 Project Management**: Create projects with tasks and subtasks hierarchy
- **🔄 Real-time Collaboration**: Live updates using WebSockets (Socket.IO)
- **💬 Comments & Attachments**: Task comments and file attachments with S3 integration
- **📊 Activity Feed**: Comprehensive audit trail of all actions
- **🔔 Notifications**: Real-time push notifications
- **📱 Kanban Board UI**: Drag-and-drop task management interface

## 🛠 Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **PostgreSQL** - Relational database
- **Prisma** - Next-generation ORM
- **Socket.IO** - Real-time WebSocket communication
- **JWT** - Secure authentication
- **AWS S3** - File storage

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **Tailwind CSS 4** - Utility-first CSS framework
- **Socket.IO Client** - Real-time client
- **Axios** - HTTP client
- **React Router** - Client-side routing

## 📁 Project Structure

```
workflow-platform/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/          # Authentication module
│   │   │   ├── organization/   # Organization management
│   │   │   ├── projects/       # Project management
│   │   │   ├── tasks/          # Task management
│   │   │   ├── realtime/       # WebSocket gateway
│   │   │   ├── activity/       # Activity logging
│   │   │   ├── comments/       # Comment system
│   │   │   └── attachments/    # File uploads
│   │   └── prisma/
│   │       └── schema.prisma   # Database schema
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Page components
│       │   ├── api/            # API client
│       │   └── hooks/          # Custom React hooks
│       └── public/
└── packages/
    └── db/                     # Shared database types
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 16+
- AWS account (for file uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RuBiQ101/workflow-management-platform.git
   cd workflow-management-platform
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create `apps/api/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5434/workflow_db"
   JWT_SECRET="your-secret-key-change-in-production"
   PORT=3001
   
   # Optional: For file uploads
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-bucket-name
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```
   
   Create `apps/web/.env`:
   ```env
   VITE_API_BASE=http://localhost:3001
   ```

4. **Start PostgreSQL**
   ```bash
   # Using Docker
   docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5434:5432 -d postgres:16
   ```

5. **Run database migrations**
   ```bash
   cd apps/api
   pnpm exec prisma migrate dev
   ```

6. **Start the development servers**
   
   Terminal 1 (Backend):
   ```bash
   cd apps/api
   pnpm run start:dev
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd apps/web
   pnpm run dev
   ```

7. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📚 Documentation

- [Real-time Setup Guide](REALTIME_SETUP.md) - Complete WebSocket implementation guide
- [API Documentation](#api-endpoints) - REST API endpoints reference

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

### Organizations
- `POST /organizations` - Create organization
- `GET /organizations/:id` - Get organization details
- `POST /organizations/:id/members` - Add member

### Workspaces
- `POST /organizations/:orgId/workspaces` - Create workspace
- `GET /workspaces/:id` - Get workspace details

### Projects
- `POST /workspaces/:workspaceId/projects` - Create project
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project

### Tasks
- `POST /projects/:projectId/tasks` - Create task
- `GET /tasks/:id` - Get task details
- `PATCH /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task

### Comments
- `POST /tasks/:taskId/comments` - Add comment
- `GET /tasks/:taskId/comments` - Get all comments
- `DELETE /comments/:id` - Delete comment

### Attachments
- `POST /tasks/:taskId/attachments` - Upload file

### Activity Feed
- `GET /activities/workspace/:workspaceId` - Workspace activity
- `GET /activities/project/:projectId` - Project activity
- `GET /activities/task/:taskId` - Task activity

## 🔄 Real-time Events

WebSocket namespace: `/realtime`

**Emitted by server:**
- `task.updated` - Task modified
- `task.created` - New task created
- `task.deleted` - Task removed
- `comment.created` - New comment added
- `attachment.created` - File uploaded
- `notification` - User notification
- `activity.created` - New activity logged

**Sent by client:**
- `subscribe` - Join rooms `{ workspaceId, projectId, taskId }`
- `unsubscribe` - Leave rooms
- `ping` - Health check

## 🧪 Testing

Run the API tests:
```bash
cd apps/api
pnpm test
```

## 📦 Building for Production

```bash
# Build backend
cd apps/api
pnpm run build

# Build frontend
cd apps/web
pnpm run build
```

## 🚢 Deployment

### Backend (NestJS)
- Deploy to platforms like Railway, Render, or AWS
- Set environment variables
- Run migrations: `pnpm exec prisma migrate deploy`
- For horizontal scaling, add Redis adapter (see [REALTIME_SETUP.md](REALTIME_SETUP.md))

### Frontend (React)
- Deploy to Vercel, Netlify, or Cloudflare Pages
- Set `VITE_API_BASE` environment variable to production API URL

### Database
- Use managed PostgreSQL (e.g., AWS RDS, Supabase, Neon)
- Regular backups recommended

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- UI powered by [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- Real-time features with [Socket.IO](https://socket.io/)
- Database ORM by [Prisma](https://www.prisma.io/)

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ using modern web technologies**
