# 📤 S3 Presigned Upload - Implementation Complete

## What Was Implemented

✅ **Backend (NestJS)**
- `AttachmentsPresignController` with two endpoints:
  - `GET /tasks/:taskId/attachments/presign` - Generate presigned upload URL
  - `POST /tasks/:taskId/attachments/complete` - Create DB record after upload
- AWS SDK integration (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- Security validation (membership, key prefix)
- Realtime event emission on upload complete

✅ **Frontend (React)**
- `upload.presigned.js` - Helper function for 3-step upload
- Environment variable support (`VITE_API_BASE`)

✅ **Documentation**
- `S3_PRESIGNED_UPLOAD_GUIDE.md` - Comprehensive guide (400+ lines)
- Environment variable templates
- Testing procedures
- AWS setup instructions

---

## How It Works

```
Client Request → Backend Presign → S3 Upload → Backend Complete → DB Record
                    ↓                  ↓                  ↓
              Validates User    Direct Upload    Creates Attachment
              Generates Key     (No Server)      Emits Realtime Event
              Returns URL
```

---

## Quick Start

### 1. Install Dependencies (Already Done ✅)
```bash
cd apps/api
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Configure Environment

Add to `apps/api/.env`:
```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_PRESIGN_EXPIRES_SEC=300
```

### 3. Setup AWS S3

**Create Bucket:**
```bash
aws s3 mb s3://your-bucket-name --region us-east-1
```

**Configure CORS:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:5173", "https://your-domain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Apply:
```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors.json
```

**Create IAM User:**
- Permissions: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`
- Generate access key
- Add to `.env`

### 4. Frontend Usage

```javascript
import { uploadFileToS3Presigned } from '../api/upload.presigned';

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const attachment = await uploadFileToS3Presigned({ 
      taskId: currentTask.id, 
      file 
    });
    console.log('Upload complete:', attachment);
  } catch (err) {
    console.error('Upload failed:', err);
  }
}
```

---

## API Endpoints

### Get Presigned URL
```http
GET /tasks/:taskId/attachments/presign?filename=test.png&contentType=image/png
Authorization: Bearer <token>

Response:
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/...?X-Amz-Signature=...",
  "key": "attachments/workspace/task/1699500000-test.png",
  "expiresIn": 300,
  "bucket": "your-bucket-name",
  "region": "us-east-1"
}
```

### Complete Upload
```http
POST /tasks/:taskId/attachments/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "key": "attachments/workspace/task/1699500000-test.png",
  "filename": "test.png",
  "mimeType": "image/png",
  "size": 12345
}

Response:
{
  "id": "...",
  "uploaderId": "...",
  "taskId": "...",
  "url": "https://bucket.s3.amazonaws.com/...",
  "filename": "test.png",
  "mimeType": "image/png",
  "size": 12345,
  "createdAt": "2025-11-08T..."
}
```

---

## Security Features

✅ **JWT Authentication** - All endpoints require valid token  
✅ **Membership Validation** - Verifies user can access task  
✅ **Key Prefix Validation** - Prevents tampering with upload path  
✅ **Short-Lived URLs** - 5 minute expiry (configurable)  
✅ **Private ACL** - Objects not publicly accessible  
✅ **Content-Type Enforcement** - Must match between presign and upload  

---

## Testing

### Manual Test with curl

```bash
# 1. Get presigned URL
TOKEN="your_jwt_token"
TASK_ID="task_id"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/tasks/$TASK_ID/attachments/presign?filename=test.png&contentType=image/png"

# 2. Upload to S3 (use uploadUrl from response)
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/png" \
  --data-binary @test.png

# 3. Complete upload
curl -X POST "http://localhost:3001/tasks/$TASK_ID/attachments/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"attachments/.../test.png","filename":"test.png","mimeType":"image/png","size":12345}'
```

### Verify Upload

```bash
# List files in S3 bucket
aws s3 ls s3://your-bucket-name/attachments/ --recursive

# Check specific file
aws s3 ls s3://your-bucket-name/attachments/workspace/task/
```

---

## Files Created/Modified

### Backend
- ✅ `apps/api/src/attachments/attachments.presign.controller.ts` (NEW)
- ✅ `apps/api/src/attachments/attachments.module.ts` (UPDATED)
- ✅ `apps/api/.env` (UPDATED - Added AWS vars)
- ✅ `apps/api/.env.example` (UPDATED)

### Frontend
- ✅ `apps/web/src/api/upload.presigned.js` (NEW)

### Documentation
- ✅ `S3_PRESIGNED_UPLOAD_GUIDE.md` (NEW - Comprehensive guide)
- ✅ `S3_UPLOAD_SUMMARY.md` (NEW - This file)

### Dependencies
- ✅ `@aws-sdk/client-s3` (v3.x)
- ✅ `@aws-sdk/s3-request-presigner` (v3.x)

---

## Benefits Over Direct Upload

### Traditional (Server Proxy):
❌ Files buffer in server memory  
❌ High server CPU/bandwidth usage  
❌ Slower uploads (double transfer)  
❌ Scalability issues with large files  
❌ Increased infrastructure costs  

### Presigned URLs:
✅ Direct client-to-S3 transfer  
✅ No server memory usage  
✅ Faster uploads (single transfer)  
✅ Handles large files easily  
✅ Reduced backend load  
✅ Parallel upload support  

---

## Common Issues & Solutions

### "Access Denied" on S3 Upload
- Check IAM user permissions
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- Ensure bucket policy allows uploads

### CORS Error
- Configure bucket CORS (see guide)
- Match frontend origin exactly
- Include `PUT` in allowed methods

### "Invalid key for this task"
- Don't modify the `key` from presign response
- Ensure taskId matches between presign and complete

### Upload URL Expired
- Increase `S3_PRESIGN_EXPIRES_SEC` (max 300)
- Request new presigned URL
- Check clock sync

---

## Next Steps

### Immediate
1. Set up S3 bucket and IAM user
2. Configure CORS on bucket
3. Add AWS credentials to `.env`
4. Test upload with curl

### Short Term
1. Add file size validation (client + server)
2. Implement content-type whitelist
3. Add upload progress indicator
4. Create download presigned URL endpoint

### Long Term
1. Implement virus scanning (Lambda)
2. Add image thumbnails generation
3. Set up CloudFront CDN
4. Configure S3 lifecycle policies
5. Add bulk upload support

---

## Production Checklist

Before deploying to production:

- [ ] S3 bucket created with encryption
- [ ] CORS configured for production domain
- [ ] IAM user has minimal required permissions
- [ ] Environment variables set in production
- [ ] Private ACL confirmed on test uploads
- [ ] File size limits enforced
- [ ] Content-type validation active
- [ ] Presign expiry set (60-300 sec)
- [ ] Download URLs implemented
- [ ] Error handling tested
- [ ] CloudWatch alarms configured
- [ ] Lifecycle policies for cost optimization

---

## Architecture Diagram

```
┌──────────────┐
│   Browser    │
│   (React)    │
└──────┬───────┘
       │
       │ 1. POST /tasks/:id/attachments/presign
       │    (filename, contentType)
       ▼
┌──────────────────────────────┐
│   NestJS Backend             │
│   - Verify JWT               │
│   - Check membership         │
│   - Generate S3 key          │
│   - Create presigned URL     │
└──────┬───────────────────────┘
       │
       │ 2. Return { uploadUrl, key }
       ▼
┌──────────────┐
│   Browser    │───────────────────────┐
└──────────────┘                       │
                                       │ 3. PUT file (direct)
                                       ▼
                              ┌─────────────────┐
                              │   AWS S3        │
                              │  (us-east-1)    │
                              │  ACL: private   │
                              └─────────────────┘

       │ 4. POST /tasks/:id/attachments/complete
       │    (key, filename, size, mimeType)
       ▼
┌──────────────────────────────┐
│   NestJS Backend             │
│   - Validate key prefix      │
│   - Create Attachment record │
│   - Emit realtime event      │
└──────────────────────────────┘
       │
       │ 5. Attachment record
       ▼
┌──────────────┐
│  PostgreSQL  │
└──────────────┘
```

---

## Key Takeaways

🎯 **Scalable** - Handles large files without server memory issues  
🔒 **Secure** - Short-lived URLs, membership validation, private ACL  
⚡ **Fast** - Direct uploads, no server bottleneck  
💰 **Cost-Effective** - Reduced bandwidth and compute costs  
📱 **Mobile-Friendly** - Works great on slow connections  

---

## Support & Resources

**Documentation:**
- `S3_PRESIGNED_UPLOAD_GUIDE.md` - Full implementation guide
- AWS S3 Docs: https://docs.aws.amazon.com/s3/
- AWS SDK Docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/

**AWS Console:**
- S3: https://s3.console.aws.amazon.com/
- IAM: https://console.aws.amazon.com/iam/
- CloudWatch: https://console.aws.amazon.com/cloudwatch/

---

## 🎉 Implementation Complete!

The S3 presigned upload system is **ready to use**!

**Next:** Set up your S3 bucket and test the upload flow.

See `S3_PRESIGNED_UPLOAD_GUIDE.md` for detailed instructions.

Happy uploading! 🚀📤
