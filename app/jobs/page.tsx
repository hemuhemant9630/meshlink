import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { CITIES, JOB_TYPES, WORK_MODES, getCityFilter, timeAgo } from '@/lib/util';
import Icon from '@/components/Icon';
import { SubmitButton } from '@/components/client';
import { createJob } from '@/app/actions';

const statusBadge = (s: string) => ({ Shortlisted: 'badge-brand', Interviewing: 'badge-warning', Offered: 'badge-success', Rejected: 'badge-error' } as any)[s] || '';

export default async function Jobs({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const city = await getCityFilter();
  const tab = sp.tab === 'mine' ? 'mine' : 'browse';
  const q = (sp.q || '').slice(0, 80);
  const mode = WORK_MODES.includes(sp.mode) ? sp.mode : '';
  const type = JOB_TYPES.includes(sp.type) ? sp.type : '';

  const jobs = tab === 'browse' ? await query<any>(
    `SELECT j.*, (SELECT count(*)::int FROM job_applications a WHERE a.job_id=j.id) applicants,
       (SELECT status FROM job_applications a WHERE a.job_id=j.id AND a.user_id=$1) my_status
     FROM jobs j WHERE j.active
       AND ($2='' OR lower(j.city)=lower($2) OR j.work_mode='Remote')
       AND ($3='' OR j.title ILIKE '%'||$3||'%' OR j.company ILIKE '%'||$3||'%' OR j.description ILIKE '%'||$3||'%'
            OR EXISTS (SELECT 1 FROM unnest(j.skills) s WHERE s ILIKE '%'||$3||'%'))
       AND ($4='' OR j.work_mode=$4) AND ($5='' OR j.job_type=$5)
     ORDER BY j.created_at DESC LIMIT 80`, [me.id, city, q, mode, type]) : [];
  const applied = tab === 'mine' ? await query<any>(
    `SELECT a.status,a.created_at,j.id,j.title,j.company,j.city FROM job_applications a JOIN jobs j ON j.id=a.job_id WHERE a.user_id=$1 ORDER BY a.created_at DESC`, [me.id]) : [];
  const posted = tab === 'mine' ? await query<any>(
    `SELECT j.*, (SELECT count(*)::int FROM job_applications a WHERE a.job_id=j.id) applicants FROM jobs j WHERE j.poster_id=$1 ORDER BY j.created_at DESC`, [me.id]) : [];

  return (
    <main className="page">
      <div className="page-header">
        <span className="icon-tile tile-green"><Icon name="briefcase" /></span>
        <div><div className="eyebrow">Jobs</div><h1>{tab === 'mine' ? 'My jobs & applications' : city ? `Jobs in ${city} + remote` : 'All jobs'}</h1></div>
        <div className="actions"><Link href="/jobs?new=1#new" className="btn btn-brand"><Icon name="plus" size={14} /> Post a job</Link></div>
      </div>
      <div className="layout-2">
        <section className="stack">
          <div className="card">
            <div className="tabs"><Link href="/jobs" className={tab === 'browse' ? 'active' : ''}>Browse</Link><Link href="/jobs?tab=mine" className={tab === 'mine' ? 'active' : ''}>My jobs</Link></div>
            {tab === 'browse' && (
              <form className="filters" action="/jobs">
                <input name="q" defaultValue={q} className="input" placeholder="Title, company, skill…" />
                <select name="mode" defaultValue={mode} className="select"><option value="">Any work mode</option>{WORK_MODES.map((m) => <option key={m}>{m}</option>)}</select>
                <select name="type" defaultValue={type} className="select"><option value="">Any type</option>{JOB_TYPES.map((m) => <option key={m}>{m}</option>)}</select>
                <button className="btn btn-brand">Search</button>
              </form>
            )}
          </div>
          {tab === 'browse' && (jobs.length ? jobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="card card-body row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', color: 'inherit', textDecoration: 'none' }}>
              <span className="icon-tile tile-navy" style={{ fontWeight: 800 }}>{j.company.slice(0, 1).toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="strong-link" style={{ fontSize: '1rem', color: 'var(--brand)' }}>{j.title}</div>
                <div>{j.company}</div>
                <small className="muted">{j.city || '—'} · {j.work_mode} · {j.job_type}{j.experience ? ` · ${j.experience}` : ''}{j.salary ? ` · ${j.salary}` : ''}</small>
                <div style={{ marginTop: 4 }}>{(j.skills || []).slice(0, 5).map((s: string) => <span key={s} className="pill">{s}</span>)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <small className="muted">{timeAgo(j.created_at)}</small><br />
                {j.my_status ? <span className={`badge ${statusBadge(j.my_status)}`}>{j.my_status}</span> : <small className="muted">{j.applicants} applicant{j.applicants === 1 ? '' : 's'}</small>}
              </div>
            </Link>
          )) : <div className="card empty">No jobs match{city ? ` in ${city}` : ''}.</div>)}
          {tab === 'mine' && (
            <>
              <div className="card">
                <div className="card-header"><h2>My applications ({applied.length})</h2></div>
                {applied.length ? <ul className="list">{applied.map((a) => (
                  <li key={a.id}><div className="grow"><Link href={`/jobs/${a.id}`} className="strong-link">{a.title}</Link><small>{a.company} · {a.city} · applied {timeAgo(a.created_at)}</small></div><span className={`badge ${statusBadge(a.status)}`}>{a.status}</span></li>
                ))}</ul> : <div className="empty">You haven&apos;t applied to any jobs yet.</div>}
              </div>
              <div className="card">
                <div className="card-header"><h2>Jobs I posted ({posted.length})</h2></div>
                {posted.length ? <ul className="list">{posted.map((j) => (
                  <li key={j.id}><div className="grow"><Link href={`/jobs/${j.id}`} className="strong-link">{j.title}</Link><small>{j.company} · {j.city} · {j.applicants} applicants</small></div>{j.active ? <span className="badge badge-success">Open</span> : <span className="badge">Closed</span>}</li>
                ))}</ul> : <div className="empty">No jobs posted.</div>}
              </div>
            </>
          )}
        </section>
        <aside id="new">
          <form action={createJob} className="card sticky">
            <div className="card-header"><h2>Post a job</h2></div>
            <div className="card-body stack-sm">
              <div className="field"><label><span className="req">*</span>Job title</label><input name="title" className="input" required maxLength={140} autoFocus={!!sp.new} placeholder="MuleSoft Developer" /></div>
              <div className="field"><label><span className="req">*</span>Company</label><input name="company" className="input" required maxLength={100} defaultValue={me.company} /></div>
              <div className="field"><label>City</label><input name="city" className="input" list="jcities" defaultValue={city || me.city} /><datalist id="jcities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist></div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <div className="field" style={{ flex: 1 }}><label>Work mode</label><select name="work_mode" className="select" style={{ width: '100%' }}>{WORK_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
                <div className="field" style={{ flex: 1 }}><label>Type</label><select name="job_type" className="select" style={{ width: '100%' }}>{JOB_TYPES.map((m) => <option key={m}>{m}</option>)}</select></div>
              </div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <div className="field" style={{ flex: 1 }}><label>Experience</label><input name="experience" className="input" placeholder="3–6 years" /></div>
                <div className="field" style={{ flex: 1 }}><label>Salary</label><input name="salary" className="input" placeholder="₹18–28 LPA" /></div>
              </div>
              <div className="field"><label>Skills (comma-separated)</label><input name="skills" className="input" placeholder="MuleSoft, DataWeave, MUnit" /></div>
              <div className="field"><label>Description</label><textarea name="description" className="input" rows={4} maxLength={5000} /></div>
              <SubmitButton pendingText="Posting…">Post job</SubmitButton>
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
}
