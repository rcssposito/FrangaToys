
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');

    // Redirect to login page
    return NextResponse.redirect(new URL('/admin/login', req.url));
}
