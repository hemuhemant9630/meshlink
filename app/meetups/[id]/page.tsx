import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { fmtDate } from '@/lib/util';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { DateTile } from '@/components/Widgets';
import { toggleRsvp } from '@/app/actions';

export default async function MeetupPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const id = parseInt((await params).id);
  const e = id ? await one<any>(
    `SELECT e.*, u.name organizer, u.headline organizer_headline, g.name group_name FROM events e LEFT JOIN users u ON u.id=e.organizer_id
     LEFT JOIN groups g ON g.id=e.group_id WHERE e.id=$1`, [id]) : null;
  if (!e) notFound();
  const attendees = await query<any>('SELECT u.id,u.name,u.headline FROM event_rsvps r JOIN users u ON u.id=r.user_id WHERE r.event_id=$1 ORDER BY r.created_at', [id]);
  const going = attendees.some((a) => a.id === me.id);
  const past = new Date(e.starts_at) <= new Date();
  const full = e.capacity > 0 && attendees.length >= e.capacity;
  return (
    <main className="page">
      <div className="page-header">
        <DateTile d={e.starts_at} />
        <div><div className="eyebrow">Meetup{e.group_name ? ` · ${e.group_name}` : ''}</div><h1>{e.title}</h1></div>
        <div className="actions">
          {!past && (
            <form action={toggleRsvp}><input type="hidden" name="event_id" value={id} /><input type="hidden" name="redirect" value={`/meetups/${id}`} />
              {going ? <button className="btn btn-success"><Icon name="check" size={14} /> Going — cancel RSVP</button> : <button className="btn btn-brand" disabled={full}>{full ? 'Event full' : 'RSVP'}</button>}
            </form>
          )}
        </div>
      </div>
      <div className="layout-2">
        <section className="stack">
          <div className="card card-body stack-sm">
            <dl className="kv">
              <dt>When</dt><dd>{fmtDate(e.starts_at)}{past ? ' (past)' : ''}</dd>
              <dt>Where</dt><dd>{e.is_online ? 'Online' : e.city}{e.venue ? ` — ${e.venue}` : ''}</dd>
              <dt>Attendees</dt><dd>{attendees.length}{e.capacity ? ` / ${e.capacity}` : ''}</dd>
              <dt>Organizer</dt><dd><Link href={`/profile/${e.organizer_id}`}>{e.organizer}</Link></dd>
              {e.group_id && <><dt>Group</dt><dd><Link href={`/groups/${e.group_id}`}>{e.group_name}</Link></dd></>}
            </dl>
            {e.description && <p style={{ whiteSpace: 'pre-wrap', marginTop: '.5rem' }}>{e.description}</p>}
          </div>
        </section>
        <aside className="card">
          <div className="card-header"><h2>Who&apos;s going ({attendees.length})</h2></div>
          {attendees.length ? <ul className="list">{attendees.map((a) => (
            <li key={a.id}><Avatar name={a.name} id={a.id} size={32} /><div className="grow"><Link href={`/profile/${a.id}`} className="strong-link">{a.name}</Link><small>{a.headline}</small></div></li>
          ))}</ul> : <div className="empty">No RSVPs yet.</div>}
        </aside>
      </div>
    </main>
  );
}
