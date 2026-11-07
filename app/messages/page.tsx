import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { timeAgo } from '@/lib/util';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import { AutoRefresh, ScrollToBottom, SubmitButton } from '@/components/client';
import { sendMessage } from '@/app/actions';

export default async function Messages({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser();
  const withId = parseInt((await searchParams).with) || 0;
  const other = withId && withId !== me.id ? await one<any>('SELECT id,name,headline,city FROM users WHERE id=$1', [withId]) : null;
  if (other) await query('UPDATE messages SET read_at=now() WHERE sender_id=$1 AND recipient_id=$2 AND read_at IS NULL', [other.id, me.id]);

  const convos = await query<any>(
    `SELECT DISTINCT ON (other_id) other_id, u.name, u.headline, m.content, m.created_at, m.sender_id,
       (SELECT count(*)::int FROM messages x WHERE x.sender_id=other_id AND x.recipient_id=$1 AND x.read_at IS NULL) unread
     FROM (SELECT *, CASE WHEN sender_id=$1 THEN recipient_id ELSE sender_id END other_id FROM messages WHERE sender_id=$1 OR recipient_id=$1) m
     JOIN users u ON u.id=m.other_id
     ORDER BY other_id, m.created_at DESC`, [me.id]);
  convos.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const thread = other ? await query<any>(
    `SELECT id,sender_id,content,created_at FROM messages WHERE (sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1) ORDER BY created_at LIMIT 500`,
    [me.id, other.id]) : [];

  return (
    <main className="page">
      <AutoRefresh ms={4000} />
      <div className="card inbox">
        <div className="inbox-list">
          <div className="card-header"><span className="icon-tile tile-teal" style={{ width: 28, height: 28 }}><Icon name="chat" size={16} /></span><h2>Messaging</h2></div>
          {other && !convos.find((c) => c.other_id === other.id) && (
            <Link href={`/messages?with=${other.id}`} className="active"><Avatar name={other.name} id={other.id} size={40} /><div className="grow"><strong>{other.name}</strong><small>New conversation</small></div></Link>
          )}
          {convos.map((c) => (
            <Link key={c.other_id} href={`/messages?with=${c.other_id}`} className={(other?.id === c.other_id ? 'active ' : '') + (c.unread ? 'unread' : '')}>
              <Avatar name={c.name} id={c.other_id} size={40} />
              <div className="grow">
                <div className="row between"><strong>{c.name}</strong><small style={{ display: 'inline' }}>{timeAgo(c.created_at)}</small></div>
                <small>{c.sender_id === me.id ? 'You: ' : ''}{c.content}</small>
              </div>
              {c.unread ? <span className="tab-badge">{c.unread}</span> : null}
            </Link>
          ))}
          {!convos.length && !other && <div className="empty">No conversations yet. Open someone&apos;s profile and hit Message.</div>}
        </div>
        <div className="thread">
          {other ? (
            <>
              <div className="thread-head">
                <Avatar name={other.name} id={other.id} size={36} />
                <div className="grow"><Link href={`/profile/${other.id}`} className="strong-link">{other.name}</Link><br /><small className="muted">{other.headline}{other.city ? ` · ${other.city}` : ''}</small></div>
              </div>
              <div className="thread-body">
                {thread.length ? thread.map((m) => (
                  <div key={m.id} className={'msg ' + (m.sender_id === me.id ? 'me' : 'them')}>{m.content}<small>{timeAgo(m.created_at)}</small></div>
                )) : <div className="empty">Say hello to {other.name.split(' ')[0]} 👋</div>}
                <ScrollToBottom dep={thread.length} />
              </div>
              <form action={sendMessage} className="thread-form">
                <input type="hidden" name="to" value={other.id} />
                <input name="content" className="input" placeholder="Write a message…" required maxLength={2000} autoComplete="off" autoFocus />
                <SubmitButton pendingText="…"><Icon name="send" size={14} /> Send</SubmitButton>
              </form>
            </>
          ) : <div className="empty" style={{ margin: 'auto' }}>Select a conversation</div>}
        </div>
      </div>
    </main>
  );
}
