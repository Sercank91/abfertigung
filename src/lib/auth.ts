import { jwtVerify, SignJWT } from 'jose';

export function getJwtSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret'
  );
}

export interface TokenPayload {
  userId: string;
  username: string;
  tenantId: string;
  tenantName: string;
  tenantSlug?: string;
  role: string;
  firstName: string;
  lastName: string;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Create JWT token
 */
export async function createToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecret());

  return token;
}