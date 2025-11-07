# Complete Setup Guide - Real-time Collaboration & File Uploads

This guide contains all the steps needed to implement real-time collaboration and file uploads in your workflow management platform.

## 📋 Prerequisites Checklist

Before implementing, ensure you have:

- ✅ Node.js 18+ and pnpm installed
- ✅ PostgreSQL 16+ running
- ✅ AWS account with S3 bucket created (for file uploads)
- ✅ Redis instance (optional, for horizontal scaling)

## 🚀 Installation Steps

### Step 1: Install Backend Dependencies

```bash
cd apps/api
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer
pnpm add -D @types/multer

# Optional: For horizontal scaling
# pnpm add @socket.io/redis-adapter ioredis
```

### Step 2: Install Frontend Dependencies

```bash
cd apps/web
pnpm add socket.io-client
```

### Step 3: Update Prisma Schema

The following models should already be in your `apps/api/prisma/schema.prisma`:

```prisma
model Comment {
  id        String      @id @default(cuid())
  authorId  String
  taskId    String
  content   String
  createdAt DateTime    @default(now())
  
  author    User        @relation(fields: [authorId], references: [id], onDelete: Cascade)
  task      ProjectTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model Attachment {
  id         String      @id @default(cuid())
  uploaderId String
  taskId     String
  url        String
  filename   String
  mimeType   String?
  size       Int
  createdAt  DateTime    @default(now())
  
  uploader   User        @relation(fields: [uploaderId], references: [id], onDelete: Cascade)
  task       ProjectTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
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
  
  actor          User     @relation(fields: [actorId], references: [id], onDelete: Cascade)
  
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
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  actor     User?    @relation("NotificationActor", fields: [actorId], references: [id], onDelete: SetNull)
  
  @@index([userId, read, createdAt])
}
```

Run migration:

```bash
cd apps/api
pnpm exec prisma migrate dev --name realtime_activity_comments_attachments
pnpm exec prisma generate
```

### Step 4: Configure Environment Variables

Create/update `apps/api/.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5434/workflow_db"

# JWT
JWT_SECRET="your-secret-key-change-in-production"

# Server
PORT=3001

# AWS S3 (Required for file uploads)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET=your-bucket-name

# Redis (Optional - for horizontal scaling)
# REDIS_URL=redis://localhost:6379
```

Create/update `apps/web/.env`:

```env
VITE_API_BASE=http://localhost:3001
```

### Step 5: Verify File Structure

Ensure these files exist in your project:

```
apps/api/src/
├── realtime/
│   ├── realtime.gateway.ts
│   ├── realtime.service.ts
│   └── realtime.module.ts
├── activity/
│   ├── activity.service.ts
│   ├── activity.controller.ts
│   └── activity.module.ts
├── comments/
│   ├── comments.service.ts
│   ├── comments.controller.ts
│   └── comments.module.ts
├── attachments/
│   ├── attachments.controller.ts
│   └── attachments.module.ts
└── app.module.ts (updated with all modules)

apps/web/src/
├── api/
│   ├── realtime.js
│   └── upload.js
└── hooks/
    └── useRealtime.js
```

## 🔧 Configuration

### Backend Module Registration

Ensure `apps/api/src/app.module.ts` imports all modules:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    OrganizationModule,
    ProjectModule,
    TaskModule,
    RealtimeModule,      // ← WebSocket support
    ActivityModule,      // ← Activity logging
    CommentsModule,      // ← Comments
    AttachmentsModule,   // ← File uploads
  ],
  providers: [PrismaService],
})
export class AppModule {}
```

### AWS S3 Bucket Configuration

1. Create an S3 bucket in AWS Console
2. Set bucket permissions (CORS configuration):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:5173", "https://yourapp.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

3. Create IAM user with S3 permissions and generate access keys

## 🧪 Testing

### Test 1: WebSocket Connection

1. Start the backend:
   ```bash
   cd apps/api
   pnpm run start:dev
   ```

2. Open browser console and test connection:
   ```javascript
   const token = localStorage.getItem('token'); // Your JWT token
   const socket = io('http://localhost:3001/realtime', {
     auth: { token },
     transports: ['websocket']
   });
   
   socket.on('connect', () => console.log('Connected:', socket.id));
   socket.emit('ping');
   socket.on('pong', (data) => console.log('Pong:', data));
   ```

### Test 2: Real-time Task Updates

1. Open two browser windows
2. Login to both (can be same or different users in same org)
3. Navigate to the same project
4. Edit a task in window 1
5. Verify window 2 receives the update instantly

### Test 3: File Upload

Test presigned URL upload:

```javascript
const file = document.querySelector('input[type="file"]').files[0];
const taskId = 'your-task-id';

// Get presigned URL
const response = await fetch(
  `http://localhost:3001/tasks/${taskId}/attachments/presign?filename=${file.name}&contentType=${file.type}`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
const { presignedUrl, url } = await response.json();

// Upload to S3
await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});

