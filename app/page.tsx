import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { one } from '@/lib/db';
import Icon from '@/components/Icon';

export default async function Landing() {
  if (await getCurrentUser()) redirect('/feed');
  let stats = { users: 0, jobs: 0, events: 0, groups: 0 };
  try {
    stats = (await one<any>(`SELECT (SELECT count(*)::int FROM users) users,(SELECT count(*)::int FROM jobs WHERE active) jobs,
      (SELECT count(*)::int FROM events WHERE starts_at>now()) events,(SELECT count(*)::int FROM groups) groups`)) || stats;
  } catch { /* database not configured yet */ }
  const features = [
    ['users', 'tile-blue', 'Grow your network', 'Find MuleSoft developers, Salesforce admins and architects near you and connect.'],
    ['chat', 'tile-teal', 'Message directly', 'Real-time-ish 1:1 conversations with anyone in the community.'],
    ['group', 'tile-purple', 'Join groups', 'City chapters and topic circles — DataWeave, architecture, admins and more.'],
    ['calendar', 'tile-orange', 'Meetups', 'Discover and host in-person and online meetups. RSVP in one click.'],
    ['briefcase', 'tile-green', 'Hire & get hired', 'Post roles, apply with a note, track applicants through a pipeline.'],
    ['pin', 'tile-red', 'City first', 'One city filter applies across feed, people, groups, meetups and jobs.'],
  ];
  return (
    <main>
      <section className="hero">
        <div>
          <h1>The professional home for <b>MuleSoft</b> &amp; <b>Salesforce</b> people.</h1>
          <p className="lead">Share what you build, meet integration folks in your city, and find your next role or your next hire.</p>
          <div className="cta">
            <Link href="/signup" className="btn btn-brand">Join MeshLink — it&apos;s free</Link>
            <Link href="/login" className="btn btn-neutral">Sign in</Link>
          </div>
          <div className="stats-band">
            <div><strong>{stats.users}</strong><span className="muted">members</span></div>
            <div><strong>{stats.jobs}</strong><span className="muted">open jobs</span></div>
            <div><strong>{stats.events}</strong><span className="muted">upcoming meetups</span></div>
            <div><strong>{stats.groups}</strong><span className="muted">groups</span></div>
          </div>
        </div>
        <div className="card hero-card">
          <div className="alert alert-info">Try the demo: <strong>demo@meshlink.dev</strong> / <strong>demo1234</strong></div>
          {features.slice(0, 3).map(([icon, tile, title, text]) => (
            <div key={title} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <span className={`icon-tile ${tile}`}><Icon name={icon} /></span>
              <div><h3>{title}</h3><p className="muted">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
      <section className="feature-grid">
        {features.map(([icon, tile, title, text]) => (
          <div key={title} className="card feature">
            <span className={`icon-tile ${tile}`}><Icon name={icon} /></span>
            <h2>{title}</h2><p className="muted">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
