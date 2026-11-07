import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { CITIES, TOPICS, getCityFilter } from '@/lib/util';
import Icon from '@/components/Icon';
import { SubmitButton } from '@/components/client';
import { createGroup, joinGroup } from '@/app/actions';

export default async function Groups({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const city = await getCityFilter();
  const mine = sp.tab === 'mine';
  const q = (sp.q || '').slice(0, 80);
  const groups = await query<any>(
    `SELECT g.*, (SELECT count(*)::int FROM group_members m WHERE m.group_id=g.id) members,
       EXISTS(SELECT 1 FROM group_members m WHERE m.group_id=g.id AND m.user_id=$1) joined
     FROM groups g
     WHERE ($2::boolean=false OR EXISTS(SELECT 1 FROM group_members m WHERE m.group_id=g.id AND m.user_id=$1))
       AND ($2::boolean OR $3='' OR lower(g.city)=lower($3) OR g.city='')
       AND ($4='' OR g.name ILIKE '%'||$4||'%' OR g.description ILIKE '%'||$4||'%')
     ORDER BY members DESC, g.created_at DESC`, [me.id, mine, city, q]);
  return (
    <main className="page">
      <div className="page-header">
        <span className="icon-tile tile-purple"><Icon name="group" /></span>
        <div><div className="eyebrow">Groups</div><h1>{mine ? 'My groups' : city ? `Groups in ${city} + global` : 'All groups'}</h1></div>
        <div className="actions"><Link href="/groups?new=1#new" className="btn btn-brand"><Icon name="plus" size={14} /> New group</Link></div>
      </div>
      <div className="layout-2">
        <section className="stack">
          <div className="card">
            <div className="tabs"><Link href="/groups" className={!mine ? 'active' : ''}>Discover</Link><Link href="/groups?tab=mine" className={mine ? 'active' : ''}>My groups</Link></div>
            <form className="filters" action="/groups">{mine && <input type="hidden" name="tab" value="mine" />}
              <input name="q" defaultValue={q} className="input" placeholder="Search groups" /><button className="btn">Search</button></form>
          </div>
          {groups.length ? groups.map((g) => (
            <div key={g.id} className="card card-body row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <span className="icon-tile tile-purple"><Icon name="group" /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/groups/${g.id}`} className="strong-link" style={{ fontSize: '1rem' }}>{g.name}</Link>
                <p className="muted"><small>{g.members} member{g.members === 1 ? '' : 's'} · {g.city || 'Global'} · <span className={`badge topic-${(g.topic || '').toLowerCase()}`}>{g.topic}</span></small></p>
                <p style={{ marginTop: 4 }}>{g.description}</p>
              </div>
              {g.joined ? <Link href={`/groups/${g.id}`} className="btn">Open</Link> : (
                <form action={joinGroup}><input type="hidden" name="group_id" value={g.id} /><input type="hidden" name="redirect" value={`/groups/${g.id}`} /><button className="btn btn-brand">Join</button></form>
              )}
            </div>
          )) : <div className="card empty">No groups found. Start one!</div>}
        </section>
        <aside id="new">
          <form action={createGroup} className="card sticky">
            <div className="card-header"><h2>Create a group</h2></div>
            <div className="card-body stack-sm">
              <div className="field"><label><span className="req">*</span>Name</label><input name="name" className="input" required maxLength={100} placeholder="e.g. Pune MuleSoft Meetup" autoFocus={!!sp.new} /></div>
              <div className="field"><label>Description</label><textarea name="description" className="input" rows={3} maxLength={2000} /></div>
              <div className="field"><label>City (blank = global)</label><input name="city" className="input" list="gcities" defaultValue={city} /><datalist id="gcities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist></div>
              <div className="field"><label>Topic</label><select name="topic" className="select" style={{ width: '100%' }}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></div>
              <SubmitButton pendingText="Creating…">Create group</SubmitButton>
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
}
