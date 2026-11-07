import Link from 'next/link';
import { sendConnection, respondConnection } from '@/app/actions';

export default function ConnectButton({ userId, state, connId, redirect, block }: { userId: number; state: string; connId?: number; redirect: string; block?: boolean }) {
  const cls = block ? ' btn-block' : '';
  if (state === 'connected') return <Link href={`/messages?with=${userId}`} className={'btn' + cls}>Message</Link>;
  if (state === 'sent') return <button className={'btn' + cls} disabled>Pending</button>;
  if (state === 'received') return (
    <form action={respondConnection}>
      <input type="hidden" name="connection_id" value={connId} /><input type="hidden" name="decision" value="accept" /><input type="hidden" name="redirect" value={redirect} />
      <button className={'btn btn-success' + cls}>Accept</button>
    </form>
  );
  return (
    <form action={sendConnection}>
      <input type="hidden" name="user_id" value={userId} /><input type="hidden" name="redirect" value={redirect} />
      <button className={'btn btn-brand' + cls}>Connect</button>
    </form>
  );
}
