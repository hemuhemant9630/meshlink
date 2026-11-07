import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getCityFilter } from '@/lib/util';
import { getPosts } from '@/lib/queries';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import PostCard from '@/components/PostCard';

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser();
  const q = ((await searchParams).q || '').trim().slice(0, 80);
  const city = await getCityFilter();
  const like = `%${q}%`;
  const [people, groups, jobs, posts] = q ? await Promise.all([
    query<any>(`SELECT id,name,headline,city FROM users WHERE (name ILIKE $1 OR headline ILIKE $1 OR company ILIKE $1 OR array_to_string(skills,',') ILIKE $1) AND ($2='' OR lower(city)=lower($2)) LIMIT 10`, [like, city]),
    query<any>(`SELECT id,name,city FROM groups WHERE (name ILIKE $1 OR description ILIKE $1) LIMIT 8`, [like]),
    query<any>(`SELECT id,title,company,city FROM jobs WHERE active AND (title ILIKE $1 OR company ILIKE $1 OR array_to_string(skills,',') ILIKE $1) AND ($2='' OR lower(city)=lower($2) OR work_mode='Remote') LIMIT 8`, [like, city]),
    getPosts({ viewerId: me.id, q, city, limit: 10 }),
  ]) : [[], [], [], []];
  return (
    <main className="page">
      <div className="page-header">
        <span className="icon-tile tile-navy"><Icon name="search" /></span>
        <div><div className="eyebrow">Search{city ? ` · ${city}` : ''}</div><h1>{q ? `Results for “${q}”` : 'Search MeshLink'}</h1></div>
        <form action="/search" className="actions"><input name="q" defaultValue={q} className="input" placeholder="Search…" style={{ width: 260 }} /><button className="btn btn-brand">Search</button></form>
      </div>
      <div className="layout-2">
        <section className="stack">
          <div className="card">
            <div className="card-header"><h2>People ({people.length})</h2></div>
            {people.length ? <ul className="list">{people.map((u) => <li key={u.id}><Avatar name={u.name} id={u.id} size={36} /><div className="grow"><Link href={`/profile/${u.id}`} className="strong-link">{u.name}</Link><small>{u.headline} · {u.city}</small></div></li>)}</ul> : <div className="empty">No people found.</div>}
          </div>
          <h2>Posts ({posts.length})</h2>
          {posts.map((p) => <PostCard key={p.id} post={p} meId={me.id} redirect={`/search?q=${encodeURIComponent(q)}`} />)}
        </section>
        <aside className="stack">
          <div className="card"><div className="card-header"><h2>Jobs ({jobs.length})</h2></div>
            {jobs.length ? <ul className="list">{jobs.map((j) => <li key={j.id}><div className="grow"><Link href={`/jobs/${j.id}`} className="strong-link">{j.title}</Link><small>{j.company} · {j.city}</small></div></li>)}</ul> : <div className="empty">No jobs found.</div>}</div>
          <div className="card"><div className="card-header"><h2>Groups ({groups.length})</h2></div>
            {groups.length ? <ul className="list">{groups.map((g) => <li key={g.id}><Link href={`/groups/${g.id}`}>{g.name}</Link></li>)}</ul> : <div className="empty">No groups found.</div>}</div>
        </aside>
      </div>
    </main>
  );
}
