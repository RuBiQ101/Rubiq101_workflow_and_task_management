# 📤 S3 Presigned Upload System

## Overview

This system implements secure, direct-to-S3 file uploads using presigned URLs. This approach:
- **Avoids server memory issues** - Files upload directly from client to S3
- **Reduces server load** - No proxying through backend
- **Improves performance** - Parallel uploads, faster transfers
- **Maintains security** - Short-lived signed URLs with validation

---

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Request presigned URL
       ▼
┌─────────────────────────────────┐
│  POST /tasks/:id/attachments/   │
│         presign                  │
│  - Validates membership          │
│  - Generates S3 key              │
│  - Returns signed PUT URL        │
└──────┬──────────────────────────┘
       │ 2. Return uploadUrl + key
       ▼
┌─────────────┐
│   Client    │─────────────────────┐
└─────────────┘                     │ 3. PUT file to S3
                                    │    (direct upload)
                                    ▼
                           ┌─────────────────┐
                           │   AWS S3        │
                           │  (Private ACL)  │
                           └─────────────────┘
       │ 4. Notify complete
       ▼
┌───────────────────────────────────┐
│  POST /tasks/:id/attachments/     │
│         complete                   │
│  - Validates key prefix            │
│  - Creates Attachment record       │
│  - Emits realtime event            │
└───────────────────────────────────┘
```

---

## Backend Implementation

### 1. Dependencies

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Controller: `attachments.presign.controller.ts`

**Routes:**
- `GET /tasks/:taskId/attachments/presign` - Get presigned upload URL
- `POST /tasks/:taskId/attachments/complete` - Create DB record after upload

**Security Features:**
- ✅ JWT authentication required
- ✅ Organization membership validation
- ✅ Key prefix validation (prevents tampering)
- ✅ Short-lived URLs (60-300 seconds)
- ✅ Private ACL on S3 objects

**Key Generation:**
```
attachments/{workspaceId}/{taskId}/{timestamp}-{filename}
```

### 3. Environment Variables

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_PRESIGN_EXPIRES_SEC=300  # 5 minutes (60-300 recommended)
```

---

## Frontend Implementation

### 1. Upload Helper: `upload.presigned.js`

```javascript
import { uploadFileToS3Presigned } from '../api/upload.presigned';

async function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const attachment = await uploadFileToS3Presigned({ 
      taskId: currentTask.id, 
      file 
    });
    
    // Add to task UI
    setTask(prev => ({ 
      ...prev, 
      attachments: [...(prev.attachments||[]), attachment] 
    }));
  } catch (err) {
    console.error(err);
    alert('Upload failed: ' + err.message);
  }
}
```

### 2. React Component Example

```jsx
import { useState } from 'react';
import { uploadFileToS3Presigned } from '../api/upload.presigned';

export default function FileUploadButton({ taskId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (e.g., 10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    try {
      setUploading(true);
      const attachment = await uploadFileToS3Presigned({ taskId, file });
      onUploadComplete(attachment);
    } catch (err) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </label>
    </div>
  );
}
```

---

## AWS S3 Setup

### 1. Create S3 Bucket

```bash
# Via AWS CLI
aws s3 mb s3://your-bucket-name --region us-east-1
```

Or via AWS Console:
1. Go to S3 → Create bucket
2. Choose region (e.g., `us-east-1`)
3. **Block all public access** (keep objects private)
4. Enable versioning (optional)
5. Enable encryption (AES-256 or KMS)

### 2. Configure CORS

S3 bucket must allow PUT requests from your frontend origin.

**CORS Configuration (JSON format):**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://app.yourdomain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Apply CORS:**
```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors.json
```

Or via AWS Console:
1. S3 → Select bucket → Permissions → CORS
2. Paste JSON configuration
3. Save changes

### 3. Create IAM User

**Required Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

**Steps:**
1. IAM → Users → Create user
2. Attach policy (inline or managed)
3. Create access key
4. Copy `Access Key ID` and `Secret Access Key`
5. Add to `.env` file

### 4. Bucket Policy (Optional - Private Objects)

