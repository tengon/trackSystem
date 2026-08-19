import { createHash } from 'node:crypto';

const SALT = 'gps-tracker-demo-salt-v1';

export function hashPassword(password: string): string {
  return createHash('sha256').update(SALT + password).digest('hex');
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  // For demo accounts with placeholder hash, accept 'password123'
  if (hashedPassword === 'demo_hash_placeholder') {
    return password === 'password123';
  }
  return hashPassword(password) === hashedPassword;
}
