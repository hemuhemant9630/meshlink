'use client';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const noDb = /DATABASE_URL/.test(error.message);
  return (
    <main className="page"><div className="card empty">
      <h1>{noDb ? 'Database not connected' : 'Something went wrong'}</h1>
      <p style={{ margin: '1rem 0' }}>{noDb ? 'Add a Neon database to this Vercel project (Storage → Neon) and redeploy.' : 'Please try again.'}</p>
      <button className="btn btn-brand" onClick={reset}>Try again</button>
    </div></main>
  );
}
