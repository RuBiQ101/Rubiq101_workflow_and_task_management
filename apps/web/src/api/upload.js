import apiClient from './apiClient';

/**
 * Upload file directly through server (not recommended for large files)
 * @param {string} taskId - Task ID
 * @param {File} file - File object
 * @returns {Promise<Object>} Attachment object
 */
export async function uploadDirect(taskId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(
    `/tasks/${taskId}/attachments`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload progress: ${percentCompleted}%`);
      },
    }
  );

  return response.data;
}

/**
 * Upload file using presigned URL (recommended for large files)
 * @param {string} taskId - Task ID
 * @param {File} file - File object
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Attachment object
 */
export async function uploadWithPresigned(taskId, file, onProgress) {
  try {
    // Step 1: Get presigned URL from server
    const presignResponse = await apiClient.get(
      `/tasks/${taskId}/attachments/presign`,
      {
        params: {
          filename: file.name,
          contentType: file.type,
        },
      }
    );

    const { presignedUrl, url, key } = presignResponse.data;

    // Step 2: Upload directly to S3 using presigned URL
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
    }

    // Track progress if callback provided
    if (onProgress) {
      onProgress(100);
    }

    // Step 3: Confirm upload with server to create attachment record
    const confirmResponse = await apiClient.post(
      `/tasks/${taskId}/attachments/confirm`,
      null,
      {
        params: {
          url,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
        },
      }
    );

    return confirmResponse.data;
  } catch (error) {
    console.error('Presigned upload error:', error);
    throw error;
  }
}

/**
 * Upload file with automatic method selection
 * Uses presigned URL if file > 5MB, otherwise direct upload
 * @param {string} taskId - Task ID
 * @param {File} file - File object
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Attachment object
 */
export async function uploadFile(taskId, file, onProgress) {
  const FIVE_MB = 5 * 1024 * 1024;

  if (file.size > FIVE_MB) {
    console.log('Using presigned URL upload for large file');
    return uploadWithPresigned(taskId, file, onProgress);
  } else {
    console.log('Using direct upload for small file');
    return uploadDirect(taskId, file);
  }
}

/**
 * React hook example usage:
 * 
 * ```javascript
 * import { uploadFile } from '../api/upload';
 * 
 * function TaskAttachments({ taskId }) {
 *   const [uploading, setUploading] = useState(false);
 *   const [progress, setProgress] = useState(0);
 *   
 *   const handleFileSelect = async (e) => {
 *     const file = e.target.files[0];
 *     if (!file) return;
 *     
 *     setUploading(true);
 *     try {
 *       const attachment = await uploadFile(taskId, file, setProgress);
 *       console.log('Upload complete:', attachment);
 *       // Update your state with the new attachment
 *     } catch (error) {
 *       alert('Upload failed: ' + error.message);
 *     } finally {
 *       setUploading(false);
 *       setProgress(0);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <input 
 *         type="file" 
 *         onChange={handleFileSelect} 
 *         disabled={uploading}
 *       />
 *       {uploading && <div>Uploading: {progress}%</div>}
 *     </div>
 *   );
 * }
 * ```
 */
