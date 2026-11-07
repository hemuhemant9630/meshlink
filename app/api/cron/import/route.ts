import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { runImport } from '@/lib/importer.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Daily import of MuleSoft & Salesforce jobs and events (scheduled in vercel.json). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const isVercelCron = (req.headers.get('user-agent') || '').startsWith('vercel-cron');
  if (secret ? auth !== `Bearer ${secret}` : !isVercelCron) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const stats = await runImport((sql: string, params: any[] = []) => query(sql, params), { trigger: 'cron' });
    return NextResponse.json({ ok: true, stats });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
