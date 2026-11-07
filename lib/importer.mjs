// Pulls MuleSoft & Salesforce jobs and events from public APIs into MeshLink.
// Used by the daily Vercel cron (/api/cron/import) and by the build step (scripts/migrate.mjs).
// Every source is an official public feed; each listing links back to the original posting.
import { normalizeCity } from './cities.mjs';

export const JOB_MAX_AGE_DAYS = Number(process.env.JOB_MAX_AGE_DAYS || 15);
export const EVENT_WINDOW_DAYS = Number(process.env.EVENT_WINDOW_DAYS || 60);

export const SOURCES = {
  jobicy: { label: 'Jobicy', url: 'https://jobicy.com' },
  himalayas: { label: 'Himalayas', url: 'https://himalayas.app' },
  arbeitnow: { label: 'Arbeitnow', url: 'https://www.arbeitnow.com' },
  adzuna: { label: 'Adzuna', url: 'https://www.adzuna.com' },
  'mulesoft-meetups': { label: 'MuleSoft Meetups', url: 'https://meetups.mulesoft.com' },
  'trailblazer-groups': { label: 'Trailblazer Community Groups', url: 'https://trailblazercommunitygroups.com' },
};

const UA = 'MeshLink/1.0 (community job & event aggregator)';
const RELEVANT = /\b(mule\s?soft|anypoint|dataweave|salesforce|sfdc|apex|lwc|lightning web components?|vlocity|omnistudio|pardot|agentforce|marketing cloud|service cloud|sales cloud|commerce cloud|data cloud|experience cloud|cpq|copado|trailhead)\b/i;
const SKILLS = ['MuleSoft', 'Anypoint', 'DataWeave', 'RAML', 'MUnit', 'Salesforce', 'Apex', 'LWC', 'SOQL', 'Flows', 'CPQ', 'Marketing Cloud',
  'Service Cloud', 'Sales Cloud', 'Data Cloud', 'Experience Cloud', 'Agentforce', 'OmniStudio', 'Copado', 'Integration', 'REST', 'Java'];

export function isRelevantTitle(title) { return RELEVANT.test(String(title || '')); }

export function htmlToText(html, max = 5000) {
  return String(html || '')
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\s*\/(p|div|h[1-6]|ul|ol)\s*>/gi, '\n').replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&rdquo;|&ldquo;/g, '"').replace(/&ndash;|&mdash;/g, '–')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

function skillsFrom(text) {
  const t = String(text || '').toLowerCase();
  return SKILLS.filter((s) => t.includes(s.toLowerCase())).slice(0, 8);
}

function jobType(v) {
  const t = String(Array.isArray(v) ? v.join(' ') : v || '').toLowerCase();
  if (/contract|freelance|temporary/.test(t)) return 'Contract';
  if (/part/.test(t)) return 'Part-time';
  if (/intern/.test(t)) return 'Internship';
  return 'Full-time';
}

function toDate(v) {
  if (v == null || v === '') return null;
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return isNaN(+d) ? null : d;
}

