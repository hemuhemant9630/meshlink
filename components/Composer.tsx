import Avatar from './Avatar';
import { SubmitButton } from './client';
import { createPost } from '@/app/actions';
import { TOPICS } from '@/lib/util';
import type { User } from '@/lib/auth';

export default function Composer({ me, redirect, groupId, placeholder }: { me: User; redirect: string; groupId?: number; placeholder?: string }) {
  return (
    <form action={createPost} className="card composer">
      <input type="hidden" name="redirect" value={redirect} />
      {groupId ? <input type="hidden" name="group_id" value={groupId} /> : null}
      <div className="composer-row">
        <Avatar name={me.name} id={me.id} size={44} />
        <textarea name="content" className="input" rows={3} required maxLength={3000}
          placeholder={placeholder || 'Share an integration tip, a win, a question…'} />
      </div>
      <div className="composer-foot">
        <select name="topic" className="select" defaultValue="General" aria-label="Topic">
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <SubmitButton pendingText="Posting…">Post</SubmitButton>
      </div>
    </form>
  );
}
