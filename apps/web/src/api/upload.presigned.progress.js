export function uploadFileToS3PresignedWithProgress({ taskId, file, onProgress }) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1) request presigned url
      const filename = encodeURIComponent(file.name);
      const contentType = file.type || 'application/octet-stream';
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
      
      const r1 = await fetch(
        `${apiBase}/tasks/${taskId}/attachments/presign?filename=${filename}&contentType=${encodeURIComponent(contentType)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            Accept: 'application/json',
          },
        },
      );
      if (!r1.ok) {
        const err = await r1.text();
        throw new Error(`Presign request failed: ${err}`);
      }
      const data = await r1.json();
      const { uploadUrl, key } = data;
      if (!uploadUrl) throw new Error('No uploadUrl returned from server');

      // 2) upload to S3 using XMLHttpRequest to track progress
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const percent = Math.round((ev.loaded / ev.total) * 100);
          onProgress && onProgress(percent, ev.loaded, ev.total);
        }
      };
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // 3) notify backend to create DB record
          try {
            const r2 = await fetch(
              `${apiBase}/tasks/${taskId}/attachments/complete`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                  key,
                  filename: file.name,
                  mimeType: file.type,
                  size: file.size,
                }),
              },
            );
            if (!r2.ok) {
              const err = await r2.text();
              reject(new Error('Attachment complete failed: ' + err));
              return;
            }
            const attachment = await r2.json();
            resolve(attachment);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('Upload to S3 failed with status ' + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error('Upload network error'));
      xhr.send(file);
    } catch (err) {
      reject(err);
    }
  });
}
