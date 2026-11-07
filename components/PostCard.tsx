import Link from 'next/link';
import Avatar from './Avatar';
import Icon from './Icon';
import { Post } from '@/lib/queries';
import { timeAgo } from '@/lib/util';
import { addComment, deletePost, toggleLike } from '@/app/actions';

export default function PostCard({ post, meId, redirect }: { post: Post; meId: number; redirect: string }) {
  return (
    <article className="card post" id={`post-${post.id}`}>
      <div className="post-head">
        <Link href={`/profile/${post.author_id}`}><Avatar name={post.name} id={post.author_id} size={44} /></Link>
        <div className="post-meta">
          <Link href={`/profile/${post.author_id}`} className="strong-link">{post.name}</Link>
          <small>{post.headline}</small>
          <small className="muted">
            {timeAgo(post.created_at)}{post.author_city ? ` · ${post.author_city}` : ''}
            {post.group_id ? <> · in <Link href={`/groups/${post.group_id}`}>{post.group_name}</Link></> : null}
          </small>
        </div>
        <span className={`badge topic-${post.topic.toLowerCase()}`}>{post.topic}</span>
        {post.author_id === meId && (
          <form action={deletePost}>
            <input type="hidden" name="post_id" value={post.id} /><input type="hidden" name="redirect" value={redirect} />
            <button className="icon-btn small" title="Delete post"><Icon name="trash" size={14} /></button>
          </form>
        )}
      </div>
      <p className="post-body">{post.content}</p>
      <div className="post-stats muted">
        {post.likes ? <span>👍 {post.likes}</span> : <span />}
        {post.comment_count ? <span>{post.comment_count} comment{post.comment_count > 1 ? 's' : ''}</span> : null}
      </div>
      <div className="post-actions">
        <form action={toggleLike}>
          <input type="hidden" name="post_id" value={post.id} /><input type="hidden" name="redirect" value={`${redirect}#post-${post.id}`} />
          <button className={'action' + (post.liked ? ' on' : '')}><Icon name="like" size={16} /> {post.liked ? 'Liked' : 'Like'}</button>
        </form>
        <label htmlFor={`c-${post.id}`} className="action"><Icon name="comment" size={16} /> Comment</label>
      </div>
      <div className="comments">
        {post.comments?.map((c) => (
          <div key={c.id} className="comment">
            <Avatar name={c.name} id={c.author_id} size={28} />
            <div className="bubble"><Link href={`/profile/${c.author_id}`} className="strong-link">{c.name}</Link> <small className="muted">{timeAgo(c.created_at)}</small><p>{c.content}</p></div>
          </div>
        ))}
        <form action={addComment} className="comment-form">
          <input type="hidden" name="post_id" value={post.id} /><input type="hidden" name="redirect" value={`${redirect}#post-${post.id}`} />
          <input id={`c-${post.id}`} name="content" className="input" placeholder="Add a comment…" required maxLength={1000} />
          <button className="btn btn-neutral">Post</button>
        </form>
      </div>
    </article>
  );
}
