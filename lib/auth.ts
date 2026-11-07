import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { one } from './db';

const COOKIE = 'ml_session';

function secret() {
  const s = process.env.AUTH_SECRET ||
    createHash('sha256').update('meshlink:' + (process.env.DATABASE_URL || process.env.POSTGRES_URL || 'dev')).digest('hex');
  return new TextEncoder().encode(s);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !!process.env.VERCEL,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUserId(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return Number(payload.uid) || null;
  } catch {
    return null;
  }
}

export type User = {
  id: number; email: string; name: string; headline: string; city: string; company: string; role: string;
  skills: string[]; certifications: string; bio: string; years_exp: number; open_to_work: boolean; hiring: boolean; created_at: string;
};

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const id = await getUserId();
  if (!id) return null;
  return one<User>(
    'SELECT id,email,name,headline,city,company,role,skills,certifications,bio,years_exp,open_to_work,hiring,created_at FROM users WHERE id=$1',
    [id]
  );
});

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u;
}
