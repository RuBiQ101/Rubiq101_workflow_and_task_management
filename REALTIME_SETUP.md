# Real-time Collaboration Setup Guide

This guide documents the complete real-time collaboration implementation for the Workflow Management Platform using WebSockets (Socket.IO).

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Setup](#backend-setup)
- [Frontend Integration](#frontend-integration)
- [API Endpoints](#api-endpoints)
- [Real-time Events](#real-time-events)
- [Testing](#testing)
- [Deployment](#deployment)

## 🎯 Overview

The platform implements real-time features including:

- **Live Task Updates**: See changes as other users edit tasks
- **Real-time Comments**: Comments appear instantly across all connected clients
- **Activity Feed**: Audit trail of all actions in workspaces/projects
- **Notifications**: Push notifications for task assignments, comments, etc.
- **File Attachments**: Upload and share files on tasks

## 🏗 Architecture

### WebSocket Infrastructure

- **Protocol**: Socket.IO (WebSockets with fallback)
- **Authentication**: JWT token verified on connection
- **Namespace**: `/realtime`
- **Room-based Subscriptions**: Users join rooms for workspace, project, task updates

### Room Structure

```
user:{userId}          - Personal notifications
workspace:{id}         - Workspace-level updates
project:{id}          - Project-level updates (tasks created/deleted)
task:{id}             - Task-level updates (comments, attachments)
```

### Database Models

```prisma
model Comment {
  id        String   @id @default(cuid())
  authorId  String
  taskId    String
  content   String
  createdAt DateTime @default(now())
  author    User     @relation(...)
  task      ProjectTask @relation(...)
}

model Attachment {
  id         String   @id @default(cuid())
  uploaderId String
  taskId     String
  url        String
  filename   String
  mimeType   String?
  size       Int
  createdAt  DateTime @default(now())
}

model Activity {
  id             String   @id @default(cuid())
  actorId        String
  organizationId String?
  workspaceId    String?
  projectId      String?
  taskId         String?
  type           String
  payload        Json
  createdAt      DateTime @default(now())
  
  @@index([workspaceId])
  @@index([projectId])
  @@index([taskId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  actorId   String?
  type      String
  data      Json
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
  
  @@index([userId, read, createdAt])
}
```

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd apps/api
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add @aws-sdk/client-s3 multer
pnpm add -D @types/multer
```

### 2. File Structure

```
apps/api/src/
├── realtime/
│   ├── realtime.gateway.ts      # WebSocket gateway
│   ├── realtime.service.ts      # Event emission service
│   └── realtime.module.ts       # Module config
├── activity/
│   ├── activity.service.ts      # Activity logging
│   ├── activity.controller.ts   # Activity feed endpoints
│   └── activity.module.ts
├── comments/
│   ├── comments.service.ts      # Comment CRUD
│   ├── comments.controller.ts   # Comment endpoints
│   └── comments.module.ts
└── attachments/
    ├── attachments.controller.ts # File upload
    └── attachments.module.ts
```

### 3. WebSocket Gateway

The gateway (`realtime.gateway.ts`) handles:

- **JWT Authentication**: Verifies token on connection
- **Room Subscriptions**: Server-side permission checks before joining rooms
- **Connection Management**: Handles connect/disconnect events

Key methods:
- `handleConnection()`: Authenticate user, join personal room
- `handleSubscribe()`: Validate access and join workspace/project/task rooms
- `handleUnsubscribe()`: Leave rooms

### 4. Realtime Service

The service (`realtime.service.ts`) provides methods to emit events:

```typescript
emitTaskUpdated(task)          // Notify task changes
emitTaskCreated(task)          // New task in project
emitTaskDeleted(taskId, projectId)
emitCommentCreated(comment)    // New comment on task
emitAttachmentAdded(attachment)
emitNotification(userId, payload)
emitProjectUpdated(project)
emitActivityCreated(activity)
```

### 5. Integration Example

In any service (e.g., `task.service.ts`):

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly realtime: RealtimeService,
  private readonly activity: ActivityService,
) {}

async update(taskId: string, dto: UpdateTaskDto, userId: string) {
  const updated = await this.prisma.projectTask.update({
    where: { id: taskId },
    data: dto,
    include: { project: true },
  });

  // Log activity
  await this.activity.createActivity({
    actorId: userId,
    workspaceId: updated.project.workspaceId,
    projectId: updated.projectId,
    taskId: updated.id,
    type: 'task.updated',
    payload: { changes: dto },
  });

  // Emit real-time event
  this.realtime.emitTaskUpdated(updated);

  return updated;
}
```

## 💻 Frontend Integration

### 1. Install Dependencies

```bash
cd apps/web
pnpm add socket.io-client
```

### 2. Connection Client (`src/api/realtime.js`)

```javascript
import { io } from 'socket.io-client';

export function connectRealtime(token) {
  return io('http://localhost:3001/realtime', {
    auth: { token },
    transports: ['websocket'],
  });
}

export function subscribe(rooms = {}) {
  socket.emit('subscribe', rooms);
}

export function on(event, handler) {
  socket.on(event, handler);
}
```

### 3. React Hook (`src/hooks/useRealtime.js`)

```javascript
import { useEffect } from 'react';
import { connectRealtime, subscribe, on, off } from '../api/realtime';

export function useRealtime(token, rooms = {}, handlers = {}) {
  useEffect(() => {
    if (!token) return;
    
    const socket = connectRealtime(token);
    subscribe(rooms);
    
    Object.entries(handlers).forEach(([event, handler]) => {
      on(event, handler);
    });
    
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        off(event, handler);
      });
    };
  }, [token, rooms.workspaceId, rooms.projectId, rooms.taskId]);
}
```

### 4. Component Integration

**ProjectBoard Example:**

```javascript
const token = localStorage.getItem('token');

useRealtime(
  token,
  { workspaceId, projectId: selectedProject?.id },
  {
    'task.updated': (task) => {
      // Update task in state
      setTasksByStatus(prev => {
        const copy = { ...prev };
        // Remove from old status, add to new
        for (const s in copy) {
          copy[s] = copy[s].filter(t => t.id !== task.id);
        }
        copy[task.status] = [task, ...(copy[task.status] || [])];
        return copy;
      });
    },
    'task.created': (task) => {
      // Add new task to board
    },
    'comment.created': (comment) => {
      // Add comment to task
    },
  }
);
```

**TaskModal Example:**

```javascript
useRealtime(
  token,
  { taskId: task.id },
  {
    'task.updated': (updatedTask) => {
      if (hasUnsavedChanges) {
        alert('Task was updated by another user!');
      } else {
        setTask(updatedTask);
      }
    },
    'comment.created': (comment) => {
      setComments(prev => [...prev, comment]);
    },
  }
);
```

### 5. Optimistic Updates Pattern

```javascript
const createTask = async (taskData) => {
  const tempId = `temp-${Date.now()}`;
  const optimisticTask = { id: tempId, ...taskData };
  
  // Update UI immediately
  setTasks(prev => [...prev, optimisticTask]);
  
  try {
    const realTask = await api.createTask(taskData);
    // Replace temp with real
    setTasks(prev => prev.map(t => t.id === tempId ? realTask : t));
  } catch (error) {
    // Remove on error
    setTasks(prev => prev.filter(t => t.id !== tempId));
  }
};
```

## 📡 API Endpoints

### Comments

```
POST   /tasks/:taskId/comments      Create comment
GET    /tasks/:taskId/comments      Get all comments
DELETE /comments/:id                Delete comment
```

### Attachments

```
POST   /tasks/:taskId/attachments   Upload file (multipart/form-data)
```

### Activity Feed

```
GET /activities/workspace/:workspaceId?page=1&limit=20
GET /activities/project/:projectId?page=1&limit=20
GET /activities/task/:taskId?page=1&limit=20
```

## 🔔 Real-time Events

### Emitted by Server

| Event | Payload | Rooms |
|-------|---------|-------|
| `task.updated` | Task object | `project:{id}`, `task:{id}`, `user:{assigneeId}` |
| `task.created` | Task object | `project:{id}` |
| `task.deleted` | `{ taskId, projectId }` | `project:{id}` |
| `comment.created` | Comment object | `task:{id}` |
| `comment.deleted` | `{ id }` | `task:{id}` |
| `attachment.created` | Attachment object | `task:{id}` |
| `project.updated` | Project object | `workspace:{id}` |
| `activity.created` | Activity object | `workspace:{id}`, `project:{id}` |
| `notification` | Notification object | `user:{id}` |

### Emitted by Client

| Event | Payload | Response |
|-------|---------|----------|
| `subscribe` | `{ workspaceId?, projectId?, taskId? }` | `{ ok: true/false }` |
| `unsubscribe` | `{ workspaceId?, projectId?, taskId? }` | `{ ok: true/false }` |
| `ping` | - | `pong` event |

## 🧪 Testing

### Manual Testing

1. **Open two browser windows** (or incognito + normal)
2. **Login** to both with different users in the same organization
3. **Navigate** to the same project board
4. **Edit a task** in window 1
5. **Verify** window 2 sees the update instantly
6. **Add a comment** in window 2
7. **Verify** window 1 sees the comment

### Browser DevTools

Check WebSocket connection:
- Network tab → WS filter
- Should see connection to `ws://localhost:3001/realtime`
- Messages tab shows real-time events

### Backend Logs

NestJS logs show:
```
[RealtimeGateway] Client connected: abc123 as user:user-id-1
[RealtimeService] Emitted task.updated for task task-id-1
```

## 🚀 Deployment

### Environment Variables

**Backend (.env):**
```env
JWT_SECRET=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
REDIS_URL=redis://localhost:6379  # For horizontal scaling
```

**Frontend (.env):**
```env
VITE_API_BASE=https://api.yourapp.com
```

### Horizontal Scaling with Redis

For multiple backend instances, use Redis adapter:

```bash
pnpm add @socket.io/redis-adapter ioredis
```

In `main.ts`:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await pubClient.connect();
await subClient.connect();

io.adapter(createAdapter(pubClient, subClient));
```

### CORS Configuration

Update gateway CORS for production:

```typescript
@WebSocketGateway({
  cors: {
    origin: ['https://yourapp.com'],
    credentials: true,
  },
})
```

### HTTPS/WSS

- Use HTTPS for API in production
- WebSocket automatically upgrades to WSS (wss://)
- Configure SSL certificates in your hosting environment

## 🔒 Security Considerations

1. **JWT Verification**: Every connection validates JWT token
2. **Permission Checks**: Server validates room subscriptions against user membership
3. **Rate Limiting**: Consider rate-limiting comments/file uploads per user
4. **File Upload**: Validate file types, scan for malware
5. **SQL Injection**: Use Prisma parameterized queries (already protected)
6. **XSS**: Sanitize user input in comments before rendering

## 📊 Performance Tips

1. **Limit Room Memberships**: Users should only join relevant rooms
2. **Pagination**: Activity feed uses pagination (limit 20 items)
3. **Debounce Rapid Updates**: Debounce typing events if implementing live editing
4. **Connection Pooling**: Use Redis for pub/sub across multiple servers
5. **CDN for Attachments**: Serve S3 files via CloudFront CDN

## 🐛 Troubleshooting

**WebSocket won't connect:**
- Check CORS configuration
- Verify JWT token is valid
- Check firewall allows WebSocket connections

**Events not received:**
- Verify room subscription succeeded
- Check backend logs for emit calls
- Ensure frontend event handlers are attached before events fire

**TypeScript errors:**
- Run `pnpm exec prisma generate` after schema changes
- Restart TypeScript server in VS Code

## 📚 Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

**Implementation Status:** ✅ Complete

- ✅ WebSocket gateway with JWT auth
- ✅ Room-based subscriptions with permission checks
- ✅ Activity logging service
- ✅ Comments CRUD with real-time
- ✅ Attachments upload endpoint
- ✅ Frontend client and React hook
- ✅ Integration examples for ProjectBoard and TaskModal
