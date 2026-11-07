// Creates tables (idempotent) and seeds demo data on an empty database.
// Runs automatically before `next build`, so a Vercel deploy with Neon attached needs no manual steps.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.warn('[migrate] DATABASE_URL not set — skipping migrations. Attach a Neon database and redeploy.');
  process.exit(0);
}

const dir = path.dirname(fileURLToPath(import.meta.url));
let run, close = async () => {};
if (url.includes('neon.tech')) {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  run = (text, params = []) => sql.query(text, params);
} else {
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  run = async (text, params = []) => (await pool.query(text, params)).rows;
  close = () => pool.end();
}

const statements = readFileSync(path.join(dir, 'schema.sql'), 'utf8')
  .split(';').map((s) => s.trim()).filter(Boolean);
for (const s of statements) await run(s);
console.log(`[migrate] schema ready (${statements.length} statements)`);

async function importExternal() {
  if (process.env.IMPORT_ON_BUILD === '0') return;
  try {
    const { runImport } = await import('../lib/importer.mjs');
    await runImport(run, { trigger: 'build' });
  } catch (e) {
    console.warn('[import] skipped:', e.message); // never fail the build because a feed is down
  }
}

const [{ n }] = await run('SELECT count(*)::int AS n FROM users');
if (n > 0 || process.env.SKIP_SEED === '1') {
  console.log('[migrate] users exist — skipping seed');
  await importExternal();
  await close();
  process.exit(0);
}

