
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies(); // next/headers async call
        const token = cookieStore.get('admin_session')?.value;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const payload = await verifySession(token);

        if (!payload) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        return NextResponse.json({ user: payload });

    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}