// Confirm with server
await fetch(
  `http://localhost:3001/tasks/${taskId}/attachments/confirm?url=${url}&filename=${file.name}&size=${file.size}&mimeType=${file.type}`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }
);
```

## 📊 API Endpoints Reference

### WebSocket Events

**Connection**: `ws://localhost:3001/realtime`

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `subscribe` | Client → Server | `{ workspaceId?, projectId?, taskId? }` | Join rooms |
| `unsubscribe` | Client → Server | `{ workspaceId?, projectId?, taskId? }` | Leave rooms |
| `ping` | Client → Server | - | Health check |
| `pong` | Server → Client | `{ time }` | Health response |
| `task.updated` | Server → Client | Task object | Task modified |
| `task.created` | Server → Client | Task object | New task |
| `task.deleted` | Server → Client | `{ taskId, projectId }` | Task removed |
| `comment.created` | Server → Client | Comment object | New comment |
| `attachment.created` | Server → Client | Attachment object | File uploaded |
| `notification` | Server → Client | Notification object | User alert |

### REST Endpoints

**Comments:**
- `POST /tasks/:taskId/comments` - Create comment
- `GET /tasks/:taskId/comments` - List comments
- `DELETE /comments/:id` - Delete comment

**Attachments:**
- `POST /tasks/:taskId/attachments` - Direct upload (multipart/form-data)
- `GET /tasks/:taskId/attachments/presign?filename=X&contentType=Y` - Get presigned URL
- `POST /tasks/:taskId/attachments/confirm?url=X&filename=Y&size=Z` - Confirm upload

**Activity:**
- `GET /activities/workspace/:workspaceId?page=1&limit=20` - Workspace activity
- `GET /activities/project/:projectId?page=1&limit=20` - Project activity
- `GET /activities/task/:taskId?page=1&limit=20` - Task activity

## 🚀 Deployment

### Production Environment Variables

```env
# Production API URL
VITE_API_BASE=https://api.yourapp.com

# Secure JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-production-secret

# Production S3 bucket
AWS_S3_BUCKET=production-bucket-name

# Redis for horizontal scaling
REDIS_URL=redis://your-redis-instance:6379
```

### Deployment Checklist

- ✅ Set secure JWT_SECRET (not the default)
- ✅ Configure production S3 bucket with proper CORS
- ✅ Enable HTTPS/WSS for WebSocket connections
- ✅ Set up Redis for multi-instance deployments
- ✅ Configure proper CORS origins (remove wildcards)
- ✅ Enable rate limiting on upload endpoints
- ✅ Set up monitoring for WebSocket connections
- ✅ Configure file size limits appropriately
- ✅ Implement file type validation
- ✅ Set up CloudFront CDN for S3 (optional but recommended)

### Horizontal Scaling with Redis

If deploying multiple backend instances:

1. Install Redis adapter:
   ```bash
   pnpm add @socket.io/redis-adapter ioredis
   ```

2. Update `main.ts` (see `main.redis-example.ts` for reference)

3. Ensure all instances connect to the same Redis instance

## 🐛 Troubleshooting

### WebSocket Connection Issues

**Problem**: Client can't connect to WebSocket
- ✅ Check CORS configuration in `realtime.gateway.ts`
- ✅ Verify JWT token is valid
- ✅ Check firewall allows WebSocket connections
- ✅ Ensure backend is running on correct port

**Problem**: Connection succeeds but events not received
- ✅ Verify room subscription succeeded (`subscribe` event)
- ✅ Check backend logs for emit calls
- ✅ Ensure user has permission to access the resource

### File Upload Issues

**Problem**: S3 upload fails
- ✅ Verify AWS credentials are correct
- ✅ Check S3 bucket CORS configuration
- ✅ Ensure bucket policy allows PutObject
- ✅ Verify file size within limits

**Problem**: Presigned URL expired
- ✅ URLs expire after 15 minutes by default
- ✅ Generate new URL if needed
- ✅ Implement retry logic in client

### TypeScript Errors

**Problem**: `Property 'projectTask' does not exist`
- ✅ Run `pnpm exec prisma generate` after schema changes
- ✅ Restart TypeScript server in VS Code

## 📚 Integration Examples

### React Component with Real-time

```javascript
import { useRealtime } from '../hooks/useRealtime';
import { uploadFile } from '../api/upload';

function TaskView({ task }) {
  const [comments, setComments] = useState([]);
  const token = localStorage.getItem('token');
  
  // Set up real-time listeners
  useRealtime(
    token,
    { taskId: task.id },
    {
      'task.updated': (updated) => {
        // Handle task update
      },
      'comment.created': (comment) => {
        setComments(prev => [...prev, comment]);
      },
      'attachment.created': (attachment) => {
        // Handle new attachment
      }
    }
  );
  
  // Handle file upload
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    try {
      await uploadFile(task.id, file, (progress) => {
        console.log(`Upload: ${progress}%`);
      });
    } catch (error) {
      alert('Upload failed');
    }
  };
  
  return (
    <div>
      <input type="file" onChange={handleFileSelect} />
      {/* Rest of component */}
    </div>
  );
}
```

## ✅ Verification Checklist

After implementation, verify:

- ✅ WebSocket connects successfully with JWT token
- ✅ Room subscriptions work with permission checks
- ✅ Real-time task updates appear in all connected clients
- ✅ Comments post and appear instantly
- ✅ File uploads work (both direct and presigned)
- ✅ Activity feed shows all actions
- ✅ Notifications sent to correct users
- ✅ TypeScript compiles without errors
- ✅ All tests pass

## 🎉 Next Steps

After completing setup:

1. Integrate real-time hooks into existing components
2. Add file preview/download functionality
3. Implement notification bell UI
4. Add optimistic UI updates
5. Set up monitoring and analytics
6. Configure backup strategy for S3

---

**Need help?** Check `REALTIME_SETUP.md` for more detailed documentation.
