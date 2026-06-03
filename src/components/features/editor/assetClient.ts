// Best-effort client helper: ask the server to remove an uploaded asset from
// Cloudinary + the usage ledger when its block is deleted. Fire-and-forget —
// never blocks the editor UI.
export function deleteUploadedAsset(url: string | null | undefined): void {
  if (!url || !/^https?:\/\//.test(url)) return;
  fetch('/api/upload/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  }).catch(() => {});
}
