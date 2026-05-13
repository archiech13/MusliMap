import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: { bandId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { bandId, action } = body;

  if (!bandId || (action !== 'follow' && action !== 'unfollow')) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'fan') {
    return Response.json({ error: 'Only fan accounts can follow bands' }, { status: 403 });
  }

  if (action === 'follow') {
    const { error } = await supabase
      .from('follows')
      .upsert({ fan_id: user.id, band_id: bandId });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('fan_id', user.id)
      .eq('band_id', bandId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  revalidatePath('/');
  revalidatePath('/dashboard/fan');

  return Response.json({ ok: true });
}
