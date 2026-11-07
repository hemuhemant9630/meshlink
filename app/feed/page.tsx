import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getCityFilter, TOPICS } from '@/lib/util';
import { getPosts } from '@/lib/queries';
import Composer from '@/components/Composer';
import PostCard from '@/components/PostCard';
import { ProfileMini, UpcomingMeetups, LatestJobs, PeopleYouMayKnow } from '@/components/Widgets';

export default async function Feed({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const city = await getCityFilter();
  const network = sp.scope === 'network';
  const topic = TOPICS.includes(sp.topic) ? sp.topic : '';
  const posts = await getPosts({ viewerId: me.id, city, topic, network });
  const qs = (o: Record<string, string>) => '/feed?' + new URLSearchParams(Object.entries({ scope: sp.scope || '', topic, ...o }).filter(([, v]) => v)).toString();
  const here = qs({});
  return (
    <main className="page layout-3">
      <aside className="left stack sticky"><ProfileMini me={me} /></aside>
      <section className="stack">
        <Composer me={me} redirect={here} />
        <div className="card">
          <div className="tabs">
            <Link href={qs({ scope: '' })} className={!network ? 'active' : ''}>{city ? `Everyone in ${city}` : 'Everyone'}</Link>
            <Link href={qs({ scope: 'network' })} className={network ? 'active' : ''}>My network</Link>
          </div>
          <div className="filters">
            <span className="muted">Topic:</span>
            <Link href={qs({ topic: '' })} className={'badge' + (!topic ? ' badge-brand' : '')}>All</Link>
            {TOPICS.map((t) => <Link key={t} href={qs({ topic: t })} className={'badge' + (topic === t ? ' badge-brand' : '')}>{t}</Link>)}
          </div>
        </div>
        {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} meId={me.id} redirect={here} />) : (
          <div className="card empty">No posts yet{city ? ` from people in ${city}` : ''}{topic ? ` about ${topic}` : ''}. Be the first to share something!</div>
        )}
      </section>
      <aside className="right stack">
        <UpcomingMeetups city={city} />
        <LatestJobs city={city} />
        <PeopleYouMayKnow me={me} city={city} />
      </aside>
    </main>
  );
}
