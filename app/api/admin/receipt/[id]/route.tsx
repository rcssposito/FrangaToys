import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const url = new URL(`/api/admin/kanban/os/${id}`, req.url);
    return NextResponse.redirect(url);
}
