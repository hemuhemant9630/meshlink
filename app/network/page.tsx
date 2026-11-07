import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getCityFilter } from '@/lib/util';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import ConnectButton from '@/components/ConnectButton';
import { respondConnection, removeConnection } from '@/app/actions';

export default async function Network({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const city = await getCityFilter();
  const tab = ['invitations', 'connections'].includes(sp.tab) ? sp.tab : 'discover';
  const q = (sp.q || '').slice(0, 80);
  const skill = (sp.skill || '').slice(0, 60);
  const flag = sp.flag || '';

  const received = await query<any>(
    `SELECT c.id,u.id uid,u.name,u.headline,u.city,c.created_at FROM connections c JOIN users u ON u.id=c.requester_id
     WHERE c.addressee_id=$1 AND c.status='pending' ORDER BY c.created_at DESC`, [me.id]);

  let people: any[] = [];
  let sent: any[] = [];
  if (tab === 'discover') {
    people = await query<any>(
      `SELECT u.id,u.name,u.headline,u.city,u.company,u.skills,u.open_to_work,u.hiring,
         (SELECT CASE WHEN c.status='accepted' THEN 'connected' WHEN c.requester_id=$1 THEN 'sent' ELSE 'received' END
          FROM connections c WHERE (c.requester_id=$1 AND c.addressee_id=u.id) OR (c.requester_id=u.id AND c.addressee_id=$1) LIMIT 1) state,
         (SELECT c.id FROM connections c WHERE c.requester_id=u.id AND c.addressee_id=$1 LIMIT 1) conn_id
       FROM users u WHERE u.id<>$1
         AND ($2='' OR lower(u.city)=lower($2))
         AND ($3='' OR u.name ILIKE '%'||$3||'%' OR u.headline ILIKE '%'||$3||'%' OR u.company ILIKE '%'||$3||'%' OR u.role ILIKE '%'||$3||'%')
         AND ($4='' OR EXISTS (SELECT 1 FROM unnest(u.skills) s WHERE s ILIKE '%'||$4||'%'))
         AND ($5<>'otw' OR u.open_to_work) AND ($5<>'hiring' OR u.hiring)
       ORDER BY u.created_at DESC LIMIT 60`, [me.id, city, q, skill, flag]);
  } else if (tab === 'connections') {
    people = await query<any>(
      `SELECT u.id,u.name,u.headline,u.city,u.company,u.skills,u.open_to_work,u.hiring,'connected' state FROM connections c
       JOIN users u ON u.id = CASE WHEN c.requester_id=$1 THEN c.addressee_id ELSE c.requester_id END
       WHERE c.status='accepted' AND (c.requester_id=$1 OR c.addressee_id=$1) AND ($2='' OR lower(u.city)=lower($2)) ORDER BY u.name`, [me.id, city]);
  } else {
    sent = await query<any>(
      `SELECT u.id uid,u.name,u.headline,u.city FROM connections c JOIN users u ON u.id=c.addressee_id
       WHERE c.requester_id=$1 AND c.status='pending' ORDER BY c.created_at DESC`, [me.id]);
  }
  const here = `/network?${new URLSearchParams(Object.entries({ tab: tab === 'discover' ? '' : tab, q, skill, flag }).filter(([, v]) => v))}`;

  return (
    <main className="page">
      <div className="page-header">
        <span className="icon-tile tile-blue"><Icon name="users" /></span>
        <div><div className="eyebrow">My Network</div><h1>{city ? `People in ${city}` : 'People everywhere'}</h1></div>
      </div>
      <div className="layout-side">
        <aside className="card sticky">
          <div className="card-header"><h2>Manage</h2></div>
          <ul className="list">
            <li><Link href="/network" className={tab === 'discover' ? 'strong-link' : ''}>Discover people</Link></li>
            <li><Link href="/network?tab=invitations" className={tab === 'invitations' ? 'strong-link' : ''}>Invitations</Link>{received.length ? <span className="tab-badge">{received.length}</span> : null}</li>
            <li><Link href="/network?tab=connections" className={tab === 'connections' ? 'strong-link' : ''}>My connections</Link></li>
          </ul>
        </aside>
        <section className="stack">
          {tab !== 'connections' && received.length > 0 && (
            <div className="card">
              <div className="card-header"><h2>Invitations ({received.length})</h2></div>
              <ul className="list">{received.map((r) => (
                <li key={r.id}>
                  <Avatar name={r.name} id={r.uid} size={44} />
                  <div className="grow"><Link href={`/profile/${r.uid}`} className="strong-link">{r.name}</Link><small>{r.headline}{r.city ? ` · ${r.city}` : ''}</small></div>
                  <form action={respondConnection}><input type="hidden" name="connection_id" value={r.id} /><input type="hidden" name="decision" value="ignore" /><input type="hidden" name="redirect" value={here} /><button className="btn btn-sm">Ignore</button></form>
                  <form action={respondConnection}><input type="hidden" name="connection_id" value={r.id} /><input type="hidden" name="decision" value="accept" /><input type="hidden" name="redirect" value={here} /><button className="btn btn-sm btn-brand">Accept</button></form>
                </li>))}
              </ul>
            </div>
          )}
          {tab === 'invitations' && (
            <div className="card">
              <div className="card-header"><h2>Sent ({sent.length})</h2></div>
              {sent.length ? <ul className="list">{sent.map((r) => (
                <li key={r.uid}><Avatar name={r.name} id={r.uid} size={40} />
                  <div className="grow"><Link href={`/profile/${r.uid}`} className="strong-link">{r.name}</Link><small>{r.headline}</small></div>
                  <form action={removeConnection}><input type="hidden" name="user_id" value={r.uid} /><input type="hidden" name="redirect" value={here} /><button className="btn btn-sm">Withdraw</button></form>
                </li>))}</ul> : <div className="empty">No pending invitations sent.</div>}
              {!received.length && <div className="empty">No invitations received.</div>}
            </div>
          )}
          {tab === 'discover' && (
            <form className="card filters" action="/network">
              <input name="q" defaultValue={q} className="input" placeholder="Name, company, role…" />
              <input name="skill" defaultValue={skill} className="input" placeholder="Skill e.g. DataWeave, LWC" />
              <select name="flag" defaultValue={flag} className="select">
                <option value="">Everyone</option><option value="otw">Open to work</option><option value="hiring">Hiring</option>
              </select>
              <button className="btn btn-brand">Search</button>
              {(q || skill || flag) && <Link href="/network" className="btn">Clear</Link>}
            </form>
          )}
          {tab !== 'invitations' && (people.length ? (
            <div className="grid-cards">{people.map((u) => (
              <div key={u.id} className="card person-card">
                <div className="cover" />
                <Avatar name={u.name} id={u.id} size={64} />
                <div className="info">
                  <Link href={`/profile/${u.id}`} className="strong-link">{u.name}</Link>
                  <small>{u.headline}</small>
                  <small><Icon name="pin" size={12} /> {u.city || '—'}{u.company ? ` · ${u.company}` : ''}</small>
                  <div style={{ marginTop: 4 }}>
                    {u.open_to_work && <span className="otw">Open to work</span>} {u.hiring && <span className="otw hiring">Hiring</span>}
                  </div>
                  <div style={{ marginTop: 4 }}>{(u.skills || []).slice(0, 3).map((s: string) => <span key={s} className="pill">{s}</span>)}</div>
                </div>
                <ConnectButton userId={u.id} state={u.state || 'none'} connId={u.conn_id} redirect={here} block />
              </div>))}
            </div>
          ) : <div className="card empty">No people match{city ? ` in ${city}` : ''}. Try another city from the header filter.</div>)}
        </section>
      </div>
    </main>
  );
}
