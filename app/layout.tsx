import './globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'MeshLink — the network for MuleSoft & Salesforce professionals',
  description: 'Post, connect, message, join groups, find meetups and jobs — filtered by your city.',
  icons: { icon: '/icon.svg' },
};
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <footer className="footer">MeshLink · A community space for MuleSoft &amp; Salesforce professionals · Not affiliated with Salesforce, Inc.</footer>
      </body>
    </html>
  );
}
