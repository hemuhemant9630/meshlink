'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { login, signup } from '@/app/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="stack-sm">
      {state?.error && <div className="alert alert-error">{state.error}</div>}
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" required autoComplete="email" /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" className="input" required autoComplete="current-password" /></div>
      <button className="btn btn-brand btn-block" disabled={pending} style={{ height: 38 }}>{pending ? 'Signing in…' : 'Log in'}</button>
      <p className="muted" style={{ textAlign: 'center' }}>New here? <Link href="/signup">Create an account</Link></p>
    </form>
  );
}

export function SignupForm({ cities }: { cities: string[] }) {
  const [state, action, pending] = useActionState(signup, undefined);
  return (
    <form action={action} className="stack-sm">
      {state?.error && <div className="alert alert-error">{state.error}</div>}
      <div className="field"><label htmlFor="name"><span className="req">*</span>Full name</label><input id="name" name="name" className="input" required maxLength={80} /></div>
      <div className="field"><label htmlFor="email"><span className="req">*</span>Email</label><input id="email" name="email" type="email" className="input" required /></div>
      <div className="field"><label htmlFor="password"><span className="req">*</span>Password (6+ characters)</label><input id="password" name="password" type="password" className="input" required minLength={6} /></div>
      <div className="field"><label htmlFor="role">Role</label>
        <input id="role" name="role" className="input" list="roles" placeholder="e.g. MuleSoft Developer" />
        <datalist id="roles">{['MuleSoft Developer', 'MuleSoft Architect', 'Integration Architect', 'Salesforce Developer', 'Salesforce Admin', 'Salesforce Architect', 'Salesforce Consultant', 'Recruiter', 'Student'].map((r) => <option key={r} value={r} />)}</datalist>
      </div>
      <div className="field"><label htmlFor="city">City</label>
        <input id="city" name="city" className="input" list="cities" placeholder="e.g. Hyderabad" />
        <datalist id="cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <button className="btn btn-brand btn-block" disabled={pending} style={{ height: 38 }}>{pending ? 'Creating account…' : 'Agree & join'}</button>
      <p className="muted" style={{ textAlign: 'center' }}>Already on MeshLink? <Link href="/login">Sign in</Link></p>
    </form>
  );
}
