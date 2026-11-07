import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { getPosts, relation } from '@/lib/queries';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import PostCard from '@/components/PostCard';
import ConnectButton from '@/components/ConnectButton';
import { removeConnection } from '@/app/actions';

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const id = parseInt((await params).id);
  if (!id) notFound();
  const u = await one<any>('SELECT id,name,headline,city,company,role,skills,certifications,bio,years_exp,open_to_work,hiring,created_at FROM users WHERE id=$1', [id]);
  if (!u) notFound();
  const isMe = u.id === me.id;
  const rel = isMe ? { state: 'self' } : await relation(me.id, u.id);
  const stats = await one<any>(`SELECT (SELECT count(*)::int FROM connections WHERE status='accepted' AND (requester_id=$1 OR addressee_id=$1)) conns`, [u.id]);
  const groups = await query<any>('SELECT g.id,g.name FROM group_members m JOIN groups g ON g.id=m.group_id WHERE m.user_id=$1 ORDER BY g.name', [u.id]);
  const jobs = await query<any>('SELECT id,title,company,city FROM jobs WHERE poster_id=$1 AND active ORDER BY created_at DESC LIMIT 5', [u.id]);
  const posts = await getPosts({ viewerId: me.id, authorId: u.id, limit: 20 });
  const here = `/profile/${u.id}`;
  return (
    <main className="page layout-2">
      <section className="stack">
        <div className="card profile-hero">
          <div className="cover" />
          <div className="body">
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <Avatar name={u.name} id={u.id} size={110} />
              <div className="row">
                {isMe ? <Link href="/profile/edit" className="btn btn-brand"><Icon name="edit" size={14} /> Edit profile</Link> : (
                  <>
                    <ConnectButton userId={u.id} state={rel.state} connId={(rel as any).id} redirect={here} />
                    {rel.state !== 'connected' && <Link href={`/messages?with=${u.id}`} className="btn">Message</Link>}
                    {rel.state === 'connected' && (
                      <form action={removeConnection}><input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="redirect" value={here} /><button className="btn btn-destructive">Remove connection</button></form>
                    )}
                  </>
                )}
              </div>
            </div>
            <h1>{u.name}</h1>
            <p style={{ fontSize: '1rem' }}>{u.headline}</p>
            <p className="muted"><Icon name="pin" size={13} /> {u.city || 'Location not set'} · <strong style={{ color: 'var(--brand)' }}>{stats.conns} connections</strong></p>
            <div className="row" style={{ marginTop: '.5rem' }}>
              {u.open_to_work && <span className="otw"><Icon name="check" size={12} /> Open to work</span>}
              {u.hiring && <span className="otw hiring"><Icon name="briefcase" size={12} /> Hiring</span>}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>About</h2></div>
          <div className="card-body stack-sm">
            {u.bio ? <p style={{ whiteSpace: 'pre-wrap' }}>{u.bio}</p> : <p className="muted">No bio yet.</p>}
            <dl className="kv">
              <dt>Role</dt><dd>{u.role || '—'}</dd>
              <dt>Company</dt><dd>{u.company || '—'}</dd>
              <dt>Experience</dt><dd>{u.years_exp ? `${u.years_exp} years` : '—'}</dd>
              <dt>Certifications</dt><dd>{u.certifications || '—'}</dd>
              <dt>Member since</dt><dd>{new Date(u.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</dd>
            </dl>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Skills</h2></div>
          <div className="card-body">{u.skills?.length ? u.skills.map((s: string) => <span key={s} className="pill">{s}</span>) : <span className="muted">No skills listed.</span>}</div>
        </div>
        <h2>Activity</h2>
        {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} meId={me.id} redirect={here} />) : <div className="card empty">No posts yet.</div>}
      </section>
      <aside className="stack">
        <div className="card">
          <div className="card-header"><span className="icon-tile tile-purple" style={{ width: 28, height: 28 }}><Icon name="group" size={16} /></span><h2>Groups</h2></div>
          {groups.length ? <ul className="list">{groups.map((g) => <li key={g.id}><Link href={`/groups/${g.id}`}>{g.name}</Link></li>)}</ul> : <div className="empty">Not in any groups.</div>}
        </div>
        {jobs.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="icon-tile tile-green" style={{ width: 28, height: 28 }}><Icon name="briefcase" size={16} /></span><h2>Open roles posted</h2></div>
            <ul className="list">{jobs.map((j) => <li key={j.id}><div className="grow"><Link href={`/jobs/${j.id}`} className="strong-link">{j.title}</Link><small>{j.company} · {j.city}</small></div></li>)}</ul>
          </div>
        )}
      </aside>
    </main>
  );
}