Ensure objects are NOT publicly accessible:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalType": "User"
        }
      }
    }
  ]
}
```

---

## Security Best Practices

### 1. Short Expiry Times

```env
S3_PRESIGN_EXPIRES_SEC=300  # 5 minutes max
```

**Why?**
- Limits window for URL abuse
- Forces fresh authentication for each upload
- Reduces attack surface

### 2. Key Prefix Validation

Backend validates key belongs to the task:

```typescript
const expectedPrefix = `attachments/${workspaceId}/${taskId}/`;
if (!key.startsWith(expectedPrefix)) {
  throw new BadRequestException('Invalid key');
}
```

**Prevents:**
- Users uploading to other tasks
- Path traversal attacks
- Arbitrary key tampering

### 3. File Size Limits

**Client-side validation:**
```javascript
if (file.size > 10 * 1024 * 1024) {
  throw new Error('File too large (max 10MB)');
}
```

**S3 bucket policy (optional):**
```json
{
  "Effect": "Deny",
  "Action": "s3:PutObject",
  "Condition": {
    "NumericGreaterThan": {
      "s3:content-length": "10485760"
    }
  }
}
```

### 4. Content-Type Validation

```javascript
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
if (!allowedTypes.includes(file.type)) {
  throw new Error('File type not allowed');
}
```

### 5. Private ACL

```typescript
const putCommand = new PutObjectCommand({
  Bucket: BUCKET,
  Key: key,
  ContentType: contentType,
  ACL: 'private',  // Objects are NOT publicly accessible
});
```

### 6. Membership Verification

```typescript
const isMember = task.project.workspace.organization.members.some(
  (m) => m.userId === userId,
);
if (!isMember) {
  throw new ForbiddenException('Not authorized');
}
```

---

## Testing

### 1. Manual Testing with curl

**Step 1: Get presigned URL**
```bash
TOKEN="your_jwt_token_here"
TASK_ID="task_id_here"

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/tasks/$TASK_ID/attachments/presign?filename=test.png&contentType=image/png"
```

**Response:**
```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/attachments/...?X-Amz-Signature=...",
  "key": "attachments/workspace/task/1699500000-test.png",
  "expiresIn": 300,
  "bucket": "your-bucket-name",
  "region": "us-east-1"
}
```

**Step 2: Upload file to S3**
```bash
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/png" \
  --data-binary @test.png
```

**Step 3: Complete upload**
```bash
curl -X POST "http://localhost:3001/tasks/$TASK_ID/attachments/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "attachments/workspace/task/1699500000-test.png",
    "filename": "test.png",
    "mimeType": "image/png",
    "size": 12345
  }'
```

### 2. Automated Test Script

**test-s3-upload.ps1:**
```powershell
$token = "your_jwt_token"
$taskId = "task_id"
$filePath = "test.png"

# Step 1: Get presigned URL
$filename = [System.IO.Path]::GetFileName($filePath)
$contentType = "image/png"
$presignUrl = "http://localhost:3001/tasks/$taskId/attachments/presign?filename=$filename&contentType=$contentType"

$presignResponse = Invoke-RestMethod -Uri $presignUrl -Headers @{
    "Authorization" = "Bearer $token"
}

Write-Host "Upload URL: $($presignResponse.uploadUrl)"

# Step 2: Upload to S3
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
Invoke-RestMethod -Uri $presignResponse.uploadUrl -Method Put -Body $fileBytes -Headers @{
    "Content-Type" = $contentType
}

Write-Host "File uploaded to S3"

# Step 3: Complete upload
$completeUrl = "http://localhost:3001/tasks/$taskId/attachments/complete"
$completeBody = @{
    key = $presignResponse.key
    filename = $filename
    mimeType = $contentType
    size = $fileBytes.Length
} | ConvertTo-Json

$attachment = Invoke-RestMethod -Uri $completeUrl -Method Post -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
} -Body $completeBody

