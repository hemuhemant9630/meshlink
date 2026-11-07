import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from '@/components/AuthForms';
import Logo from '@/components/Logo';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/feed');
  return (
    <main className="auth-wrap">
      <div className="card auth-card">
        <div style={{ textAlign: 'center' }}><Logo size={48} /></div>
        <h1>Sign in to MeshLink</h1>
        <div className="alert alert-info">Demo account: demo@meshlink.dev / demo1234</div>
        <LoginForm />
      </div>
    </main>
  );
}
