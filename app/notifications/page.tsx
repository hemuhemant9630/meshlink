import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { timeAgo } from '@/lib/util';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { markAllRead } from '@/app/actions';

export default async function Notifications() {
  const me = await requireUser();
  const rows = await query<any>(
    `SELECT n.id,n.text,n.link,n.read,n.created_at,u.id uid,u.name FROM notifications n LEFT JOIN users u ON u.id=n.actor_id
     WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 100`, [me.id]);
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <span className="icon-tile tile-red"><Icon name="bell" /></span>
        <div><div className="eyebrow">Notifications</div><h1>What&apos;s new</h1></div>
        <div className="actions">{rows.some((r) => !r.read) && <form action={markAllRead}><button className="btn">Mark all as read</button></form>}</div>
      </div>
      <div className="card">
        {rows.length ? rows.map((n) => (
          <Link key={n.id} href={n.link || '/'} className={'notif' + (n.read ? '' : ' unread')}>
            <Avatar name={n.name || '?'} id={n.uid || 0} size={40} />
            <div style={{ flex: 1 }}><strong>{n.name}</strong> {n.text}<br /><small className="muted">{timeAgo(n.created_at)}</small></div>
          </Link>
        )) : <div className="empty">You&apos;re all caught up.</div>}
      </div>
    </main>
  );
}
