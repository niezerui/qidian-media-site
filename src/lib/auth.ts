import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'media-site-secret-key-change-in-production-2024';
const TOKEN_NAME = 'admin_token';

export interface JwtPayload {
  userId: number;
  username: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<JwtPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<JwtPayload> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export function setAuthCookie(token: string): string {
  return `${TOKEN_NAME}=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`;
}

export function clearAuthCookie(): string {
  return `${TOKEN_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const bcrypt = require('bcryptjs');
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password: string): string {
  const bcrypt = require('bcryptjs');
  return bcrypt.hashSync(password, 10);
}
