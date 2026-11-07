import Link from 'next/link';
export default function NotFound() {
  return <main className="page"><div className="card empty"><h1>Page not found</h1><p style={{ margin: '1rem 0' }}>That record doesn&apos;t exist or was removed.</p><Link href="/feed" className="btn btn-brand">Back to home</Link></div></main>;
}
