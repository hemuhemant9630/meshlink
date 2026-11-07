'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { query, one } from '@/lib/db';
import { createSession, destroySession, requireUser } from '@/lib/auth';
import { splitList, str } from '@/lib/util';

type FormState = { error?: string } | undefined;

async function notify(userId: number, actorId: number, text: string, link: string) {
  if (userId === actorId) return;
  await query('INSERT INTO notifications (user_id,actor_id,text,link) VALUES ($1,$2,$3,$4)', [userId, actorId, text, link]);
}

function back(fd: FormData, fallback: string) {
  const r = str(fd, 'redirect', 300);
  return r.startsWith('/') && !r.startsWith('//') ? r : fallback;
}

/* ---------- Auth ---------- */

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, 'name', 80);
  const email = str(fd, 'email', 120).toLowerCase();
  const password = String(fd.get('password') ?? '');
  const city = str(fd, 'city', 60);
  const role = str(fd, 'role', 80);
  if (!name || !email || !password) return { error: 'Name, email and password are required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
  if (await one('SELECT id FROM users WHERE email=$1', [email])) return { error: 'An account with that email already exists.' };
  const hash = await bcrypt.hash(password, 10);
  const u = await one<{ id: number }>(
    'INSERT INTO users (email,password_hash,name,city,role,headline) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [email, hash, name, city, role, role]
  );
  await createSession(u!.id);
  if (city) (await cookies()).set('ml_city', city, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  redirect('/profile/edit?welcome=1');
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email', 120).toLowerCase();
  const password = String(fd.get('password') ?? '');
  const u = await one<{ id: number; password_hash: string }>('SELECT id,password_hash FROM users WHERE email=$1', [email]);
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return { error: 'Incorrect email or password.' };
  await createSession(u.id);
  redirect('/feed');
}

export async function logout() {
  await destroySession();
  redirect('/');
}

/* ---------- Profile & city ---------- */

export async function updateProfile(fd: FormData) {
  const me = await requireUser();
  await query(
    `UPDATE users SET name=$2,headline=$3,city=$4,company=$5,role=$6,skills=$7,certifications=$8,bio=$9,years_exp=$10,open_to_work=$11,hiring=$12 WHERE id=$1`,
    [me.id, str(fd, 'name', 80) || me.name, str(fd, 'headline', 160), str(fd, 'city', 60), str(fd, 'company', 80), str(fd, 'role', 80),
      splitList(str(fd, 'skills', 600)), str(fd, 'certifications', 400), str(fd, 'bio', 2000),
      Math.max(0, Math.min(60, parseInt(str(fd, 'years_exp', 3)) || 0)), fd.get('open_to_work') === 'on', fd.get('hiring') === 'on']
  );
  revalidatePath('/', 'layout');
  redirect(`/profile/${me.id}`);
}

export async function setCity(fd: FormData) {
  const city = str(fd, 'city', 60);
  const jar = await cookies();
  if (city) jar.set('ml_city', city, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  else jar.delete('ml_city');
  revalidatePath('/', 'layout');
  redirect(back(fd, '/feed'));
}

/* ---------- Posts ---------- */

export async function createPost(fd: FormData) {
  const me = await requireUser();
  const content = str(fd, 'content', 3000);
  const groupId = parseInt(str(fd, 'group_id', 10)) || null;
  if (content) {
    if (groupId && !(await one('SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2', [groupId, me.id]))) {
      redirect(`/groups/${groupId}`);
    }
    await query('INSERT INTO posts (author_id,group_id,content,topic) VALUES ($1,$2,$3,$4)', [me.id, groupId, content, str(fd, 'topic', 40) || 'General']);
  }
  revalidatePath('/', 'layout');
  redirect(back(fd, '/feed'));
}

export async function deletePost(fd: FormData) {
  const me = await requireUser();
  await query('DELETE FROM posts WHERE id=$1 AND author_id=$2', [parseInt(str(fd, 'post_id', 10)), me.id]);
  revalidatePath('/', 'layout');
  redirect(back(fd, '/feed'));
}

export async function toggleLike(fd: FormData) {
  const me = await requireUser();
  const postId = parseInt(str(fd, 'post_id', 10));
  const removed = await query('DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2 RETURNING post_id', [postId, me.id]);
  if (!removed.length) {
    await query('INSERT INTO post_likes (post_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, me.id]);
    const p = await one<{ author_id: number }>('SELECT author_id FROM posts WHERE id=$1', [postId]);
    if (p) await notify(p.author_id, me.id, 'liked your post', `/feed#post-${postId}`);
  }
  revalidatePath('/', 'layout');
  redirect(back(fd, '/feed'));
}

export async function addComment(fd: FormData) {
  const me = await requireUser();
  const postId = parseInt(str(fd, 'post_id', 10));
  const content = str(fd, 'content', 1000);
  if (content) {
    await query('INSERT INTO comments (post_id,author_id,content) VALUES ($1,$2,$3)', [postId, me.id, content]);
    const p = await one<{ author_id: number }>('SELECT author_id FROM posts WHERE id=$1', [postId]);
    if (p) await notify(p.author_id, me.id, 'commented on your post', `/feed#post-${postId}`);
  }
  revalidatePath('/', 'layout');
  redirect(back(fd, '/feed'));
}

/* ---------- Connections ---------- */

export async function sendConnection(fd: FormData) {
  const me = await requireUser();
  const other = parseInt(str(fd, 'user_id', 10));
  if (other && other !== me.id) {
    const existing = await one<{ id: number; requester_id: number; status: string }>(
      'SELECT id,requester_id,status FROM connections WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)', [me.id, other]);
    if (!existing) {
      await query('INSERT INTO connections (requester_id,addressee_id) VALUES ($1,$2)', [me.id, other]);
      await notify(other, me.id, 'sent you a connection request', '/network');
    } else if (existing.status === 'pending' && existing.requester_id === other) {
      await query(`UPDATE connections SET status='accepted' WHERE id=$1`, [existing.id]);
      await notify(other, me.id, 'accepted your connection request', `/profile/${me.id}`);
    }
  }
  revalidatePath('/', 'layout');
  redirect(back(fd, '/network'));
}

export async function respondConnection(fd: FormData) {
  const me = await requireUser();
  const id = parseInt(str(fd, 'connection_id', 10));
  const c = await one<{ requester_id: number }>(`SELECT requester_id FROM connections WHERE id=$1 AND addressee_id=$2 AND status='pending'`, [id, me.id]);
  if (c) {
    if (str(fd, 'decision', 10) === 'accept') {
      await query(`UPDATE connections SET status='accepted' WHERE id=$1`, [id]);
      await notify(c.requester_id, me.id, 'accepted your connection request', `/profile/${me.id}`);
    } else {
      await query('DELETE FROM connections WHERE id=$1', [id]);
    }
  }
  revalidatePath('/', 'layout');
  redirect(back(fd, '/network'));
}

export async function removeConnection(fd: FormData) {
  const me = await requireUser();
  const other = parseInt(str(fd, 'user_id', 10));
  await query('DELETE FROM connections WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)', [me.id, other]);
  revalidatePath('/', 'layout');
  redirect(back(fd, '/network'));
}

/* ---------- Messages ---------- */

export async function sendMessage(fd: FormData) {
  const me = await requireUser();
  const to = parseInt(str(fd, 'to', 10));
  const content = str(fd, 'content', 2000);
  if (to && to !== me.id && content && (await one('SELECT 1 FROM users WHERE id=$1', [to]))) {
    await query('INSERT INTO messages (sender_id,recipient_id,content) VALUES ($1,$2,$3)', [me.id, to, content]);
  }
  revalidatePath('/messages');
  redirect(`/messages?with=${to}`);
}

/* ---------- Groups ---------- */

export async function createGroup(fd: FormData) {
  const me = await requireUser();
  const name = str(fd, 'name', 100);
  if (!name) redirect('/groups?new=1');
  const g = await one<{ id: number }>('INSERT INTO groups (name,description,city,topic,owner_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [name, str(fd, 'description', 2000), str(fd, 'city', 60), str(fd, 'topic', 40) || 'General', me.id]);
  await query(`INSERT INTO group_members (group_id,user_id,role) VALUES ($1,$2,'owner')`, [g!.id, me.id]);
  revalidatePath('/groups');
  redirect(`/groups/${g!.id}`);
}

export async function joinGroup(fd: FormData) {
  const me = await requireUser();
  const gid = parseInt(str(fd, 'group_id', 10));
  await query('INSERT INTO group_members (group_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [gid, me.id]);
  const g = await one<{ owner_id: number; name: string }>('SELECT owner_id,name FROM groups WHERE id=$1', [gid]);
  if (g?.owner_id) await notify(g.owner_id, me.id, `joined your group ${g.name}`, `/groups/${gid}`);
  revalidatePath('/', 'layout');
  redirect(back(fd, `/groups/${gid}`));
}

export async function leaveGroup(fd: FormData) {
  const me = await requireUser();
  const gid = parseInt(str(fd, 'group_id', 10));
  await query(`DELETE FROM group_members WHERE group_id=$1 AND user_id=$2 AND role<>'owner'`, [gid, me.id]);
  revalidatePath('/', 'layout');
  redirect(back(fd, `/groups/${gid}`));
}

/* ---------- Meetups ---------- */

export async function createEvent(fd: FormData) {
  const me = await requireUser();
  const title = str(fd, 'title', 140);
  const date = str(fd, 'date', 10);
  const time = str(fd, 'time', 5) || '18:00';
  if (!title || !date) redirect('/meetups?new=1');
  const startsAt = new Date(`${date}T${time}:00+05:30`);
  const groupId = parseInt(str(fd, 'group_id', 10)) || null;
  const e = await one<{ id: number }>(
    'INSERT INTO events (title,description,city,venue,is_online,starts_at,capacity,organizer_id,group_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [title, str(fd, 'description', 3000), str(fd, 'city', 60), str(fd, 'venue', 200), fd.get('is_online') === 'on',
      startsAt.toISOString(), parseInt(str(fd, 'capacity', 6)) || 0, me.id, groupId]
  );
  await query('INSERT INTO event_rsvps (event_id,user_id) VALUES ($1,$2)', [e!.id, me.id]);
  revalidatePath('/meetups');
  redirect(`/meetups/${e!.id}`);
}

export async function toggleRsvp(fd: FormData) {
  const me = await requireUser();
  const eid = parseInt(str(fd, 'event_id', 10));
  const removed = await query('DELETE FROM event_rsvps WHERE event_id=$1 AND user_id=$2 RETURNING event_id', [eid, me.id]);
  if (!removed.length) {
    const ev = await one<{ capacity: number; going: number; organizer_id: number; title: string }>(
      'SELECT e.capacity, e.organizer_id, e.title, (SELECT count(*)::int FROM event_rsvps r WHERE r.event_id=e.id) going FROM events e WHERE e.id=$1', [eid]);
    if (ev && (!ev.capacity || ev.going < ev.capacity)) {
      await query('INSERT INTO event_rsvps (event_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [eid, me.id]);
      if (ev.organizer_id) await notify(ev.organizer_id, me.id, `is attending ${ev.title}`, `/meetups/${eid}`);
    }
  }
  revalidatePath('/', 'layout');
  redirect(back(fd, `/meetups/${eid}`));
}

/* ---------- Jobs ---------- */

export async function createJob(fd: FormData) {
  const me = await requireUser();
  const title = str(fd, 'title', 140);
  const company = str(fd, 'company', 100);
  if (!title || !company) redirect('/jobs?new=1');
  const j = await one<{ id: number }>(
    'INSERT INTO jobs (title,company,city,work_mode,job_type,experience,salary,skills,description,poster_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
    [title, company, str(fd, 'city', 60), str(fd, 'work_mode', 20) || 'Hybrid', str(fd, 'job_type', 20) || 'Full-time',
      str(fd, 'experience', 40), str(fd, 'salary', 60), splitList(str(fd, 'skills', 400)), str(fd, 'description', 5000), me.id]
  );
  await query('UPDATE users SET hiring=TRUE WHERE id=$1', [me.id]);
  revalidatePath('/jobs');
  redirect(`/jobs/${j!.id}`);
}

export async function applyJob(fd: FormData) {
  const me = await requireUser();
  const jid = parseInt(str(fd, 'job_id', 10));
  const job = await one<{ poster_id: number; title: string; active: boolean }>("SELECT poster_id,title,active FROM jobs WHERE id=$1 AND source='meshlink'", [jid]);
  if (job?.active && job.poster_id && job.poster_id !== me.id) {
    const r = await query('INSERT INTO job_applications (job_id,user_id,note) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id', [jid, me.id, str(fd, 'note', 2000)]);
    if (r.length) await notify(job.poster_id, me.id, `applied to ${job.title}`, `/jobs/${jid}`);
  }
  revalidatePath('/jobs', 'layout');
  redirect(`/jobs/${jid}`);
}

export async function setApplicationStatus(fd: FormData) {
  const me = await requireUser();
  const appId = parseInt(str(fd, 'application_id', 10));
  const status = str(fd, 'status', 20);
  if (!['Applied', 'Shortlisted', 'Interviewing', 'Offered', 'Rejected'].includes(status)) redirect('/jobs');
  const a = await one<{ job_id: number; user_id: number; title: string }>(
    'SELECT a.job_id,a.user_id,j.title FROM job_applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1 AND j.poster_id=$2', [appId, me.id]);
  if (a) {
    await query('UPDATE job_applications SET status=$2 WHERE id=$1', [appId, status]);
    await notify(a.user_id, me.id, `updated your application for ${a.title} to "${status}"`, `/jobs/${a.job_id}`);
  }
  revalidatePath('/jobs', 'layout');
  redirect(a ? `/jobs/${a.job_id}` : '/jobs');
}

export async function toggleJobActive(fd: FormData) {
  const me = await requireUser();
  const jid = parseInt(str(fd, 'job_id', 10));
  await query('UPDATE jobs SET active=NOT active WHERE id=$1 AND poster_id=$2', [jid, me.id]);
  revalidatePath('/jobs', 'layout');
  redirect(`/jobs/${jid}`);
}

/* ---------- Notifications ---------- */

export async function markAllRead() {
  const me = await requireUser();
  await query('UPDATE notifications SET read=TRUE WHERE user_id=$1', [me.id]);
  revalidatePath('/', 'layout');
  redirect('/notifications');
}
