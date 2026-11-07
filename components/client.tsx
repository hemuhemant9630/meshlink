'use client';
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, className = 'btn btn-brand', pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending}>{pending ? pendingText || 'Saving…' : children}</button>;
}

export function AutoSubmitSelect({ name, defaultValue, children, className = 'select' }: { name: string; defaultValue: string; children: React.ReactNode; className?: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className={className} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {children}
    </select>
  );
}

export function AutoRefresh({ ms = 5000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, ms);
    return () => clearInterval(t);
  }, [ms, router]);
  return null;
}

export function ScrollToBottom({ dep }: { dep: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: 'end' }); }, [dep]);
  return <div ref={ref} />;
}

export function CityFilter({ city, cities, action }: { city: string; cities: string[]; action: (fd: FormData) => void | Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form action={action} className="city-filter" title="Filter everything by city">
      <input type="hidden" name="redirect" ref={ref} />
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" /></svg>
      <select key={city} name="city" defaultValue={city} aria-label="City filter" onChange={(e) => {
        if (ref.current) ref.current.value = window.location.pathname + window.location.search;
        e.currentTarget.form?.requestSubmit();
      }}>
        <option value="">All cities</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </form>
  );
}

export function NavTabs({ tabs }: { tabs: { href: string; label: string; badge?: number }[] }) {
  const path = usePathname();
  return (
    <nav className="app-tabs">
      {tabs.map((t) => {
        const active = path === t.href || path.startsWith(t.href + '/');
        return (
          <Link key={t.href} href={t.href} className={'app-tab' + (active ? ' active' : '')}>
            {t.label}{t.badge ? <span className="tab-badge">{t.badge > 99 ? '99+' : t.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