console.log('[migrate] seeding demo data…');
const hash = await bcrypt.hash('demo1234', 10);
const people = [
  ['demo@meshlink.dev', 'Demo User', 'MuleSoft Developer | API-led connectivity', 'Hyderabad', 'MeshLink', 'MuleSoft Developer', ['MuleSoft', 'DataWeave', 'Anypoint Platform', 'Salesforce'], 'MuleSoft Certified Developer – Level 1', 'Exploring MeshLink. Say hi!', 2, true, false],
  ['ananya@meshlink.dev', 'Ananya Rao', 'MuleSoft Architect | Integration CoE lead', 'Hyderabad', 'Northwind Systems', 'Integration Architect', ['MuleSoft', 'API Design', 'RAML', 'CloudHub 2.0', 'Runtime Fabric'], 'MuleSoft Certified Integration Architect, Platform Architect', 'Designing API-led platforms for retail and manufacturing. Organiser of the Hyderabad Mule meetup.', 9, false, true],
  ['vikram@meshlink.dev', 'Vikram Mehta', 'Salesforce Technical Architect | CTA aspirant', 'Bengaluru', 'Cloudrise', 'Salesforce Architect', ['Apex', 'LWC', 'Sales Cloud', 'Service Cloud', 'Platform Events'], 'Application Architect, System Architect', 'Large-scale Salesforce implementations, data migration and integration patterns.', 11, false, true],
  ['priya@meshlink.dev', 'Priya Nair', 'Salesforce Developer | LWC & Apex', 'Bengaluru', 'BlueOrbit', 'Salesforce Developer', ['Apex', 'LWC', 'SOQL', 'Flows'], 'Platform Developer I & II', 'Love building delightful Lightning experiences.', 4, true, false],
  ['arjun@meshlink.dev', 'Arjun Kulkarni', 'MuleSoft Developer | EDI & B2B', 'Pune', 'Integrix', 'MuleSoft Developer', ['MuleSoft', 'DataWeave', 'EDI', 'X12', 'Partner Manager'], 'MuleSoft Certified Developer – Level 1', 'B2B/EDI flows, X12 850/856/810, and lots of DataWeave.', 3, true, false],
  ['sneha@meshlink.dev', 'Sneha Iyer', 'Salesforce Admin | Flow builder', 'Chennai', 'Kaveri Tech', 'Salesforce Admin', ['Flows', 'Reports', 'Security Model', 'Experience Cloud'], 'Salesforce Administrator, Advanced Administrator', 'Admin who automates everything with Flow.', 5, false, false],
  ['rahul@meshlink.dev', 'Rahul Verma', 'Integration Lead | MuleSoft + Kafka', 'Mumbai', 'FinEdge', 'Integration Lead', ['MuleSoft', 'Kafka', 'API Security', 'OAuth 2.0'], 'MuleSoft Certified Platform Architect', 'Integrations for banking and payments. Security first.', 8, false, true],
  ['meera@meshlink.dev', 'Meera Joshi', 'MuleSoft Consultant | Anypoint MQ, RTF', 'Pune', 'Integrix', 'MuleSoft Consultant', ['MuleSoft', 'Anypoint MQ', 'Runtime Fabric', 'Munit'], 'MuleSoft Certified Developer – Level 2', 'Testing nerd. MUnit coverage or it did not happen.', 6, false, false],
  ['karan@meshlink.dev', 'Karan Singh', 'Salesforce Consultant | CPQ & Revenue Cloud', 'Delhi NCR', 'Apex Partners', 'Salesforce Consultant', ['CPQ', 'Revenue Cloud', 'Sales Cloud'], 'CPQ Specialist', 'Quote-to-cash and everything billing.', 7, false, false],
  ['lena@meshlink.dev', 'Lena Fischer', 'Integration Architect | MuleSoft & Salesforce', 'London', 'Thames Digital', 'Integration Architect', ['MuleSoft', 'Salesforce', 'Event-driven architecture'], 'MuleSoft Certified Integration Architect', 'Event-driven integration across EMEA.', 12, false, true],
  ['david@meshlink.dev', 'David Chen', 'Salesforce Developer | Data Cloud', 'San Francisco', 'Golden Gate Apps', 'Salesforce Developer', ['Data Cloud', 'Apex', 'Agentforce'], 'Data Cloud Consultant', 'Building on Data Cloud and Agentforce.', 5, true, false],
  ['fatima@meshlink.dev', 'Fatima Al Zahra', 'MuleSoft Developer | Gulf region', 'Dubai', 'Oasis Integrations', 'MuleSoft Developer', ['MuleSoft', 'DataWeave', 'SAP Connector'], 'MuleSoft Certified Developer – Level 1', 'SAP ↔ Salesforce integrations.', 3, true, false],
];
const ids = {};
for (const p of people) {
  const [row] = await run(
    `INSERT INTO users (email,password_hash,name,headline,city,company,role,skills,certifications,bio,years_exp,open_to_work,hiring)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [p[0], hash, ...p.slice(1)]
  );
  ids[p[0].split('@')[0]] = row.id;
}
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const ahead = (d, hour = 18) => { const t = new Date(Date.now() + d * 864e5); t.setUTCHours(hour - 5, 30, 0, 0); return t.toISOString(); };

const groups = [
  ['Hyderabad MuleSoft Meetup', 'Monthly meetups, code-alongs and certification study circles for MuleSoft folks in Hyderabad.', 'Hyderabad', 'MuleSoft', 'ananya'],
  ['DataWeave Wizards', 'Share tricky transformations, performance tips and reusable modules.', '', 'MuleSoft', 'arjun'],
  ['Bengaluru Salesforce Developers', 'Apex, LWC, and platform talk for Bengaluru devs.', 'Bengaluru', 'Salesforce', 'vikram'],
  ['Integration Architects Circle', 'Patterns, anti-patterns and architecture reviews across MuleSoft and Salesforce.', '', 'Architecture', 'lena'],
  ['Salesforce Admins India', 'Flows, security, release notes — admins helping admins.', '', 'Salesforce', 'sneha'],
];
const gid = {};
for (const g of groups) {
  const [row] = await run('INSERT INTO groups (name,description,city,topic,owner_id) VALUES ($1,$2,$3,$4,$5) RETURNING id', [g[0], g[1], g[2], g[3], ids[g[4]]]);
  gid[g[0]] = row.id;
  await run(`INSERT INTO group_members (group_id,user_id,role) VALUES ($1,$2,'owner')`, [row.id, ids[g[4]]]);
}
const memberships = [
  ['Hyderabad MuleSoft Meetup', ['demo', 'arjun', 'meera', 'rahul']],
  ['DataWeave Wizards', ['demo', 'ananya', 'meera', 'fatima', 'lena']],
  ['Bengaluru Salesforce Developers', ['priya', 'david', 'karan']],
  ['Integration Architects Circle', ['ananya', 'vikram', 'rahul']],
  ['Salesforce Admins India', ['priya', 'karan', 'vikram']],
];
for (const [g, us] of memberships) for (const u of us) await run('INSERT INTO group_members (group_id,user_id) VALUES ($1,$2)', [gid[g], ids[u]]);

const posts = [
  ['ananya', null, 'MuleSoft', 'Reminder: always externalise your property files per environment and keep secure properties encrypted. Your future self (and your ops team) will thank you. 🔐', 2],
  ['vikram', null, 'Salesforce', 'Platform Events vs Change Data Capture for outbound integrations — my rule of thumb: CDC when you want record-level change streams, Platform Events when you own the contract. What do you use?', 5],
  ['arjun', 'DataWeave Wizards', 'MuleSoft', 'Tip: use `groupBy` + `pluck` to turn a flat EDI 856 line list into nested shipment → order → item structures in a single DataWeave expression. Happy to share a sample.', 8],
  ['priya', null, 'Salesforce', 'Just passed Platform Developer II! 🎉 The superbadges were the toughest but most rewarding part. Happy to help anyone preparing.', 12],
  ['rahul', null, 'Careers', 'We are hiring 2 MuleSoft developers (3–6 yrs) in Mumbai, hybrid. Check the Jobs tab or DM me.', 20],
  ['lena', 'Integration Architects Circle', 'Architecture', 'Hot take: a System API that just proxies a single SaaS endpoint 1:1 is still worth it — it gives you a stable contract and one place for retries, throttling and auth.', 26],
  ['meera', null, 'MuleSoft', 'MUnit tip: mock the HTTP Request by `config-ref` + `path` attributes instead of doc:name — doc:names change, configs rarely do.', 30],
  ['sneha', null, 'Salesforce', 'Winter release reminder: review your Flow trigger order settings before the sandbox preview. Saved us a weekend last cycle.', 40],
  ['david', null, 'Salesforce', 'Experimenting with Agentforce actions that call a MuleSoft Experience API. The API-led layer makes the agent actions so much cleaner.', 50],
  ['fatima', null, 'MuleSoft', 'SAP IDoc → Salesforce Order sync now live in production. Batch job + object store watermark worked beautifully.', 60],
];
const pid = [];
for (const [u, g, topic, content, h] of posts) {
  const [row] = await run('INSERT INTO posts (author_id,group_id,topic,content,created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id', [ids[u], g ? gid[g] : null, topic, content, ago(h)]);
  pid.push(row.id);
}
const likes = [[0, ['demo', 'arjun', 'rahul', 'meera']], [1, ['ananya', 'lena', 'priya']], [2, ['demo', 'meera', 'fatima']], [3, ['vikram', 'sneha', 'david', 'karan', 'demo']], [5, ['ananya', 'rahul']]];
for (const [i, us] of likes) for (const u of us) await run('INSERT INTO post_likes (post_id,user_id) VALUES ($1,$2)', [pid[i], ids[u]]);
const comments = [[0, 'arjun', 'Plus one — and use a separate secure-properties key per environment.'], [1, 'lena', 'Same rule here. CDC for sync, events for business moments.'], [3, 'vikram', 'Congrats Priya! Well deserved.'], [2, 'demo', 'Would love that sample!']];
for (const [i, u, c] of comments) await run('INSERT INTO comments (post_id,author_id,content) VALUES ($1,$2,$3)', [pid[i], ids[u], c]);

const conns = [['demo', 'ananya', 'accepted'], ['demo', 'arjun', 'accepted'], ['priya', 'demo', 'pending'], ['meera', 'demo', 'pending'], ['vikram', 'priya', 'accepted'], ['ananya', 'lena', 'accepted'], ['rahul', 'ananya', 'accepted']];
for (const [a, b, s] of conns) await run('INSERT INTO connections (requester_id,addressee_id,status) VALUES ($1,$2,$3)', [ids[a], ids[b], s]);

const msgs = [['ananya', 'demo', 'Hey! Welcome to MeshLink. Are you joining the Hyderabad meetup this month?', 3], ['demo', 'ananya', 'Definitely! Looking forward to the RTF session.', 2.5], ['ananya', 'demo', 'Great — RSVP from the Meetups tab so we can plan seating 🙂', 2]];
for (const [a, b, c, h] of msgs) await run('INSERT INTO messages (sender_id,recipient_id,content,created_at) VALUES ($1,$2,$3,$4)', [ids[a], ids[b], c, ago(h)]);

const events = [
  ['Hyderabad MuleSoft Meetup: Runtime Fabric deep dive', 'Hands-on session on deploying to RTF, followed by networking and chai.', 'Hyderabad', 'HITEC City, Hyderabad', false, ahead(9, 18), 80, 'ananya', 'Hyderabad MuleSoft Meetup'],
  ['DataWeave 2.x Live Coding', 'Bring your hardest transformation — we solve them live.', '', 'Online (link shared after RSVP)', true, ahead(4, 19), 300, 'arjun', 'DataWeave Wizards'],
  ['Bengaluru Salesforce Dev Night', 'Lightning talks on LWC, Apex performance and Data Cloud.', 'Bengaluru', 'Koramangala, Bengaluru', false, ahead(15, 18), 120, 'vikram', 'Bengaluru Salesforce Developers'],
  ['Pune Integration Breakfast', 'Informal breakfast for integration engineers in Pune.', 'Pune', 'Baner, Pune', false, ahead(6, 9), 30, 'meera', null],
  ['London Integration Architecture Forum', 'Event-driven architecture panel with practitioners.', 'London', 'Shoreditch, London', false, ahead(20, 23), 150, 'lena', 'Integration Architects Circle'],
];
for (const e of events) {
  const [row] = await run('INSERT INTO events (title,description,city,venue,is_online,starts_at,capacity,organizer_id,group_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id', [e[0], e[1], e[2], e[3], e[4], e[5], e[6], ids[e[7]], e[8] ? gid[e[8]] : null]);
  await run('INSERT INTO event_rsvps (event_id,user_id) VALUES ($1,$2)', [row.id, ids[e[7]]]);
}

const jobs = [
  ['MuleSoft Developer', 'FinEdge', 'Mumbai', 'Hybrid', 'Full-time', '3–6 years', '₹18–28 LPA', ['MuleSoft', 'DataWeave', 'API Security'], 'Build and own payment integrations on Anypoint Platform. Strong DataWeave and MUnit skills required.', 'rahul'],
  ['Senior Integration Engineer (MuleSoft)', 'Northwind Systems', 'Hyderabad', 'Onsite', 'Full-time', '5–8 years', '₹25–35 LPA', ['MuleSoft', 'RAML', 'CloudHub 2.0'], 'Lead delivery of API-led programs for retail clients. Mentoring juniors is part of the role.', 'ananya'],
  ['Salesforce LWC Developer', 'Cloudrise', 'Bengaluru', 'Hybrid', 'Full-time', '2–5 years', '₹14–22 LPA', ['LWC', 'Apex', 'SOQL'], 'Build Lightning experiences for a global service cloud rollout.', 'vikram'],
  ['MuleSoft Contractor (6 months)', 'Thames Digital', 'London', 'Remote', 'Contract', '4+ years', '£450–550/day', ['MuleSoft', 'Event-driven architecture'], 'Six-month contract migrating Mule 3 apps to Mule 4.', 'lena'],
  ['Salesforce Data Cloud Consultant', 'Cloudrise', 'Bengaluru', 'Remote', 'Full-time', '3+ years', '₹20–30 LPA', ['Data Cloud', 'Salesforce'], 'Design Data Cloud models and activations for enterprise customers.', 'vikram'],
];
for (const j of jobs) await run('INSERT INTO jobs (title,company,city,work_mode,job_type,experience,salary,skills,description,poster_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [...j.slice(0, 9), ids[j[9]]]);

await run(`INSERT INTO notifications (user_id,actor_id,text,link) VALUES ($1,$2,'sent you a connection request','/network'),($1,$3,'sent you a connection request','/network'),($1,$4,'liked your comment','/feed')`, [ids.demo, ids.priya, ids.meera, ids.arjun]);
console.log('[migrate] seed complete. Demo login: demo@meshlink.dev / demo1234');
await importExternal();
await close();
