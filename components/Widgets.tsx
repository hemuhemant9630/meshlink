import Link from 'next/link';
import Avatar from './Avatar';
import Icon from './Icon';
import { query, one } from '@/lib/db';
import type { User } from '@/lib/auth';
import { sendConnection } from '@/app/actions';

export function DateTile({ d }: { d: string }) {
  const dt = new Date(d);
  return (
    <div className="date-tile">
      <div className="m">{dt.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })}</div>
      <div className="d">{dt.toLocaleString('en-IN', { day: 'numeric', timeZone: 'Asia/Kolkata' })}</div>
    </div>
  );
}

export async function ProfileMini({ me }: { me: User }) {
  const s = await one<{ conns: number; groups: number; posts: number }>(
    `SELECT (SELECT count(*)::int FROM connections WHERE status='accepted' AND (requester_id=$1 OR addressee_id=$1)) conns,
            (SELECT count(*)::int FROM group_members WHERE user_id=$1) groups,
            (SELECT count(*)::int FROM posts WHERE author_id=$1) posts`, [me.id]);
  return (
    <div className="card profile-mini">
      <div className="cover" />
      <Avatar name={me.name} id={me.id} size={60} />
      <div className="info">
        <Link href={`/profile/${me.id}`} className="strong-link">{me.name}</Link>
        <small className="muted">{me.headline || me.role || 'Add a headline'}</small>
        {me.city && <small className="muted"><Icon name="pin" size={12} /> {me.city}</small>}
      </div>
      <Link href="/network?tab=connections" className="stat-row"><span>Connections</span><strong>{s!.conns}</strong></Link>
      <Link href="/groups?tab=mine" className="stat-row"><span>Groups</span><strong>{s!.groups}</strong></Link>
      <div className="stat-row"><span>Posts</span><strong>{s!.posts}</strong></div>
    </div>
  );
}

export async function UpcomingMeetups({ city }: { city: string }) {
  const rows = await query<any>(
    `SELECT e.id,e.title,e.starts_at,e.city,e.is_online,(SELECT count(*)::int FROM event_rsvps r WHERE r.event_id=e.id) going
     FROM events e WHERE e.starts_at>now() AND ($1='' OR lower(e.city)=lower($1) OR e.is_online) ORDER BY e.starts_at LIMIT 4`, [city]);
  return (
    <div className="card">
      <div className="card-header"><span className="icon-tile tile-orange" style={{ width: 28, height: 28 }}><Icon name="calendar" size={16} /></span><h2>Upcoming meetups{city ? ` · ${city}` : ''}</h2></div>
      {rows.length ? (
        <ul className="list">{rows.map((e) => (
          <li key={e.id}><DateTile d={e.starts_at} />
            <div className="grow"><Link href={`/meetups/${e.id}`} className="strong-link">{e.title}</Link><small>{e.is_online ? 'Online' : e.city} · {e.going} going</small></div>
          </li>))}
        </ul>
      ) : <div className="empty">No upcoming meetups{city ? ' here' : ''}. <Link href="/meetups?new=1">Host one</Link></div>}
      <div className="card-footer"><Link href="/meetups">View all</Link></div>
    </div>
  );
}

export async function LatestJobs({ city }: { city: string }) {
  const rows = await query<any>(
    `SELECT id,title,company,city,work_mode FROM jobs WHERE active AND ($1='' OR lower(city)=lower($1) OR work_mode='Remote') ORDER BY created_at DESC LIMIT 4`, [city]);
  return (
    <div className="card">
      <div className="card-header"><span className="icon-tile tile-green" style={{ width: 28, height: 28 }}><Icon name="briefcase" size={16} /></span><h2>Jobs{city ? ` · ${city}` : ''}</h2></div>
      {rows.length ? (
        <ul className="list">{rows.map((j) => (
          <li key={j.id}><div className="grow"><Link href={`/jobs/${j.id}`} className="strong-link">{j.title}</Link><small>{j.company} · {j.city || '—'} · {j.work_mode}</small></div></li>))}
        </ul>
      ) : <div className="empty">No open jobs{city ? ' here' : ''} yet.</div>}
      <div className="card-footer"><Link href="/jobs">See all jobs</Link></div>
    </div>
  );
}

export async function PeopleYouMayKnow({ me, city }: { me: User; city: string }) {
  const rows = await query<any>(
    `SELECT u.id,u.name,u.headline,u.city FROM users u WHERE u.id<>$1
       AND NOT EXISTS (SELECT 1 FROM connections c WHERE (c.requester_id=$1 AND c.addressee_id=u.id) OR (c.requester_id=u.id AND c.addressee_id=$1))
       AND ($2='' OR lower(u.city)=lower($2))
     ORDER BY (lower(u.city)=lower($3)) DESC, u.created_at DESC LIMIT 4`, [me.id, city, me.city || '']);
  return (
    <div className="card">
      <div className="card-header"><span className="icon-tile tile-blue" style={{ width: 28, height: 28 }}><Icon name="users" size={16} /></span><h2>People you may know</h2></div>
      {rows.length ? (
        <ul className="list">{rows.map((u) => (
          <li key={u.id}><Avatar name={u.name} id={u.id} size={36} />
            <div className="grow"><Link href={`/profile/${u.id}`} className="strong-link">{u.name}</Link><small>{u.headline}</small></div>
            <form action={sendConnection}><input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="redirect" value="/feed" />
              <button className="btn btn-sm" title="Connect"><Icon name="plus" size={14} /></button></form>
          </li>))}
        </ul>
      ) : <div className="empty">You know everyone{city ? ` in ${city}` : ''}! 🎉</div>}
      <div className="card-footer"><Link href="/network">Find more people</Link></div>
    </div>
  );
}