async function getJSON(url, { timeout = 10000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.split('?')[0]}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

/* ------------------------------------------------------------------ Job sources */

export function mapJobicy(j) {
  return {
    source: 'jobicy', external_id: String(j.id), title: j.jobTitle, company: j.companyName || 'Unknown',
    city: 'Remote', location_text: j.jobGeo || 'Anywhere', work_mode: 'Remote', job_type: jobType(j.jobType),
    experience: j.jobLevel && j.jobLevel !== 'Any' ? String(j.jobLevel) : '',
    salary: j.annualSalaryMin ? `${j.salaryCurrency || ''} ${j.annualSalaryMin}${j.annualSalaryMax ? '–' + j.annualSalaryMax : ''}`.trim() : '',
    description: htmlToText(j.jobDescription || j.jobExcerpt), url: j.url, posted_at: toDate(j.pubDate),
  };
}
async function fetchJobicy() {
  const out = [];
  for (const tag of ['salesforce', 'mulesoft']) {
    const d = await getJSON(`https://jobicy.com/api/v2/remote-jobs?count=100&tag=${tag}`);
    out.push(...(d.jobs || []).map(mapJobicy));
  }
  return out;
}

export function mapHimalayas(j) {
  const loc = (j.locationRestrictions || []).join(', ');
  return {
    source: 'himalayas', external_id: String(j.guid || j.applicationLink || j.title + j.companyName), title: j.title,
    company: j.companyName || 'Unknown', city: 'Remote', location_text: loc || 'Anywhere', work_mode: 'Remote',
    job_type: jobType(j.employmentType), experience: (j.seniority || []).join(', '),
    salary: j.minSalary ? `${j.currency || ''} ${j.minSalary}${j.maxSalary ? '–' + j.maxSalary : ''}${j.salaryPeriod ? ' / ' + j.salaryPeriod : ''}`.trim() : '',
    description: htmlToText(j.description || j.excerpt), url: (String(j.guid || '').startsWith('http') ? j.guid : j.applicationLink),
    posted_at: toDate(j.pubDate),
  };
}
async function fetchHimalayas() {
  const out = [];
  for (const [q, pages] of [['salesforce', 3], ['mulesoft', 2]]) {
    for (let p = 1; p <= pages; p++) {
      const d = await getJSON(`https://himalayas.app/jobs/api/search?q=${q}&sort=recent&page=${p}`);
      out.push(...(d.jobs || []).map(mapHimalayas));
      if (!d.jobs?.length) break;
    }
  }
  return out;
}

export function mapArbeitnow(j) {
  const city = j.remote ? 'Remote' : normalizeCity(j.location);
  return {
    source: 'arbeitnow', external_id: String(j.slug), title: j.title, company: j.company_name || 'Unknown',
    city, location_text: j.location || '', work_mode: j.remote ? 'Remote' : 'Onsite', job_type: jobType(j.job_types),
    experience: '', salary: '', description: htmlToText(j.description), url: j.url, posted_at: toDate(j.created_at),
  };
}
async function fetchArbeitnow() {
  const out = [];
  let url = 'https://www.arbeitnow.com/api/job-board-api';
  for (let i = 0; i < 4 && url; i++) {
    const d = await getJSON(url);
    out.push(...(d.data || []).map(mapArbeitnow));
    url = d.links?.next;
  }
  return out;
}

export function mapAdzuna(j, country) {
  const area = j.location?.area || [];
  const loc = j.location?.display_name || area.join(', ');
  const remote = /\bremote\b/i.test(`${j.title} ${loc}`);
  return {
    source: 'adzuna', external_id: `${country}-${j.id}`, title: htmlToText(j.title, 200), company: j.company?.display_name || 'Unknown',
    city: remote ? 'Remote' : normalizeCity(area.length > 1 ? area.slice(1).reverse().join(', ') : loc), location_text: loc,
    work_mode: remote ? 'Remote' : 'Onsite', job_type: jobType(`${j.contract_time || ''} ${j.contract_type || ''}`), experience: '',
    salary: j.salary_min && String(j.salary_is_predicted) !== '1' ? `${Math.round(j.salary_min)}${j.salary_max ? '–' + Math.round(j.salary_max) : ''}` : '',
    description: htmlToText(j.description), url: j.redirect_url, posted_at: toDate(j.created),
  };
}
async function fetchAdzuna() {
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return { skipped: 'set ADZUNA_APP_ID and ADZUNA_APP_KEY to enable' };
  const countries = (process.env.ADZUNA_COUNTRIES || 'in,us,gb,au,sg,ca,de,nl').split(',').map((c) => c.trim()).filter(Boolean);
  const out = [];
  for (const cc of countries) {
    for (let page = 1; page <= 2; page++) {
      const d = await getJSON(`https://api.adzuna.com/v1/api/jobs/${cc}/search/${page}?app_id=${encodeURIComponent(id)}&app_key=${encodeURIComponent(key)}` +
        `&results_per_page=50&what_or=salesforce%20mulesoft&max_days_old=${JOB_MAX_AGE_DAYS}&sort_by=date&content-type=application/json`);
      out.push(...(d.results || []).map((j) => mapAdzuna(j, cc)));
      if ((d.results || []).length < 50) break;
    }
  }
  return out;
}

export const JOB_SOURCES = { jobicy: fetchJobicy, himalayas: fetchHimalayas, arbeitnow: fetchArbeitnow, adzuna: fetchAdzuna };

/* ------------------------------------------------------------------ Event sources (Bevy community platforms) */

export function mapBevyEvent(e, source) {
  const ch = e.chapter || {};
  const chapterText = `${ch.title || ''} ${ch.chapter_location || ''}`;
  const online = /online|virtual/i.test(chapterText) || !ch.city;
  return {
    source, external_id: String(e.id), title: htmlToText(e.title, 200),
    description: `${ch.title ? ch.title + ' chapter' : 'Community event'}${ch.chapter_location ? ' · ' + ch.chapter_location : ''}. Hosted on ${SOURCES[source].label}.`,
    city: online ? '' : normalizeCity(ch.city), venue: ch.chapter_location || (online ? 'Online' : ''),
    is_online: online, starts_at: toDate(e.start_date), url: e.url,
  };
}
async function fetchBevy(source) {
  const base = SOURCES[source].url;
  const today = new Date().toISOString().slice(0, 10);
  const until = Date.now() + EVENT_WINDOW_DAYS * 864e5;
  const out = [];
  let url = `${base}/api/event/?status=Live&start_date__gte=${today}&order_by=start_date&page_size=100`;
  for (let i = 0; i < 6 && url; i++) {
    const d = await getJSON(url);
    const rows = (d.results || []).filter((e) => !e.is_hidden && !e.is_test && !e.chapter?.is_private);
    out.push(...rows.map((e) => mapBevyEvent(e, source)));
    const last = rows[rows.length - 1];
    if (last && +new Date(last.start_date) > until) break;
    url = d.next;
  }
  return out.filter((e) => e.starts_at && +e.starts_at <= until && +e.starts_at >= Date.now() - 864e5);
}

export const EVENT_SOURCES = { 'mulesoft-meetups': () => fetchBevy('mulesoft-meetups'), 'trailblazer-groups': () => fetchBevy('trailblazer-groups') };

/* ------------------------------------------------------------------ Runner */

/** Keep only fresh, relevant, de-duplicated jobs. */
export function filterJobs(jobs, now = Date.now()) {
  const cutoff = now - JOB_MAX_AGE_DAYS * 864e5;
  const seen = new Set();
  return jobs.filter((j) => {
    if (!j.title || !j.url || !j.posted_at || +j.posted_at < cutoff || +j.posted_at > now + 864e5) return false;
    if (!isRelevantTitle(j.title)) return false;
    const key = `${j.source}:${j.external_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Run all importers. `run(sql, params)` executes a query and returns rows.
 * Returns per-source stats; a failing source never stops the others.
 */
export async function runImport(run, { trigger = 'cron', log = console.log } = {}) {
  const stats = { jobs: {}, events: {}, removed: {} };
  const jobResults = await Promise.allSettled(Object.entries(JOB_SOURCES).map(async ([name, fn]) => [name, await fn()]));
  for (const r of jobResults) {
    if (r.status === 'rejected') { stats.jobs.error = (stats.jobs.error || []).concat(String(r.reason?.message || r.reason)); continue; }
    const [name, res] = r.value;
    if (!Array.isArray(res)) { stats.jobs[name] = res; continue; }
    const fresh = filterJobs(res);
    let upserted = 0;
    for (const j of fresh) {
      await run(
        `INSERT INTO jobs (title,company,city,work_mode,job_type,experience,salary,skills,description,poster_id,active,source,external_id,external_url,posted_at,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,TRUE,$10,$11,$12,$13,$13)
         ON CONFLICT (source, external_id) DO UPDATE SET title=EXCLUDED.title, company=EXCLUDED.company, city=EXCLUDED.city,
           work_mode=EXCLUDED.work_mode, job_type=EXCLUDED.job_type, salary=EXCLUDED.salary, skills=EXCLUDED.skills,
           description=EXCLUDED.description, external_url=EXCLUDED.external_url, posted_at=EXCLUDED.posted_at, active=TRUE`,
        [j.title.slice(0, 200), j.company.slice(0, 120), j.city, j.work_mode, j.job_type, j.experience.slice(0, 60), j.salary.slice(0, 80),
          skillsFrom(`${j.title} ${j.description}`), `${j.location_text ? 'Location: ' + j.location_text + '\n\n' : ''}${j.description}`,
          j.source, j.external_id, j.url, j.posted_at.toISOString()]
      );
      upserted++;
    }
    stats.jobs[name] = { fetched: res.length, kept: upserted };
  }

  const eventResults = await Promise.allSettled(Object.entries(EVENT_SOURCES).map(async ([name, fn]) => [name, await fn()]));
  for (const r of eventResults) {
    if (r.status === 'rejected') { stats.events.error = (stats.events.error || []).concat(String(r.reason?.message || r.reason)); continue; }
    const [name, rows] = r.value;
    for (const e of rows) {
      await run(
        `INSERT INTO events (title,description,city,venue,is_online,starts_at,capacity,organizer_id,group_id,source,external_id,external_url)
         VALUES ($1,$2,$3,$4,$5,$6,0,NULL,NULL,$7,$8,$9)
         ON CONFLICT (source, external_id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, city=EXCLUDED.city,
           venue=EXCLUDED.venue, is_online=EXCLUDED.is_online, starts_at=EXCLUDED.starts_at, external_url=EXCLUDED.external_url`,
        [e.title, e.description, e.city, e.venue.slice(0, 200), e.is_online, e.starts_at.toISOString(), e.source, e.external_id, e.url]
      );
    }
    stats.events[name] = { kept: rows.length };
  }

  // Expire stale imports: jobs older than the window, events that ended more than a day ago.
  const oldJobs = await run(`DELETE FROM jobs WHERE source<>'meshlink' AND posted_at < now() - ($1 || ' days')::interval RETURNING id`, [String(JOB_MAX_AGE_DAYS)]);
  const oldEvents = await run(`DELETE FROM events WHERE source<>'meshlink' AND starts_at < now() - interval '1 day' RETURNING id`);
  stats.removed = { jobs: oldJobs.length, events: oldEvents.length };
  await run('INSERT INTO import_runs (trigger, stats) VALUES ($1, $2)', [trigger, JSON.stringify(stats)]);
  log(`[import] ${JSON.stringify(stats)}`);
  return stats;
}
