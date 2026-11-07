import Link from 'next/link';
import Logo from './Logo';
import Avatar from './Avatar';
import Icon from './Icon';
import { CityFilter, NavTabs } from './client';
import { getCurrentUser } from '@/lib/auth';
import { CITIES, getCityFilter } from '@/lib/util';
import { query, one } from '@/lib/db';
import { logout, setCity } from '@/app/actions';

export default async function Header() {
  const me = await getCurrentUser();
  if (!me) {
    return (
      <header className="global-header">
        <Link href="/" className="brand"><Logo /><span>MeshLink</span></Link>
        <div className="spacer" />
        <Link href="/login" className="btn btn-neutral">Log in</Link>
        <Link href="/signup" className="btn btn-brand">Join now</Link>
      </header>
    );
  }
  const city = await getCityFilter();
  const cityRows = await query<{ city: string }>(`SELECT DISTINCT city FROM users WHERE city<>'' UNION SELECT DISTINCT city FROM events WHERE city<>'' UNION SELECT DISTINCT city FROM jobs WHERE city<>''`);
  const cities = Array.from(new Set([...CITIES, ...cityRows.map((r) => r.city), ...(city ? [city] : [])])).sort();
  const counts = await one<{ msgs: number; reqs: number; notifs: number }>(
    `SELECT (SELECT count(*)::int FROM messages WHERE recipient_id=$1 AND read_at IS NULL) msgs,
            (SELECT count(*)::int FROM connections WHERE addressee_id=$1 AND status='pending') reqs,
            (SELECT count(*)::int FROM notifications WHERE user_id=$1 AND NOT read) notifs`, [me.id]);
  return (
    <>
      <header className="global-header">
        <Link href="/feed" className="brand"><Logo /><span>MeshLink</span></Link>
        <form action="/search" className="global-search">
          <Icon name="search" size={16} />
          <input name="q" placeholder="Search people, posts, groups, jobs…" aria-label="Search" />
        </form>
        <CityFilter city={city} cities={cities} action={setCity} />
        <div className="spacer" />
        <Link href="/messages" className="icon-btn" title="Messages"><Icon name="chat" />{counts!.msgs ? <span className="dot">{counts!.msgs}</span> : null}</Link>
        <Link href="/notifications" className="icon-btn" title="Notifications"><Icon name="bell" />{counts!.notifs ? <span className="dot">{counts!.notifs}</span> : null}</Link>
        <details className="user-menu">
          <summary><Avatar name={me.name} id={me.id} size={32} /></summary>
          <div className="menu">
            <div className="menu-head"><Avatar name={me.name} id={me.id} size={40} /><div><strong>{me.name}</strong><small>{me.headline || me.role}</small></div></div>
            <Link href={`/profile/${me.id}`}>View profile</Link>
            <Link href="/profile/edit">Edit profile</Link>
            <Link href="/jobs?tab=mine">My jobs & applications</Link>
            <form action={logout}><button type="submit">Sign out</button></form>
          </div>
        </details>
      </header>
      <div className="app-bar">
        <div className="app-name"><span className="waffle" aria-hidden>⋮⋮⋮</span>MeshLink</div>
        <NavTabs tabs={[
          { href: '/feed', label: 'Home' },
          { href: '/network', label: 'Network', badge: counts!.reqs },
          { href: '/jobs', label: 'Jobs' },
          { href: '/meetups', label: 'Meetups' },
          { href: '/groups', label: 'Groups' },
          { href: '/messages', label: 'Messages', badge: counts!.msgs },
          { href: '/notifications', label: 'Notifications', badge: counts!.notifs },
        ]} />
        {city ? <span className="city-chip"><Icon name="pin" size={14} /> {city}</span> : null}
      </div>
    </>
  );
}
