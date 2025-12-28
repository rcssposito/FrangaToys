
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'franga-toys-secret-key-change-me';
const key = new TextEncoder().encode(SECRET_KEY);

export async function signSession(payload: any) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 24 * 60 * 60; // 24 hours

    return await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(iat)
        .setExpirationTime(exp)
        .sign(key);
}

export async function verifySession(token: string) {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}
