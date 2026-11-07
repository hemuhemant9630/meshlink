import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { CITIES, fmtDate, getCityFilter } from '@/lib/util';
import Icon from '@/components/Icon';
import { DateTile } from '@/components/Widgets';
import { SubmitButton } from '@/components/client';
import { createEvent, toggleRsvp } from '@/app/actions';
import { EVENT_SOURCE_KEYS, SOURCES, lastSync, sourceLabel } from '@/lib/sources';

export default async function Meetups({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const city = await getCityFilter();
  const tab = ['past', 'going'].includes(sp.tab) ? sp.tab : 'upcoming';
  const events = await query<any>(
    `SELECT e.*, u.name organizer, g.name group_name,
       (SELECT count(*)::int FROM event_rsvps r WHERE r.event_id=e.id) going,
       EXISTS(SELECT 1 FROM event_rsvps r WHERE r.event_id=e.id AND r.user_id=$1) attending
     FROM events e LEFT JOIN users u ON u.id=e.organizer_id LEFT JOIN groups g ON g.id=e.group_id
     WHERE ${tab === 'past' ? 'e.starts_at<=now()' : 'e.starts_at>now()'}
       AND ($2='' OR lower(e.city)=lower($2) OR e.is_online)
       AND ($3::boolean=false OR EXISTS(SELECT 1 FROM event_rsvps r WHERE r.event_id=e.id AND r.user_id=$1))
     ORDER BY e.starts_at ${tab === 'past' ? 'DESC' : 'ASC'} LIMIT 60`, [me.id, tab === 'going' ? '' : city, tab === 'going']);
  const myGroups = await query<any>('SELECT g.id,g.name FROM group_members m JOIN groups g ON g.id=m.group_id WHERE m.user_id=$1 ORDER BY g.name', [me.id]);
  const minDate = new Date().toISOString().slice(0, 10);
  const synced = await lastSync();
  return (
    <main className="page">
      <div className="page-header">
        <span className="icon-tile tile-orange"><Icon name="calendar" /></span>
        <div><div className="eyebrow">Meetups</div><h1>{city ? `Meetups in ${city} + online` : 'All meetups'}</h1></div>
        <div className="actions"><Link href="/meetups?new=1#new" className="btn btn-brand"><Icon name="plus" size={14} /> Host a meetup</Link></div>
      </div>
      <div className="layout-2">
        <section className="stack">
          <div className="card"><div className="tabs">
            <Link href="/meetups" className={tab === 'upcoming' ? 'active' : ''}>Upcoming</Link>
            <Link href="/meetups?tab=going" className={tab === 'going' ? 'active' : ''}>I&apos;m going</Link>
            <Link href="/meetups?tab=past" className={tab === 'past' ? 'active' : ''}>Past</Link>
          </div></div>
          {tab !== 'past' && (
            <p className="muted sync-note">Upcoming MuleSoft &amp; Salesforce community events are pulled in daily from{' '}
              {EVENT_SOURCE_KEYS.map((k, i) => <span key={k}>{i ? ' and ' : ''}<a href={SOURCES[k].url} target="_blank" rel="noopener noreferrer">{SOURCES[k].label}</a></span>)}
              {synced ? <> · last synced {synced} ago</> : null}. RSVP here to tell the community you&apos;re going, then register on the event page.</p>
          )}
          {events.length ? events.map((e) => (
            <div key={e.id} className="card card-body row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <DateTile d={e.starts_at} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/meetups/${e.id}`} className="strong-link" style={{ fontSize: '1rem' }}>{e.title}</Link>
                <p className="muted"><small>{fmtDate(e.starts_at)} · {e.is_online ? <><Icon name="globe" size={12} /> Online</> : <><Icon name="pin" size={12} /> {e.venue || e.city}</>}</small></p>
                <p className="muted"><small>{e.going} going{e.capacity ? ` / ${e.capacity} spots` : ''}{e.source !== 'meshlink' ? <> · <span className="badge badge-source">via {sourceLabel(e.source)}</span></> : <> · by {e.organizer}{e.group_name ? ` · ${e.group_name}` : ''}</>}</small></p>
              </div>
              {tab !== 'past' && (
                <form action={toggleRsvp}><input type="hidden" name="event_id" value={e.id} /><input type="hidden" name="redirect" value={`/meetups${tab === 'going' ? '?tab=going' : ''}`} />
                  {e.attending ? <button className="btn btn-success"><Icon name="check" size={14} /> Going</button>
                    : <button className="btn btn-brand" disabled={e.capacity > 0 && e.going >= e.capacity}>{e.capacity > 0 && e.going >= e.capacity ? 'Full' : 'RSVP'}</button>}
                </form>
              )}
            </div>
          )) : <div className="card empty">No {tab === 'past' ? 'past' : 'upcoming'} meetups{city && tab !== 'going' ? ` in ${city}` : ''}. Why not host one?</div>}
        </section>
        <aside id="new">
          <form action={createEvent} className="card sticky">
            <div className="card-header"><h2>Host a meetup</h2></div>
            <div className="card-body stack-sm">
              <div className="field"><label><span className="req">*</span>Title</label><input name="title" className="input" required maxLength={140} autoFocus={!!sp.new} /></div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <div className="field" style={{ flex: 1 }}><label><span className="req">*</span>Date</label><input name="date" type="date" min={minDate} className="input" required /></div>
                <div className="field" style={{ flex: 1 }}><label>Time (IST)</label><input name="time" type="time" className="input" defaultValue="18:00" /></div>
              </div>
              <div className="field"><label>City</label><input name="city" className="input" list="ecities" defaultValue={city || me.city} /><datalist id="ecities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist></div>
              <div className="field"><label>Venue / link</label><input name="venue" className="input" maxLength={200} placeholder="Address or meeting link" /></div>
              <label className="checkbox"><input type="checkbox" name="is_online" /> Online event</label>
              <div className="field"><label>Capacity (0 = unlimited)</label><input name="capacity" type="number" min={0} className="input" defaultValue={0} /></div>
              <div className="field"><label>Group (optional)</label><select name="group_id" className="select" style={{ width: '100%' }} defaultValue={sp.group || ''}><option value="">— None —</option>{myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
              <div className="field"><label>Description</label><textarea name="description" className="input" rows={3} maxLength={3000} /></div>
              <SubmitButton pendingText="Publishing…">Publish meetup</SubmitButton>
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
}
