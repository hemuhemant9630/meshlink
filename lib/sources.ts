import { one } from './db';
import { SOURCES } from './importer.mjs';
import { timeAgo } from './util';

export function sourceLabel(s: string) {
  return (SOURCES as Record<string, { label: string; url: string }>)[s]?.label || 'MeshLink';
}

export async function lastSync(): Promise<string> {
  try {
    const r = await one<{ ran_at: string }>('SELECT ran_at FROM import_runs ORDER BY ran_at DESC LIMIT 1');
    return r ? timeAgo(r.ran_at) : '';
  } catch { return ''; }
}

export { SOURCES };
export const JOB_SOURCE_KEYS = ['jobicy', 'himalayas', 'arbeitnow', 'adzuna'];
export const EVENT_SOURCE_KEYS = ['mulesoft-meetups', 'trailblazer-groups'];
