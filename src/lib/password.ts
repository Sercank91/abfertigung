import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hasht ein Klartext-Passwort
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Vergleicht ein Klartext-Passwort mit einem Hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}