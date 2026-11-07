import { cookies } from 'next/headers';

export { CITIES } from './cities.mjs';
export const TOPICS = ['General', 'MuleSoft', 'Salesforce', 'Architecture', 'Careers', 'Certifications'];
export const WORK_MODES = ['Onsite', 'Hybrid', 'Remote'];
export const JOB_TYPES = ['Full-time', 'Contract', 'Part-time', 'Internship'];

export async function getCityFilter(): Promise<string> {
  return (await cookies()).get('ml_city')?.value || '';
}

export function timeAgo(d: string | Date) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24); if (dd < 7) return `${dd}d`;
  const w = Math.floor(dd / 7); if (w < 5) return `${w}w`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDate(d: string | Date) {
  return new Date(d).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  }) + ' IST';
}

export function splitList(s: string): string[] {
  return (s || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20);
}

export function str(fd: FormData, k: string, max = 5000) {
  return String(fd.get(k) ?? '').trim().slice(0, max);
}