Write-Host "Attachment created:"
Write-Host ($attachment | ConvertTo-Json)
```

---

## Downloading Private Files

Since objects have `ACL: private`, clients cannot access them directly. Generate presigned GET URLs:

### Backend Endpoint

```typescript
@Get(':attachmentId/download')
@UseGuards(JwtAuthGuard)
async getDownloadUrl(
  @Param('attachmentId') attachmentId: string,
  @Req() req: any,
) {
  const attachment = await this.prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { include: { project: { include: { workspace: { include: { organization: { include: { members: true } } } } } } } } },
  });
  
  if (!attachment) throw new NotFoundException('Attachment not found');
  
  // Verify membership
  const userId = req.user?.id;
  const isMember = attachment.task.project.workspace.organization.members.some(
    (m) => m.userId === userId,
  );
  if (!isMember) throw new ForbiddenException('Not authorized');
  
  // Extract key from URL
  const url = new URL(attachment.url);
  const key = url.pathname.substring(1); // Remove leading '/'
  
  // Generate signed GET URL
  const getCommand = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const downloadUrl = await getSignedUrl(s3, getCommand, { expiresIn: 60 });
  
  return { downloadUrl, expiresIn: 60 };
}
```

### Frontend Usage

```javascript
async function downloadAttachment(attachmentId) {
  const response = await fetch(
    `${apiBase}/attachments/${attachmentId}/download`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const { downloadUrl } = await response.json();
  
  // Open in new tab or trigger download
  window.open(downloadUrl, '_blank');
}
```

---

## Troubleshooting

### Upload URL Expired

**Error:** `AccessDenied` or `Request has expired`

**Solution:**
- Increase `S3_PRESIGN_EXPIRES_SEC` (up to 300)
- Request new presigned URL
- Check client/server clock sync

### CORS Error

**Error:** `Access-Control-Allow-Origin` header missing

**Solution:**
1. Verify CORS configuration on S3 bucket
2. Check origin matches exactly (including protocol)
3. Ensure `AllowedMethods` includes `PUT`
4. Clear browser cache

### Invalid Key Error

**Error:** `Invalid key for this task`

**Solution:**
- Don't modify the `key` returned from presign
- Ensure taskId in complete URL matches presign
- Check key prefix validation logic

### File Not Found After Upload

**Possible Causes:**
1. Upload to S3 failed (check S3 response)
2. Complete endpoint not called
3. Wrong bucket/region
4. S3 object deleted by lifecycle policy

**Debug:**
```bash
# List objects in bucket
aws s3 ls s3://your-bucket-name/attachments/ --recursive

# Check if specific key exists
aws s3 ls s3://your-bucket-name/attachments/workspace/task/file.png
```

### Access Denied Errors

**Solutions:**
1. **IAM permissions:** Verify user has `s3:PutObject` permission
2. **Bucket policy:** Ensure no explicit deny rules
3. **Credentials:** Check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
4. **Region mismatch:** Verify `AWS_REGION` matches bucket region

---

## Cost Optimization

### S3 Storage Classes

```bash
# After 30 days, move to cheaper storage
aws s3api put-bucket-lifecycle-configuration --bucket your-bucket-name --lifecycle-configuration '{
  "Rules": [
    {
      "Id": "Archive old attachments",
      "Status": "Enabled",
      "Prefix": "attachments/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "INTELLIGENT_TIERING"
        }
      ]
    }
  ]
}'
```

### CloudFront CDN (Optional)

For frequently accessed files, add CloudFront distribution:

1. Create CloudFront distribution with S3 origin
2. Configure signed URLs for private content
3. Use CloudFront URL instead of S3 direct URL

---

## Production Checklist

- [ ] S3 bucket created in desired region
- [ ] CORS configured for production domain
- [ ] IAM user created with minimal permissions
- [ ] Access keys added to production `.env`
- [ ] Bucket encryption enabled (AES-256 or KMS)
- [ ] Versioning enabled (optional, for recovery)
- [ ] Lifecycle policies configured (cost optimization)
- [ ] CloudWatch alarms for API errors
- [ ] File size limits enforced (client + server)
- [ ] Content-type validation implemented
- [ ] Presign expiry set to 60-300 seconds
- [ ] Private ACL confirmed on test uploads
- [ ] Download presigned URLs working
- [ ] Tested with large files (up to limit)
- [ ] Tested concurrent uploads
- [ ] Error handling tested (network failures, timeouts)

---

## Summary

✅ **Implemented:**
- Presigned URL generation endpoint
- Direct S3 upload from client
- Completion notification endpoint
- Security validation (membership, key prefix)
- Frontend upload helper
- Environment configuration

✅ **Security:**
- Short-lived URLs (5 minutes)
- Private ACL on objects
- Membership verification
- Key prefix validation
- JWT authentication

✅ **Performance:**
- No server memory usage
- Direct client-to-S3 uploads
- Parallel upload support
- Reduced backend load

**Ready for production!** 🚀
