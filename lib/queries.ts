import { query } from './db';

export type Post = {
  id: number; content: string; topic: string; created_at: string; author_id: number; name: string; headline: string;
  author_city: string; group_id: number | null; group_name: string | null; likes: number; liked: boolean; comment_count: number;
  comments: { id: number; content: string; created_at: string; author_id: number; name: string }[];
};

export async function getPosts(opts: { viewerId: number; city?: string; topic?: string; groupId?: number; authorId?: number; network?: boolean; q?: string; limit?: number }) {
  const params: any[] = [opts.viewerId];
  const where: string[] = [];
  const add = (v: any) => { params.push(v); return `$${params.length}`; };
  if (opts.city) where.push(`lower(u.city)=lower(${add(opts.city)})`);
  if (opts.topic) where.push(`p.topic=${add(opts.topic)}`);
  if (opts.groupId) where.push(`p.group_id=${add(opts.groupId)}`);
  if (opts.authorId) where.push(`p.author_id=${add(opts.authorId)}`);
  if (opts.q) where.push(`p.content ILIKE ${add('%' + opts.q + '%')}`);
  if (opts.network) where.push(`(p.author_id=$1 OR p.author_id IN (
      SELECT CASE WHEN requester_id=$1 THEN addressee_id ELSE requester_id END FROM connections
      WHERE status='accepted' AND (requester_id=$1 OR addressee_id=$1)))`);
  const posts = await query<Post>(
    `SELECT p.id,p.content,p.topic,p.created_at,p.author_id,p.group_id,u.name,u.headline,u.city AS author_city,g.name AS group_name,
       (SELECT count(*)::int FROM post_likes l WHERE l.post_id=p.id) likes,
       EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=$1) liked,
       (SELECT count(*)::int FROM comments c WHERE c.post_id=p.id) comment_count
     FROM posts p JOIN users u ON u.id=p.author_id LEFT JOIN groups g ON g.id=p.group_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY p.created_at DESC LIMIT ${opts.limit || 50}`, params);
  if (posts.length) {
    const cs = await query<any>(
      `SELECT c.id,c.post_id,c.content,c.created_at,c.author_id,u.name FROM comments c JOIN users u ON u.id=c.author_id
       WHERE c.post_id = ANY($1::int[]) ORDER BY c.created_at`, [posts.map((p) => p.id)]);
    for (const p of posts) p.comments = cs.filter((c) => c.post_id === p.id);
  }
  return posts;
}

/** relationship between viewer and another user */
export async function relation(me: number, other: number) {
  const rows = await query<{ id: number; requester_id: number; status: string }>(
    'SELECT id,requester_id,status FROM connections WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)', [me, other]);
  const c = rows[0];
  if (!c) return { state: 'none' as const };
  if (c.status === 'accepted') return { state: 'connected' as const, id: c.id };
  return c.requester_id === me ? { state: 'sent' as const, id: c.id } : { state: 'received' as const, id: c.id };
}
