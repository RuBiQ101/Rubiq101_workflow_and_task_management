// helper: request presigned url, upload file, then notify server to create attachment record
export async function uploadFileToS3Presigned({ taskId, file }) {
  // 1) request upload url
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

  // 2) upload to S3 using PUT (must include same Content-Type)
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  
  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`Upload to S3 failed: ${text}`);
  }

  // 3) notify backend to create Attachment record
  const r2 = await fetch(`${apiBase}/tasks/${taskId}/attachments/complete`, {
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
  });
  
  if (!r2.ok) {
    const err = await r2.text();
    throw new Error(`Attachment complete failed: ${err}`);
  }
  
  return r2.json(); // returns attachment record
}
