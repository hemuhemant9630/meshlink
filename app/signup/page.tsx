import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { SignupForm } from '@/components/AuthForms';
import Logo from '@/components/Logo';
import { CITIES } from '@/lib/util';

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/feed');
  return (
    <main className="auth-wrap">
      <div className="card auth-card">
        <div style={{ textAlign: 'center' }}><Logo size={48} /></div>
        <h1>Join the MuleSoft &amp; Salesforce community</h1>
        <SignupForm cities={CITIES} />
      </div>
    </main>
  );
}
