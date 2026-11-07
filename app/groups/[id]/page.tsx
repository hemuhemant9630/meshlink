import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { getPosts } from '@/lib/queries';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import Composer from '@/components/Composer';
import PostCard from '@/components/PostCard';
import { DateTile } from '@/components/Widgets';
import { joinGroup, leaveGroup } from '@/app/actions';

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const id = parseInt((await params).id);
  const g = id ? await one<any>('SELECT g.*, u.name owner_name FROM groups g LEFT JOIN users u ON u.id=g.owner_id WHERE g.id=$1', [id]) : null;
  if (!g) notFound();
  const members = await query<any>('SELECT u.id,u.name,u.headline,m.role FROM group_members m JOIN users u ON u.id=m.user_id WHERE m.group_id=$1 ORDER BY (m.role=\'owner\') DESC, m.joined_at', [id]);
  const membership = members.find((m) => m.id === me.id);
  const posts = await getPosts({ viewerId: me.id, groupId: id });
  const events = await query<any>('SELECT id,title,starts_at,city,is_online FROM events WHERE group_id=$1 AND starts_at>now() ORDER BY starts_at LIMIT 5', [id]);
  const here = `/groups/${id}`;
  return (
    <main className="page">
      <div className="page-header">
        <span className="icon-tile tile-purple"><Icon name="group" /></span>
        <div>
          <div className="eyebrow">Group · {g.city || 'Global'} · {g.topic}</div>
          <h1>{g.name}</h1>
          <small className="muted">{members.length} members · created by {g.owner_name || 'a member'}</small>
        </div>
        <div className="actions">
          {membership ? (
            <>
              <Link href={`/meetups?new=1&group=${id}#new`} className="btn"><Icon name="calendar" size={14} /> Host meetup</Link>
              {membership.role !== 'owner' && <form action={leaveGroup}><input type="hidden" name="group_id" value={id} /><input type="hidden" name="redirect" value={here} /><button className="btn">Leave group</button></form>}
            </>
          ) : (
            <form action={joinGroup}><input type="hidden" name="group_id" value={id} /><input type="hidden" name="redirect" value={here} /><button className="btn btn-brand">Join group</button></form>
          )}
        </div>
      </div>
      <div className="layout-2">
        <section className="stack">
          {g.description && <div className="card card-body"><p style={{ whiteSpace: 'pre-wrap' }}>{g.description}</p></div>}
          {membership ? <Composer me={me} redirect={here} groupId={id} placeholder={`Post to ${g.name}…`} /> : <div className="alert alert-info">Join this group to post and take part in discussions.</div>}
          {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} meId={me.id} redirect={here} />) : <div className="card empty">No discussions yet.</div>}
        </section>
        <aside className="stack">
          <div className="card">
            <div className="card-header"><h2>Upcoming group meetups</h2></div>
            {events.length ? <ul className="list">{events.map((e) => <li key={e.id}><DateTile d={e.starts_at} /><div className="grow"><Link href={`/meetups/${e.id}`} className="strong-link">{e.title}</Link><small>{e.is_online ? 'Online' : e.city}</small></div></li>)}</ul> : <div className="empty">None scheduled.</div>}
          </div>
          <div className="card">
            <div className="card-header"><h2>Members ({members.length})</h2></div>
            <ul className="list">{members.slice(0, 30).map((m) => (
              <li key={m.id}><Avatar name={m.name} id={m.id} size={32} /><div className="grow"><Link href={`/profile/${m.id}`} className="strong-link">{m.name}</Link><small>{m.headline}</small></div>{m.role === 'owner' && <span className="badge badge-brand">Owner</span>}</li>
            ))}</ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
