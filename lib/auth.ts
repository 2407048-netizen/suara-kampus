import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET_KEY || 'suara_kampus_itgarut_2026';
const encodedKey = new TextEncoder().encode(secretKey);

export interface SessionPayload {
  user_id: number;
  nama: string;
  email: string;
  nim?: string;
  role: string;
  [key: string]: unknown;
}

export async function signJWT(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(encodedKey);
}

export async function verifyJWT(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}
