export async function getAttachmentPresignedUrl(attachmentId) {
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
  const res = await fetch(`${apiBase}/attachments/${attachmentId}/presign-get`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Failed to get presigned url: ' + t);
  }
  return res.json(); // { url, expiresIn }
}

// open in new tab (recommended)
export async function openAttachmentInNewTab(attachmentId) {
  const { url } = await getAttachmentPresignedUrl(attachmentId);
  window.open(url, '_blank');
}
