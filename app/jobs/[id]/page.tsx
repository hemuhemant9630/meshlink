import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { timeAgo } from '@/lib/util';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { SubmitButton } from '@/components/client';
import { applyJob, setApplicationStatus, toggleJobActive } from '@/app/actions';

const STATUSES = ['Applied', 'Shortlisted', 'Interviewing', 'Offered', 'Rejected'];

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const id = parseInt((await params).id);
  const j = id ? await one<any>('SELECT j.*, u.name poster_name, u.headline poster_headline FROM jobs j LEFT JOIN users u ON u.id=j.poster_id WHERE j.id=$1', [id]) : null;
  if (!j) notFound();
  const isPoster = j.poster_id === me.id;
  const myApp = await one<any>('SELECT status,created_at FROM job_applications WHERE job_id=$1 AND user_id=$2', [id, me.id]);
  const apps = isPoster ? await query<any>(
    `SELECT a.id,a.note,a.status,a.created_at,u.id uid,u.name,u.headline,u.city FROM job_applications a JOIN users u ON u.id=a.user_id WHERE a.job_id=$1 ORDER BY a.created_at DESC`, [id]) : [];
  return (
    <main className="page">
      <div className="page-header">
        <span className="icon-tile tile-navy" style={{ fontWeight: 800 }}>{j.company.slice(0, 1).toUpperCase()}</span>
        <div><div className="eyebrow">{j.company} · {j.city || '—'} · {j.work_mode}</div><h1>{j.title}</h1></div>
        <div className="actions">
          {!j.active && <span className="badge">Closed</span>}
          {isPoster && <form action={toggleJobActive}><input type="hidden" name="job_id" value={id} /><button className="btn">{j.active ? 'Close job' : 'Reopen job'}</button></form>}
        </div>
      </div>
      <div className="layout-2">
        <section className="stack">
          <div className="card card-body stack-sm">
            <dl className="kv">
              <dt>Company</dt><dd>{j.company}</dd>
              <dt>Location</dt><dd>{j.city || '—'} ({j.work_mode})</dd>
              <dt>Type</dt><dd>{j.job_type}</dd>
              {j.experience && <><dt>Experience</dt><dd>{j.experience}</dd></>}
              {j.salary && <><dt>Compensation</dt><dd>{j.salary}</dd></>}
              <dt>Posted</dt><dd>{timeAgo(j.created_at)} by <Link href={`/profile/${j.poster_id}`}>{j.poster_name}</Link></dd>
            </dl>
            <div>{(j.skills || []).map((s: string) => <span key={s} className="pill">{s}</span>)}</div>
            {j.description && <p style={{ whiteSpace: 'pre-wrap' }}>{j.description}</p>}
          </div>
          {isPoster && (
            <div className="card">
              <div className="card-header"><h2>Applicants ({apps.length})</h2></div>
              {apps.length ? <ul className="list">{apps.map((a) => (
                <li key={a.id} style={{ alignItems: 'flex-start' }}>
                  <Avatar name={a.name} id={a.uid} size={40} />
                  <div className="grow">
                    <Link href={`/profile/${a.uid}`} className="strong-link">{a.name}</Link>
                    <small>{a.headline}{a.city ? ` · ${a.city}` : ''} · {timeAgo(a.created_at)}</small>
                    {a.note && <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.note}</p>}
                  </div>
                  <form action={setApplicationStatus} className="row" style={{ flexWrap: 'nowrap' }}>
                    <input type="hidden" name="application_id" value={a.id} />
                    <select name="status" defaultValue={a.status} className="select">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                    <button className="btn btn-sm">Update</button>
                  </form>
                  <Link href={`/messages?with=${a.uid}`} className="btn btn-sm">Message</Link>
                </li>
              ))}</ul> : <div className="empty">No applicants yet.</div>}
            </div>
          )}
        </section>
        <aside className="stack">
          {!isPoster && (
            <div className="card">
              <div className="card-header"><h2>{myApp ? 'Your application' : 'Apply'}</h2></div>
              <div className="card-body stack-sm">
                {myApp ? (
                  <><p><Icon name="check" size={14} /> Applied {timeAgo(myApp.created_at)}</p><p>Status: <span className="badge badge-brand">{myApp.status}</span></p></>
                ) : j.active ? (
                  <form action={applyJob} className="stack-sm">
                    <input type="hidden" name="job_id" value={id} />
                    <div className="field"><label>Note to the hiring manager</label><textarea name="note" className="input" rows={4} maxLength={2000} placeholder="Why you're a great fit…" /></div>
                    <p className="muted"><small>Your MeshLink profile will be shared with the poster.</small></p>
                    <SubmitButton pendingText="Applying…">Easy apply</SubmitButton>
                  </form>
                ) : <p className="muted">This job is no longer accepting applications.</p>}
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-header"><h2>Posted by</h2></div>
            <ul className="list"><li><Avatar name={j.poster_name || '?'} id={j.poster_id} size={40} /><div className="grow"><Link href={`/profile/${j.poster_id}`} className="strong-link">{j.poster_name}</Link><small>{j.poster_headline}</small></div>
              {!isPoster && <Link href={`/messages?with=${j.poster_id}`} className="btn btn-sm">Message</Link>}</li></ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
