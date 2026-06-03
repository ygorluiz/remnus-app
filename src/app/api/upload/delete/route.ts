import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteAssetByUrl } from '@/lib/services/assets';

// POST { url } — removes a previously-uploaded asset from Cloudinary and the
// usage ledger. Authorization (uploader or workspace member) is enforced in
// deleteAssetByUrl. Best-effort: a missing/unauthorized asset returns ok:false
// rather than an error so callers (block delete) never block the UI.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let url: string | undefined;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const deleted = await deleteAssetByUrl(url, user.id);
  return NextResponse.json({ ok: deleted });
}
